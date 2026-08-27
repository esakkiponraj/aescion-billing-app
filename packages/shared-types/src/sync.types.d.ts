import { SyncState } from './enums';
export interface SyncMutation {
    id: string;
    organizationId: string;
    branchId: string;
    entityType: 'INVOICE' | 'PAYMENT' | 'CUSTOMER' | 'STOCK_LEDGER' | 'RESTAURANT_ORDER' | 'SERVICE_JOB';
    operation: 'CREATE' | 'UPDATE' | 'DELETE';
    payload: any;
    clientTimestamp: number;
    syncState: SyncState;
    errorMessage?: string;
    serverAssignedId?: string;
    serverAssignedNumber?: string;
}
export interface SyncBatchRequest {
    organizationId: string;
    branchId: string;
    lastSyncedTimestamp: number;
    mutations: SyncMutation[];
}
export interface SyncBatchResponse {
    success: boolean;
    serverTimestamp: number;
    processedMutations: Array<{
        clientTransactionId: string;
        status: 'SYNCED' | 'CONFLICT' | 'FAILED';
        serverAssignedId?: string;
        serverAssignedNumber?: string;
        error?: string;
    }>;
    serverChanges: {
        products?: any[];
        customers?: any[];
        invoices?: any[];
    };
}
//# sourceMappingURL=sync.types.d.ts.map