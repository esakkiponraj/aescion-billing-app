import { Platform } from 'react-native';

export interface LocalDbAdapter {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, params?: any[]) => Promise<{ changes: number }>;
  getAllAsync: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  getFirstAsync: <T = any>(sql: string, params?: any[]) => Promise<T | null>;
}

let dbInstance: LocalDbAdapter | null = null;
let initPromise: Promise<LocalDbAdapter> | null = null;

// In-memory fallback for web/testing
const inMemoryTables: {
  local_products: any[];
  products: any[];
  local_customers: any[];
  sync_queue: any[];
  sync_metadata: any[];
  local_shifts: any[];
} = {
  local_products: [],
  products: [],
  local_customers: [],
  sync_queue: [],
  sync_metadata: [],
  local_shifts: []
};

function sanitizeParams(params?: any[]): any[] {
  if (!params || !Array.isArray(params)) return [];
  return params.map((val) => (val === undefined ? null : val));
}

export async function getLocalDatabase(): Promise<LocalDbAdapter> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // In web browser preview or test environments, use safe in-memory store without attempting native WASM sqlite
      if (Platform.OS === 'web' || (typeof process !== 'undefined' && process.env.NODE_ENV === 'test')) {
        dbInstance = createMemoryDatabaseAdapter();
        return dbInstance;
      }

      const SQLite = await import('expo-sqlite').catch(() => null);
      if (!SQLite) {
        dbInstance = createMemoryDatabaseAdapter();
        return dbInstance;
      }

      const rawDb = await (SQLite as any).openDatabaseAsync('aescion_commerce_v2.db');
      await initDatabaseTables(rawDb);
      await migrateDatabaseSchema(rawDb);

      dbInstance = createSafeNativeDbAdapter(rawDb);
      return dbInstance;
    } catch (err) {
      console.warn('SQLite native open failed, falling back to safe in-memory store:', err);
      dbInstance = createMemoryDatabaseAdapter();
      return dbInstance;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

function createSafeNativeDbAdapter(rawDb: any): LocalDbAdapter {
  return {
    execAsync: async (sql: string) => {
      try {
        await rawDb.execAsync(sql);
      } catch (e) {
        console.warn('SQLite execAsync error:', e);
      }
    },
    runAsync: async (sql: string, params: any[] = []) => {
      try {
        const cleanParams = sanitizeParams(params);
        return await rawDb.runAsync(sql, cleanParams);
      } catch (e) {
        console.warn('SQLite runAsync error (safely handled):', e);
        return { changes: 0 };
      }
    },
    getAllAsync: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
      try {
        const cleanParams = sanitizeParams(params);
        const results = await rawDb.getAllAsync(sql, cleanParams);
        return (results || []) as T[];
      } catch (e) {
        console.warn('SQLite getAllAsync error (safely handled):', e);
        return [];
      }
    },
    getFirstAsync: async <T = any>(sql: string, params: any[] = []): Promise<T | null> => {
      try {
        const cleanParams = sanitizeParams(params);
        const result = await rawDb.getFirstAsync(sql, cleanParams);
        return (result || null) as T | null;
      } catch (e) {
        console.warn('SQLite getFirstAsync error (safely handled):', e);
        return null;
      }
    }
  };
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
      lastSyncedAt TEXT,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
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
      lastSyncedAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS local_customers (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      gstin TEXT,
      creditLimit REAL DEFAULT 0,
      currentOutstanding REAL DEFAULT 0,
      loyaltyPoints REAL DEFAULT 0,
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
      retryCount INTEGER DEFAULT 0,
      lastError TEXT,
      createdAt TEXT NOT NULL,
      syncedAt TEXT,
      serverAssignedId TEXT,
      serverAssignedNumber TEXT,
      errorMessage TEXT
    );

    CREATE TABLE IF NOT EXISTS local_shifts (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      branchId TEXT NOT NULL,
      cashierId TEXT NOT NULL,
      cashierName TEXT NOT NULL,
      status TEXT DEFAULT 'OPEN',
      openingFloat REAL DEFAULT 0,
      totalSales REAL DEFAULT 0,
      cashCollected REAL DEFAULT 0,
      upiCollected REAL DEFAULT 0,
      cardCollected REAL DEFAULT 0,
      closedAt TEXT,
      createdAt TEXT NOT NULL
    );
  `);
}

async function migrateDatabaseSchema(db: any) {
  try {
    // 1. Migrate local_products
    const localProductsInfo = await db.getAllAsync(`PRAGMA table_info(local_products);`);
    const lpCols = new Set(localProductsInfo.map((c: any) => c.name));

    if (lpCols.size > 0) {
      if (!lpCols.has('lastSyncedAt')) {
        await db.execAsync(`ALTER TABLE local_products ADD COLUMN lastSyncedAt TEXT;`);
      }
      if (!lpCols.has('updatedAt')) {
        await db.execAsync(`ALTER TABLE local_products ADD COLUMN updatedAt TEXT;`);
      }
      if (!lpCols.has('batchNumber')) {
        await db.execAsync(`ALTER TABLE local_products ADD COLUMN batchNumber TEXT;`);
      }
      if (!lpCols.has('expiryDate')) {
        await db.execAsync(`ALTER TABLE local_products ADD COLUMN expiryDate TEXT;`);
      }
      if (!lpCols.has('category')) {
        await db.execAsync(`ALTER TABLE local_products ADD COLUMN category TEXT;`);
      }
      if (!lpCols.has('hsn')) {
        await db.execAsync(`ALTER TABLE local_products ADD COLUMN hsn TEXT;`);
      }
      if (!lpCols.has('mrp')) {
        await db.execAsync(`ALTER TABLE local_products ADD COLUMN mrp REAL;`);
      }
    }

    // 2. Migrate products
    const productsInfo = await db.getAllAsync(`PRAGMA table_info(products);`);
    const pCols = new Set(productsInfo.map((c: any) => c.name));

    if (pCols.size > 0) {
      if (!pCols.has('lastSyncedAt')) {
        await db.execAsync(`ALTER TABLE products ADD COLUMN lastSyncedAt TEXT;`);
      }
      if (!pCols.has('updatedAt')) {
        await db.execAsync(`ALTER TABLE products ADD COLUMN updatedAt TEXT;`);
      }
      if (!pCols.has('batchNumber')) {
        await db.execAsync(`ALTER TABLE products ADD COLUMN batchNumber TEXT;`);
      }
      if (!pCols.has('expiryDate')) {
        await db.execAsync(`ALTER TABLE products ADD COLUMN expiryDate TEXT;`);
      }
    }

    // 3. Migrate sync_queue
    const syncQueueInfo = await db.getAllAsync(`PRAGMA table_info(sync_queue);`);
    const sqCols = new Set(syncQueueInfo.map((c: any) => c.name));

    if (sqCols.size > 0) {
      if (!sqCols.has('retryCount')) {
        await db.execAsync(`ALTER TABLE sync_queue ADD COLUMN retryCount INTEGER DEFAULT 0;`);
      }
      if (!sqCols.has('lastError')) {
        await db.execAsync(`ALTER TABLE sync_queue ADD COLUMN lastError TEXT;`);
      }
      if (!sqCols.has('errorMessage')) {
        await db.execAsync(`ALTER TABLE sync_queue ADD COLUMN errorMessage TEXT;`);
      }
      if (!sqCols.has('syncedAt')) {
        await db.execAsync(`ALTER TABLE sync_queue ADD COLUMN syncedAt TEXT;`);
      }
      if (!sqCols.has('serverAssignedId')) {
        await db.execAsync(`ALTER TABLE sync_queue ADD COLUMN serverAssignedId TEXT;`);
      }
      if (!sqCols.has('serverAssignedNumber')) {
        await db.execAsync(`ALTER TABLE sync_queue ADD COLUMN serverAssignedNumber TEXT;`);
      }
    }

    // 4. Migrate local_customers
    const custInfo = await db.getAllAsync(`PRAGMA table_info(local_customers);`);
    const custCols = new Set(custInfo.map((c: any) => c.name));

    if (custCols.size > 0) {
      if (!custCols.has('loyaltyPoints')) {
        await db.execAsync(`ALTER TABLE local_customers ADD COLUMN loyaltyPoints REAL DEFAULT 0;`);
      }
    }
  } catch (err) {
    console.warn('SQLite migration check warning:', err);
  }
}

function createMemoryDatabaseAdapter(): LocalDbAdapter {
  return {
    execAsync: async () => {},
    runAsync: async (sql: string, params: any[] = []) => {
      const clean = sanitizeParams(params);
      const lower = sql.toLowerCase().replace(/\s+/g, ' ').trim();

      // INSERT / REPLACE INTO local_products or products
      if (lower.includes('into local_products') || lower.includes('into products')) {
        const [id, orgId, branchId, name, sku, barcode, sellingPrice, mrp, taxRate, hsn, category, currentStock, batchNumber, expiryDate, lastSyncedAt, updatedAt] = clean;
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
          lastSyncedAt,
          updatedAt: updatedAt || lastSyncedAt || new Date().toISOString()
        };

        const existingIdx = inMemoryTables.local_products.findIndex((p) => p.id === id);
        if (existingIdx >= 0) inMemoryTables.local_products[existingIdx] = record;
        else inMemoryTables.local_products.push(record);

        const existingProdIdx = inMemoryTables.products.findIndex((p) => p.id === id);
        if (existingProdIdx >= 0) inMemoryTables.products[existingProdIdx] = record;
        else inMemoryTables.products.push(record);

        return { changes: 1 };
      }

      // UPDATE local_products SET currentStock = currentStock - ? WHERE id = ?
      if (lower.startsWith('update local_products set currentstock = currentstock -') || lower.startsWith('update products set currentstock = currentstock -')) {
        const [qty, id] = clean;
        const prod = inMemoryTables.local_products.find((p) => p.id === id);
        if (prod) {
          prod.currentStock = Number(prod.currentStock) - Number(qty);
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      // INSERT INTO sync_queue
      if (lower.includes('into sync_queue')) {
        const [id, clientTransactionId, operationType, entityType, payload, branchId, organizationId, userId, status, createdAt] = clean;
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
        const [status, serverAssignedId, serverAssignedNumber, syncedAt, clientTransactionId] = clean;
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
        const item = inMemoryTables.sync_queue.find((q) => q.clientTransactionId === clean[clean.length - 1]);
        if (item) {
          item.status = clean[0];
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      return { changes: 0 };
    },
    getAllAsync: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
      const clean = sanitizeParams(params);
      const lower = sql.toLowerCase().replace(/\s+/g, ' ').trim();

      if (lower.includes('from local_products') || lower.includes('from products')) {
        return [...inMemoryTables.local_products] as unknown as T[];
      }

      if (lower.includes('from sync_queue where status =')) {
        const status = clean[0] || 'PENDING';
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
      const clean = sanitizeParams(params);
      const lower = sql.toLowerCase().replace(/\s+/g, ' ').trim();

      if (lower.includes('from local_products where id =') || lower.includes('from products where id =')) {
        const id = clean[0];
        const res = inMemoryTables.local_products.find((p) => p.id === id);
        return (res as unknown as T) || null;
      }

      return null;
    }
  };
}
