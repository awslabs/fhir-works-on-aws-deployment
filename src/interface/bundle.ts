/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { TypeOperation, SystemOperation } from './constants';

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
    vid: string;
    resourceType: string;
    operation: TypeOperation | SystemOperation;
    resource: any;
    lastModified: string;
}

export interface BatchReadWriteRequest {
    operation: TypeOperation | SystemOperation;
    resourceType: string;
    id: string;
    vid?: string;
    resource: any; // GET requests, only contains the URL of the resource
    fullUrl?: string;
    references?: Reference[];
}

export interface Reference {
    resourceType: string;
    id: string;
    vid: string;
    rootUrl: string;
    referenceFullUrl: string;
    referencePath: string;
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
