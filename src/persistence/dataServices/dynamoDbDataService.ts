/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable class-methods-use-this */
import DynamoDB from 'aws-sdk/clients/dynamodb';
import uuidv4 from 'uuid/v4';
import {
    Persistence,
    ReadResourceRequest,
    vReadResourceRequest,
    CreateResourceRequest,
    DeleteResourceRequest,
    UpdateResourceRequest,
    PatchResourceRequest,
    ConditionalDeleteResourceRequest,
} from '../../interface/persistence';
import GenericResponse from '../../interface/genericResponse';
import { DynamoDb, DynamoDBConverter } from './dynamoDb';
import DOCUMENT_STATUS from './documentStatus';
import DynamoDbBundleService from './dynamoDbBundleService';
import DdbUtil from './dynamoDbUtil';
import { BatchReadWriteRequest, BundleResponse } from '../../interface/bundle';
import DynamoDbParamBuilder from './dynamoDbParamBuilder';
import { generateMeta } from '../../interface/resourceMeta';
import { clone } from '../../interface/utilities';
import DynamoDbHelper from './dynamoDbHelper';
import ResourceVersionNotFoundError from '../../interface/errors/ResourceVersionNotFoundError';

export default class DynamoDbDataService implements Persistence {
    updateCreateSupported: boolean = false;

    private readonly transactionService: DynamoDbBundleService;

    private readonly dynamoDbHelper: DynamoDbHelper;

    constructor(dynamoDb: DynamoDB) {
        this.dynamoDbHelper = new DynamoDbHelper(dynamoDb);
        this.transactionService = new DynamoDbBundleService(dynamoDb);
    }

    async readResource(request: ReadResourceRequest): Promise<GenericResponse> {
        return this.dynamoDbHelper.getMostRecentValidResource(request.resourceType, request.id);
    }

    async vReadResource(request: vReadResourceRequest): Promise<GenericResponse> {
        const { resourceType, id, vid } = request;
        const params = DynamoDbParamBuilder.buildGetItemParam(id, vid);
        const result = await DynamoDb.getItem(params).promise();
        if (result.Item === undefined) {
            throw new ResourceVersionNotFoundError(resourceType, id, vid);
        }
        let item = DynamoDBConverter.unmarshall(result.Item);
        item = DdbUtil.cleanItem(item);
        return {
            message: 'Resource found',
            resource: item,
        };
    }

    async createResource(request: CreateResourceRequest) {
        const { resourceType, resource, id } = request;
        let item = resource;
        item.resourceType = resourceType;

        item.meta = generateMeta('1');

        const params = DynamoDbParamBuilder.buildPutAvailableItemParam(item, id || uuidv4(), resource.meta.versionId);
        await DynamoDb.putItem(params).promise();
        const newItem = DynamoDBConverter.unmarshall(params.Item);
        item = DdbUtil.cleanItem(newItem);
        return {
            success: true,
            message: 'Resource created',
            resource: item,
        };
    }

    async deleteResource(request: DeleteResourceRequest) {
        const { resourceType, id } = request;
        const itemServiceResponse = await this.readResource({ resourceType, id });

        const { versionId } = itemServiceResponse.resource.meta;

        return this.deleteVersionedResource(resourceType, id, versionId);
    }

    async deleteVersionedResource(resourceType: string, id: string, vid: string) {
        const updateStatusToDeletedParam = DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
            DOCUMENT_STATUS.AVAILABLE,
            DOCUMENT_STATUS.DELETED,
            id,
            vid,
        ).Update;
        await DynamoDb.updateItem(updateStatusToDeletedParam).promise();
        return {
            success: true,
            message: `Successfully deleted ResourceType: ${resourceType}, Id: ${id}, VersionId: ${vid}`,
        };
    }

    async updateResource(request: UpdateResourceRequest) {
        const { resource, resourceType, id } = request;
        const resourceCopy = { ...resource };
        const getResponse = await this.readResource({ resourceType, id });
        const currentVId: number = getResponse.resource.meta
            ? parseInt(getResponse.resource.meta.versionId, 10) || 0
            : 0;

        resourceCopy.meta = generateMeta((currentVId + 1).toString());

        const batchRequest: BatchReadWriteRequest = {
            operation: 'update',
            resourceType,
            id,
            resource: resourceCopy,
        };

        let item: any = {};
        // Sending the request to `atomicallyReadWriteResources` to take advantage of LOCKING management handled by
        // that method
        const response: BundleResponse = await this.transactionService.transaction({
            requests: [batchRequest],
            startTime: new Date(),
        });
        item = clone(resource);
        const batchReadWriteEntryResponse = response.batchReadWriteResponses[0];
        item.meta = generateMeta(batchReadWriteEntryResponse.vid, new Date(batchReadWriteEntryResponse.lastModified));
        return {
            success: true,
            message: 'Resource updated',
            resource: item,
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    conditionalCreateResource(request: CreateResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    conditionalUpdateResource(request: UpdateResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    patchResource(request: PatchResourceRequest): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    conditionalPatchResource(request: PatchResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    conditionalDeleteResource(request: ConditionalDeleteResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }
}
