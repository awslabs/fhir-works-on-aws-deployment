/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export default class ResourceNotFoundError extends Error {
    readonly resourceType: string;

    readonly id: string;

    constructor(resourceType: string, id: string, message = 'Resource not found') {
        // Node Error class requires passing a string message to the parent class
        super(message);
        this.resourceType = resourceType;
        this.id = id;
        this.name = this.constructor.name;
    }
}
