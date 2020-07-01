import BatchReadWriteRequest from '../dataServices/ddb/batchReadWriteRequest';
import BatchReadWriteServiceResponse from '../dataServices/ddb/batchReadWriteServiceResponse';

export interface BatchRequest {
    requests: BatchReadWriteRequest[];
    startTime: Date;
}
export interface TransactionRequest {
    requests: BatchReadWriteRequest[];
    startTime: Date;
}
export interface Bundle {
    /**
     * A set of actions to be independently performed as a "batch". For example if one operation in the batch
     * fails this will NOT fail the entire batch
     */
    batch(request: BatchRequest): Promise<BatchReadWriteServiceResponse>;
    /**
     * A set of actions to be atomically performed as a "transaction". For example if one operation in the transaction
     * fails this will fail the entire transaction, and roll back any pending changes.
     */
    transaction(request: TransactionRequest): Promise<BatchReadWriteServiceResponse>;
}
