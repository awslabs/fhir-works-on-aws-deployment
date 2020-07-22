/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export default interface PromiseParamAndId {
    promiseParam: any;
    id: string;
    type: PromiseType;
}

export type PromiseType = 'delete' | 'upsert-AVAILABLE' | 'upsert-DELETED';
