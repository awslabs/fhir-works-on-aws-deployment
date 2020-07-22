/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export default class HttpError extends Error {
    readonly statusCode: number;

    readonly errorDetail: any;

    constructor(message: string, statusCode: number, errorDetail: any) {
        // Node Error class requires passing a string message to the parent class
        super(message);
        this.errorDetail = errorDetail;
        this.statusCode = statusCode;
    }
}
