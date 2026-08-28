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

  await refreshQueueCounts();
  return clientTransactionId;
}

export async function refreshQueueCounts() {
  try {
    const db = await getLocalDatabase();
    const rows = await db.getAllAsync<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status`
    );

    let pendingCount = 0;
    let conflictCount = 0;
    let failedCount = 0;

    for (const r of rows) {
      if (r.status === 'PENDING') pendingCount = r.count;
      else if (r.status === 'CONFLICT') conflictCount = r.count;
      else if (r.status === 'FAILED') failedCount = r.count;
    }

    updateStatus({ pendingCount, conflictCount, failedCount });
  } catch (err) {
    console.warn('Failed to query sync queue counts:', err);
  }
}

export async function syncInitialCatalog(organizationId: string, branchId: string) {
  try {
    const db = await getLocalDatabase();
    const products = await MobileApiClient.get<any[]>('/products');
    if (!products || !Array.isArray(products)) return;

    const now = new Date().toISOString();
    for (const p of products) {
      const params = [
        p.id,
        organizationId,
        branchId,
        p.name || 'Unnamed Item',
        p.sku || null,
        p.barcode || null,
        Number(p.sellingPrice) || 0,
        p.mrp ? Number(p.mrp) : null,
        Number(p.taxRate) || 0,
        p.hsn || null,
        p.category || null,
        Number(p.currentStock) || 0,
        p.batchNumber || null,
        p.expiryDate ? new Date(p.expiryDate).toISOString() : null,
        now,
        p.updatedAt ? new Date(p.updatedAt).toISOString() : now
      ];

      await db.runAsync(
        `INSERT OR REPLACE INTO local_products (id, organizationId, branchId, name, sku, barcode, sellingPrice, mrp, taxRate, hsn, category, currentStock, batchNumber, expiryDate, lastSyncedAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params
      );

      await db.runAsync(
        `INSERT OR REPLACE INTO products (id, organizationId, branchId, name, sku, barcode, sellingPrice, mrp, taxRate, hsn, category, currentStock, batchNumber, expiryDate, lastSyncedAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params
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

export const triggerImmediateSync = processSyncQueue;
