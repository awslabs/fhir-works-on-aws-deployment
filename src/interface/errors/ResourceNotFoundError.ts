/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export default class ResourceNotFoundError extends Error {
    readonly resourceType: string;

    readonly id: string;

    constructor(resourceType: string, id: string, message?: string) {
        const msg = message || `Resource ${resourceType}/${id} is not known`;
        // Node Error class requires passing a string message to the parent class
        super(msg);
        this.resourceType = resourceType;
        this.id = id;
        this.name = this.constructor.name;
    }
}
