import { getLocalDatabase } from '../database/sqlite';
import { MobileApiClient } from '../api/mobileApiClient';
import { SyncBatchRequest, SyncBatchResponse, SyncMutation, SyncState } from '@aescion/shared-types';

export interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  conflictCount: number;
  failedCount: number;
  lastSyncedAt: Date | null;
}

type SyncListener = (status: OfflineSyncStatus) => void;
const listeners: Set<SyncListener> = new Set();

let currentStatus: OfflineSyncStatus = {
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  conflictCount: 0,
  failedCount: 0,
  lastSyncedAt: null
};

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => listeners.delete(listener);
}

function updateStatus(updates: Partial<OfflineSyncStatus>) {
  currentStatus = { ...currentStatus, ...updates };
  listeners.forEach((l) => l(currentStatus));
}

// Generate deterministic unique client transaction ID
export function generateClientTransactionId(prefix: string = 'OFFLINE'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function enqueueOfflineMutation(mutation: {
  entityType: 'INVOICE' | 'PAYMENT' | 'CUSTOMER' | 'STOCK_LEDGER' | 'RESTAURANT_ORDER' | 'SERVICE_JOB';
  operationType: 'CREATE' | 'UPDATE';
  payload: any;
  organizationId: string;
  branchId: string;
  userId: string;
}): Promise<string> {
  const db = await getLocalDatabase();
  const clientTransactionId = generateClientTransactionId(mutation.entityType);
  const id = clientTransactionId;
  const createdAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO sync_queue (id, clientTransactionId, operationType, entityType, payload, branchId, organizationId, userId, status, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      clientTransactionId,
      mutation.operationType,
      mutation.entityType,
      JSON.stringify(mutation.payload),
      mutation.branchId,
      mutation.organizationId,
      mutation.userId,
      'PENDING',
      createdAt
    ]
  );

  // If local invoice creation, optimistically reduce local stock in SQLite
  if (mutation.entityType === 'INVOICE' && mutation.payload.items) {
    for (const item of mutation.payload.items) {
      if (item.productId) {
        await db.runAsync(
          `UPDATE local_products SET currentStock = currentStock - ? WHERE id = ?`,
          [item.quantity || 1, item.productId]
        );
      }
    }
  }

  await refreshQueueCounts();
  return clientTransactionId;
}

export async function refreshQueueCounts(): Promise<void> {
  try {
    const db = await getLocalDatabase();
    const rows = await db.getAllAsync<any>(`SELECT status, count(*) as count FROM sync_queue GROUP BY status`);
    let pending = 0;
    let conflict = 0;
    let failed = 0;

    (rows || []).forEach((r: any) => {
      if (r.status === 'PENDING') pending = Number(r.count);
      if (r.status === 'CONFLICT') conflict = Number(r.count);
      if (r.status === 'FAILED') failed = Number(r.count);
    });

    updateStatus({ pendingCount: pending, conflictCount: conflict, failedCount: failed });
  } catch (err) {
    console.warn('Failed to refresh queue counts:', err);
  }
}

export async function syncInitialCatalog(organizationId: string, branchId: string): Promise<void> {
  try {
    const db = await getLocalDatabase();
    const products = await MobileApiClient.get<any[]>('/products');
    const now = new Date().toISOString();

    for (const p of products || []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO local_products 
         (id, organizationId, branchId, name, sku, barcode, sellingPrice, mrp, taxRate, hsn, category, currentStock, batchNumber, expiryDate, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id,
          organizationId,
          branchId,
          p.name,
          p.sku || null,
          p.barcode || null,
          Number(p.sellingPrice) || 0,
          Number(p.mrp) || null,
          Number(p.taxRate) || 0,
          p.hsn || null,
          p.category || null,
          Number(p.currentStock) || 0,
          p.batchNumber || null,
          p.expiryDate ? new Date(p.expiryDate).toISOString() : null,
          now
        ]
      );
    }
  } catch (err) {
    console.warn('Could not sync initial catalog to SQLite:', err);
  }
}

export async function processSyncQueue(): Promise<{ synced: number; failed: number; conflicts: number }> {
  const db = await getLocalDatabase();
  const pendingRows = await db.getAllAsync<any>(
    `SELECT * FROM sync_queue WHERE status = ? ORDER BY createdAt ASC LIMIT 50`,
    ['PENDING']
  );

  if (!pendingRows || pendingRows.length === 0) {
    return { synced: 0, failed: 0, conflicts: 0 };
  }

  updateStatus({ isSyncing: true });

  const firstRow = pendingRows[0];
  const batchDto: SyncBatchRequest = {
    organizationId: firstRow.organizationId,
    branchId: firstRow.branchId,
    lastSyncedTimestamp: Date.now(),
    mutations: pendingRows.map(
      (row: any): SyncMutation => ({
        id: row.clientTransactionId,
        organizationId: row.organizationId,
        branchId: row.branchId,
        entityType: row.entityType as any,
        operation: row.operationType as any,
        clientTimestamp: new Date(row.createdAt).getTime(),
        syncState: SyncState.PENDING,
        payload: JSON.parse(row.payload)
      })
    )
  };

  let synced = 0;
  let failed = 0;
  let conflicts = 0;

  try {
    const response = await MobileApiClient.post<SyncBatchResponse>('/sync/batch', batchDto);
    for (const result of response.processedMutations || []) {
      if (result.status === 'SYNCED') {
        await db.runAsync(
          `UPDATE sync_queue SET status = ?, serverAssignedId = ?, serverAssignedNumber = ?, syncedAt = ? WHERE clientTransactionId = ?`,
          ['SYNCED', result.serverAssignedId || null, result.serverAssignedNumber || null, new Date().toISOString(), result.clientTransactionId]
        );
        synced++;
      } else if (result.status === 'CONFLICT') {
        await db.runAsync(
          `UPDATE sync_queue SET status = ?, lastError = ? WHERE clientTransactionId = ?`,
          ['CONFLICT', result.error || 'Server conflict detected', result.clientTransactionId]
        );
        conflicts++;
      } else {
        await db.runAsync(
          `UPDATE sync_queue SET status = ?, retryCount = retryCount + 1, lastError = ? WHERE clientTransactionId = ?`,
          ['FAILED', result.error || 'Unknown sync error', result.clientTransactionId]
        );
        failed++;
      }
    }

    updateStatus({ lastSyncedAt: new Date(), isOnline: true });
  } catch (err: any) {
    console.error('Sync batch failed details:', err);
    updateStatus({ isOnline: false });
  } finally {
    updateStatus({ isSyncing: false });
    await refreshQueueCounts();
  }

  return { synced, failed, conflicts };
}
