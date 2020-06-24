export const enum BatchReadWriteRequestType {
    CREATE = 'CREATE',
    READ = 'READ',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    SEARCH = 'SEARCH',
    V_READ = 'V_READ',
}

export default interface BatchReadWriteRequest {
    type: BatchReadWriteRequestType;
    resourceType: string;
    id: string;
    versionId?: number;
    resource: any;
    fullUrl?: string;
    references?: any;
}

type httpBatchType = Record<string, BatchReadWriteRequestType>;
export const HttpTypeToBatchReadWriteRequestType: httpBatchType = {
    POST: BatchReadWriteRequestType.CREATE,
    PUT: BatchReadWriteRequestType.UPDATE,
    DELETE: BatchReadWriteRequestType.DELETE,
};

type batchTypeOperation = Record<BatchReadWriteRequestType, Hearth.Operation>;
export const BatchTypeToOperation: batchTypeOperation = {
    [BatchReadWriteRequestType.CREATE]: 'create',
    [BatchReadWriteRequestType.READ]: 'read',
    [BatchReadWriteRequestType.UPDATE]: 'update',
    [BatchReadWriteRequestType.DELETE]: 'delete',
    [BatchReadWriteRequestType.SEARCH]: 'search',
    [BatchReadWriteRequestType.V_READ]: 'vread',
};
