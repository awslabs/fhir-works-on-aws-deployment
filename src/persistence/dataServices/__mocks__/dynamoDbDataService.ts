/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Persistence,
    ReadResourceRequest,
    vReadResourceRequest,
    CreateResourceRequest,
    DeleteResourceRequest,
    UpdateResourceRequest,
    PatchResourceRequest,
    ConditionalDeleteResourceRequest,
} from '../../../interface/persistence';
import { generateMeta } from '../../../interface/resourceMeta';
import validPatient from '../../../../sampleData/validV4Patient.json';
import GenericResponse from '../../../interface/genericResponse';
import { clone } from '../../../interface/utilities';

const DynamoDbDataService: Persistence = class {
    static updateCreateSupported: boolean = false;

    static async createResource(request: CreateResourceRequest): Promise<GenericResponse> {
        const resourceCopy: any = clone(request.resource);
        resourceCopy.id = request.id || 'id';
        resourceCopy.meta = generateMeta('1');
        return {
            message: 'Resource created',
            resource: resourceCopy,
        };
    }

    static async updateResource(request: UpdateResourceRequest): Promise<GenericResponse> {
        const resourceCopy: any = clone(request.resource);
        resourceCopy.id = request.id;
        resourceCopy.meta = generateMeta('2');
        return {
            message: 'Resource updated',
            resource: resourceCopy,
        };
    }

    static async patchResource(request: PatchResourceRequest): Promise<GenericResponse> {
        const resourceCopy: any = clone(request.resource);
        resourceCopy.id = request.id;
        resourceCopy.meta = generateMeta('2');
        return {
            message: 'Resource patched',
            resource: resourceCopy,
        };
    }

    static async readResource(request: ReadResourceRequest): Promise<GenericResponse> {
        const resourceCopy: any = clone(validPatient);
        resourceCopy.id = request.id;
        resourceCopy.meta = generateMeta('1');
        return {
            message: 'Resource found',
            resource: resourceCopy,
        };
    }

    static async vReadResource(request: vReadResourceRequest): Promise<GenericResponse> {
        const resourceCopy: any = clone(validPatient);
        resourceCopy.id = request.id;
        resourceCopy.meta = generateMeta(request.vid);
        return {
            message: 'Resource found',
            resource: resourceCopy,
        };
    }

    static async deleteResource(request: DeleteResourceRequest): Promise<GenericResponse> {
        return {
            message: `Successfully deleted ResourceType: ${request.resourceType}, Id: ${request.id}`,
            resource: { count: 3 },
        };
    }

    static async deleteVersionedResource(
        resourceType: string,
        id: string,
        versionId: string,
    ): Promise<GenericResponse> {
        return {
            message: `Successfully deleted ResourceType: ${resourceType}, Id: ${id}, VersionId: ${versionId}`,
            resource: { count: 1 },
        };
    }

    static conditionalCreateResource(request: CreateResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    static conditionalUpdateResource(request: UpdateResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    static conditionalPatchResource(request: PatchResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    static conditionalDeleteResource(
        request: ConditionalDeleteResourceRequest,
        queryParams: any,
    ): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }
};
export default DynamoDbDataService;
