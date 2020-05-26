import BatchReadWriteResponse from './batchReadWriteResponse';

export default class BatchReadWriteServiceResponse {
    readonly success: boolean;

    readonly errorType?: BatchReadWriteErrorType;

    readonly message: string = '';

    readonly batchReadWriteResponses: BatchReadWriteResponse[] = [];

    constructor(
        success: boolean,
        message: string = '',
        batchReadWriteResponses: BatchReadWriteResponse[],
        errorType?: BatchReadWriteErrorType,
    ) {
        this.success = success;
        this.message = message;
        this.batchReadWriteResponses = batchReadWriteResponses;
        this.errorType = errorType;
    }
}

export const enum BatchReadWriteErrorType {
    USER_ERROR = 'USER_ERROR',
    SYSTEM_ERROR = 'SYSTEM_ERROR',
}
