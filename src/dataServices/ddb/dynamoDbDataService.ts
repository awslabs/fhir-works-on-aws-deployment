/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
// eslint-disable-next-line import/extensions
import DynamoDB from 'aws-sdk/clients/dynamodb';
// eslint-disable-next-line import/extensions
import uuidv4 from 'uuid/v4';
import {
    Persistence,
    ReadResourceRequest,
    vReadResourceRequest,
    CreateResourceRequest,
    DeleteResourceRequest,
    UpdateResourceRequest,
    PatchResourceRequest,
} from '../../interface/persistence';
import GenericResponse from '../../interface/genericResponse';
import { DynamoDb, DynamoDBConverter } from './dynamoDb';
import DOCUMENT_STATUS from './documentStatus';
import DynamoDbBundleService from './dynamoDbBundleService';
import DdbUtil from './dynamoDbUtil';
import { BatchReadWriteRequest, BundleResponse } from '../../interface/bundle';
import DynamoDbParamBuilder from './dynamoDbParamBuilder';
import { generateMeta } from '../../common/resourceMeta';
import { clone } from '../../common/utilities';
import DynamoDbHelper from './dynamoDbHelper';

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
        const params = DynamoDbParamBuilder.buildGetItemParam(resourceType, DdbUtil.generateFullId(id, vid));
        let item = null;
        try {
            const result = await DynamoDb.getItem(params).promise();
            item = result.Item ? DynamoDBConverter.unmarshall(result.Item) : null;
        } catch (e) {
            console.error(`Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`, e);
            return {
                success: false,
                message: `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}, VersionId: ${vid}`,
            };
        }

        if (!item) {
            return {
                success: false,
                message: 'Resource not found',
            };
        }
        item = DdbUtil.cleanItem(item);
        return {
            success: true,
            message: 'Resource found',
            resource: item,
        };
    }

    async createResource(request: CreateResourceRequest) {
        const { resourceType, resource, id } = request;
        let item = resource;
        item.resourceType = resourceType;

        const params = DynamoDbParamBuilder.buildPutAvailableItemParam(item, id || uuidv4(), resource.meta.versionId);
        try {
            await DynamoDb.putItem(params).promise();
            const newItem = DynamoDBConverter.unmarshall(params.Item);
            item = DdbUtil.cleanItem(newItem);
        } catch (e) {
            const errorMessageOnFailure = 'Failed to create new resource';
            console.error(errorMessageOnFailure, e);
            return {
                success: false,
                message: errorMessageOnFailure,
            };
        }

        return {
            success: true,
            message: 'Resource created',
            resource: item,
        };
    }

    async deleteResource(request: DeleteResourceRequest) {
        const { resourceType, id } = request;
        const itemServiceResponse = await this.readResource({ resourceType, id });
        if (!itemServiceResponse.success) {
            return {
                success: false,
                message: `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`,
            };
        }

        const { versionId } = itemServiceResponse.resource.meta;

        return this.deleteVersionedResource(resourceType, id, versionId);
    }

    async deleteVersionedResource(resourceType: string, id: string, vid: string) {
        const updateStatusToDeletedParam = DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
            DOCUMENT_STATUS.AVAILABLE,
            DOCUMENT_STATUS.DELETED,
            resourceType,
            DdbUtil.generateFullId(id, vid),
        ).Update;

        try {
            await DynamoDb.updateItem(updateStatusToDeletedParam).promise();
        } catch (e) {
            const errorMessage = `Failed to delete ResourceType: ${resourceType}, Id: ${id}, VersionId: ${vid}`;
            console.error(errorMessage, e);
            return {
                success: false,
                message: errorMessage,
            };
        }
        return {
            success: true,
            message: `Successfully deleted ResourceType: ${resourceType}, Id: ${id}, VersionId: ${vid}`,
        };
    }

    async updateResource(request: UpdateResourceRequest) {
        const { resourceType, resource, id } = request;

        const batchRequest: BatchReadWriteRequest = {
            operation: 'update',
            resourceType,
            id,
            resource,
        };

        let item: any = {};
        try {
            // Sending the request to `atomicallyReadWriteResources` to take advantage of LOCKING management handled by
            // that method
            const response: BundleResponse = await this.transactionService.transaction({
                requests: [batchRequest],
                startTime: new Date(),
            });
            item = clone(resource);
            const batchReadWriteEntryResponse = response.batchReadWriteResponses[0];
            item.meta = generateMeta(
                batchReadWriteEntryResponse.vid,
                new Date(batchReadWriteEntryResponse.lastModified),
            );
        } catch (e) {
            const errorMessage = 'Failed to update resource';
            console.error(errorMessage, e);
            return {
                success: false,
                message: errorMessage,
            };
        }

        return {
            success: true,
            message: 'Resource updated',
            resource: item,
        };
    }

    conditionalCreateResource(request: CreateResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    conditionalUpdateResource(request: UpdateResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    patchResource(request: PatchResourceRequest): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    conditionalPatchResource(request: PatchResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    conditionalDeleteResource(request: DeleteResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }
}
