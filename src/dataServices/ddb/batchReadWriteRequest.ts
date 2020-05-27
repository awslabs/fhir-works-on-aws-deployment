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
