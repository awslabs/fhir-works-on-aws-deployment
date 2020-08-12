/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export default class ObjectNotFoundError extends Error {
    readonly filename: string;

    constructor(filename: string, message?: string) {
        const msg = message || 'Object not found';
        // Node Error class requires passing a string message to the parent class
        super(msg);
        this.filename = filename;
        this.name = this.constructor.name;
    }
}
