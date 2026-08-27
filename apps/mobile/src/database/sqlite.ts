export interface LocalDbAdapter {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, params?: any[]) => Promise<{ changes: number }>;
  getAllAsync: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  getFirstAsync: <T = any>(sql: string, params?: any[]) => Promise<T | null>;
}

let dbInstance: LocalDbAdapter | null = null;

// In-memory fallback for web/testing
const inMemoryTables: {
  local_products: any[];
  local_customers: any[];
  sync_queue: any[];
  sync_metadata: any[];
  local_shifts: any[];
} = {
  local_products: [],
  local_customers: [],
  sync_queue: [],
  sync_metadata: [],
  local_shifts: []
};

export async function getLocalDatabase(): Promise<LocalDbAdapter> {
  if (dbInstance) return dbInstance;

  try {
    const SQLite = await import('expo-sqlite').catch(() => null);
    if (!SQLite || typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      dbInstance = createMemoryDatabaseAdapter();
      return dbInstance;
    }

    const db = await (SQLite as any).openDatabaseAsync('aescion_commerce_v2.db');
    await initDatabaseTables(db);
    dbInstance = db as unknown as LocalDbAdapter;
    return dbInstance;
  } catch (err) {
    dbInstance = createMemoryDatabaseAdapter();
    return dbInstance;
  }
}

async function initDatabaseTables(db: any) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS local_products (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      branchId TEXT NOT NULL,
      name TEXT NOT NULL,
      sku TEXT,
      barcode TEXT,
      category TEXT,
      sellingPrice REAL NOT NULL,
      mrp REAL,
      taxRate REAL NOT NULL,
      hsn TEXT,
      currentStock REAL NOT NULL,
      batchNumber TEXT,
      expiryDate TEXT,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      clientTransactionId TEXT UNIQUE NOT NULL,
      operationType TEXT NOT NULL,
      entityType TEXT NOT NULL,
      payload TEXT NOT NULL,
      branchId TEXT NOT NULL,
      organizationId TEXT NOT NULL,
      userId TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      attempts INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      syncedAt TEXT,
      serverAssignedId TEXT,
      serverAssignedNumber TEXT,
      errorMessage TEXT
    );
  `);
}

function createMemoryDatabaseAdapter(): LocalDbAdapter {
  return {
    execAsync: async (sql: string) => {
      // Mock DDL
    },
    runAsync: async (sql: string, params: any[] = []) => {
      const lower = sql.toLowerCase().replace(/\s+/g, ' ').trim();

      // INSERT / REPLACE INTO local_products
      if (lower.includes('into local_products')) {
        const [id, orgId, branchId, name, sku, barcode, sellingPrice, mrp, taxRate, hsn, category, currentStock, batchNumber, expiryDate, updatedAt] = params;
        const existingIdx = inMemoryTables.local_products.findIndex((p) => p.id === id);
        const record = {
          id,
          organizationId: orgId,
          branchId,
          name,
          sku,
          barcode,
          sellingPrice,
          mrp,
          taxRate,
          hsn,
          category,
          currentStock,
          batchNumber,
          expiryDate,
          updatedAt
        };
        if (existingIdx >= 0) inMemoryTables.local_products[existingIdx] = record;
        else inMemoryTables.local_products.push(record);
        return { changes: 1 };
      }

      // UPDATE local_products SET currentStock = currentStock - ? WHERE id = ?
      if (lower.startsWith('update local_products set currentstock = currentstock -')) {
        const [qty, id] = params;
        const prod = inMemoryTables.local_products.find((p) => p.id === id);
        if (prod) {
          prod.currentStock = Number(prod.currentStock) - Number(qty);
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      // INSERT INTO sync_queue
      if (lower.includes('into sync_queue')) {
        const [id, clientTransactionId, operationType, entityType, payload, branchId, organizationId, userId, status, createdAt] = params;
        inMemoryTables.sync_queue.push({
          id,
          clientTransactionId,
          operationType,
          entityType,
          payload,
          branchId,
          organizationId,
          userId,
          status,
          createdAt,
          syncedAt: null,
          serverAssignedId: null,
          serverAssignedNumber: null
        });
        return { changes: 1 };
      }

      // UPDATE sync_queue SET status = ?, serverAssignedId = ?, serverAssignedNumber = ?, syncedAt = ? WHERE clientTransactionId = ?
      if (lower.startsWith('update sync_queue set status = ?, serverassignedid =')) {
        const [status, serverAssignedId, serverAssignedNumber, syncedAt, clientTransactionId] = params;
        const item = inMemoryTables.sync_queue.find((q) => q.clientTransactionId === clientTransactionId);
        if (item) {
          item.status = status;
          item.serverAssignedId = serverAssignedId;
          item.serverAssignedNumber = serverAssignedNumber;
          item.syncedAt = syncedAt;
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      // Generic UPDATE sync_queue
      if (lower.startsWith('update sync_queue set')) {
        const item = inMemoryTables.sync_queue.find((q) => q.clientTransactionId === params[params.length - 1]);
        if (item) {
          item.status = params[0];
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      return { changes: 0 };
    },
    getAllAsync: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
      const lower = sql.toLowerCase().replace(/\s+/g, ' ').trim();

      if (lower.includes('from local_products')) {
        return [...inMemoryTables.local_products] as unknown as T[];
      }

      if (lower.includes('from sync_queue where status =')) {
        const status = params[0] || 'PENDING';
        return inMemoryTables.sync_queue.filter((q) => q.status === status) as unknown as T[];
      }

      if (lower.includes('count(*) as count from sync_queue group by status')) {
        const counts: Record<string, number> = {};
        inMemoryTables.sync_queue.forEach((q) => {
          counts[q.status] = (counts[q.status] || 0) + 1;
        });
        return Object.entries(counts).map(([status, count]) => ({ status, count })) as unknown as T[];
      }

      if (lower.includes('from sync_queue')) {
        return [...inMemoryTables.sync_queue] as unknown as T[];
      }

      return [];
    },
    getFirstAsync: async <T = any>(sql: string, params: any[] = []): Promise<T | null> => {
      const lower = sql.toLowerCase().replace(/\s+/g, ' ').trim();

      if (lower.includes('from local_products where id =')) {
        const id = params[0];
        const res = inMemoryTables.local_products.find((p) => p.id === id);
        return (res as unknown as T) || null;
      }

      return null;
    }
  };
}
