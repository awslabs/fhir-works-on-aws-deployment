/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export default class ResourceVersionNotFoundError extends Error {
    readonly resourceType: string;

    readonly id: string;

    readonly version: string;

    constructor(resourceType: string, id: string, version: string, message = 'Resource version not found') {
        // Node Error class requires passing a string message to the parent class
        super(message);
        this.resourceType = resourceType;
        this.id = id;
        this.version = version;
        this.name = this.constructor.name;
    }
}
