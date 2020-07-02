export interface BatchRequest {
    requests: BatchReadWriteRequest[];
    startTime: Date;
}
export interface TransactionRequest {
    requests: BatchReadWriteRequest[];
    startTime: Date;
}

export interface BatchReadWriteResponse {
    id: string;
    vid: number;
    resourceType: string;
    operation: Hearth.Operation;
    resource: any;
    lastModified: string;
}

export interface BatchReadWriteRequest {
    operation: Hearth.Operation;
    resourceType: string;
    id: string;
    vid?: number;
    resource: any; // GET requests, only contains the URL of the resource
    fullUrl?: string;
    references?: any;
}

export interface BundleResponse {
    readonly success: boolean;
    readonly errorType?: BatchReadWriteErrorType;
    readonly message: string;
    readonly batchReadWriteResponses: BatchReadWriteResponse[];
}

export type BatchReadWriteErrorType = 'USER_ERROR' | 'SYSTEM_ERROR';

export interface Bundle {
    /**
     * A set of actions to be independently performed as a "batch". For example if one operation in the batch
     * fails this will NOT fail the entire batch
     */
    batch(request: BatchRequest): Promise<BundleResponse>;
    /**
     * A set of actions to be atomically performed as a "transaction". For example if one operation in the transaction
     * fails this will fail the entire transaction, and roll back any pending changes.
     */
    transaction(request: TransactionRequest): Promise<BundleResponse>;
}
