import { getLocalDatabase } from '../database/sqlite';
import { SyncMutation, SyncState } from '@aescion/shared-types';

export async function queueOfflineMutation(mutation: SyncMutation): Promise<void> {
  const db = await getLocalDatabase();
  await db.runAsync(
    `INSERT INTO sync_queue (id, clientTransactionId, operationType, entityType, payload, branchId, organizationId, userId, status, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      mutation.id,
      mutation.id,
      mutation.operation,
      mutation.entityType,
      JSON.stringify(mutation.payload),
      mutation.branchId,
      mutation.organizationId,
      'USER_ID',
      'PENDING',
      new Date().toISOString()
    ]
  );
}

export async function getPendingMutations(): Promise<SyncMutation[]> {
  const db = await getLocalDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM sync_queue WHERE status = ? ORDER BY createdAt ASC`,
    ['PENDING']
  );
  return (rows || []).map((r: any) => ({
    id: r.clientTransactionId,
    organizationId: r.organizationId,
    branchId: r.branchId,
    entityType: r.entityType,
    operation: r.operationType,
    payload: JSON.parse(r.payload),
    syncState: SyncState.PENDING,
    clientTimestamp: new Date(r.createdAt).getTime()
  }));
}

export async function markMutationsApplied(appliedIds: string[]): Promise<void> {
  const db = await getLocalDatabase();
  for (const id of appliedIds) {
    await db.runAsync(`UPDATE sync_queue SET status = ? WHERE clientTransactionId = ?`, ['SYNCED', id]);
  }
}
