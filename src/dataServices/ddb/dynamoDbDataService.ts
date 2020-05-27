/* eslint-disable class-methods-use-this */
// eslint-disable-next-line import/extensions
import DynamoDB from 'aws-sdk/clients/dynamodb';
import DataServiceInterface from '../dataServiceInterface';
import ServiceResponse from '../../common/serviceResponse';
import { DynamoDb, DynamoDBConverter } from './dynamoDb';
import DOCUMENT_STATUS from './documentStatus';
import DynamoDbAtomicTransactionService from './dynamoDbAtomicTransactionService';
import DdbUtil from './dynamoDbUtil';
import BatchReadWriteRequest, { BatchReadWriteRequestType } from './batchReadWriteRequest';
import BatchReadWriteServiceResponse from './batchReadWriteServiceResponse';
import DynamoDbParamBuilder from './dynamoDbParamBuilder';
import { generateMeta } from '../../common/resourceMeta';
import { clone } from '../../common/utilities';
import DynamoDbHelper from './dynamoDbHelper';

export default class DynamoDbDataService implements DataServiceInterface {
    private readonly transactionService: DynamoDbAtomicTransactionService;

    private readonly dynamoDbHelper: DynamoDbHelper;

    constructor(dynamoDb: DynamoDB) {
        this.dynamoDbHelper = new DynamoDbHelper(dynamoDb);
        this.transactionService = new DynamoDbAtomicTransactionService(dynamoDb);
    }

    async getResource(resourceType: string, id: string) {
        return this.dynamoDbHelper.getMostRecentValidResource(resourceType, id);
    }

    async getVersionedResource(resourceType: string, id: string, versionId: string): Promise<ServiceResponse> {
        const params = DynamoDbParamBuilder.buildGetItemParam(
            resourceType,
            DdbUtil.generateFullId(id, Number(versionId)),
        );
        let item = null;
        try {
            const result = await DynamoDb.getItem(params).promise();
            item = result.Item ? DynamoDBConverter.unmarshall(result.Item) : null;
        } catch (e) {
            console.error(`Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`, e);
            return new ServiceResponse(
                false,
                `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}, VersionId: ${versionId}`,
            );
        }

        if (!item) {
            return new ServiceResponse(false, 'Resource not found');
        }
        item = DdbUtil.cleanItem(item);
        return new ServiceResponse(true, 'Resource found', item);
    }

    async createResource(resourceType: string, id: string, resource: any) {
        let item = resource;
        item.resourceType = resourceType;

        const params = DynamoDbParamBuilder.buildPutAvailableItemParam(item, id, Number(resource.meta.versionId));
        try {
            await DynamoDb.putItem(params).promise();
            const newItem = DynamoDBConverter.unmarshall(params.Item);
            item = DdbUtil.cleanItem(newItem);
        } catch (e) {
            const errorMessageOnFailure = 'Failed to create new resource';
            console.error(errorMessageOnFailure, e);
            return new ServiceResponse(false, errorMessageOnFailure);
        }

        return new ServiceResponse(true, 'Resource created', item);
    }

    async deleteResource(resourceType: string, id: string) {
        const itemServiceResponse = await this.getResource(resourceType, id);
        if (!itemServiceResponse.success) {
            return new ServiceResponse(false, `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`);
        }

        const { versionId } = itemServiceResponse.resource.meta;

        return this.deleteVersionedResource(resourceType, id, versionId);
    }

    async deleteVersionedResource(resourceType: string, id: string, versionId: string) {
        const updateStatusToDeletedParam = DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
            DOCUMENT_STATUS.AVAILABLE,
            DOCUMENT_STATUS.DELETED,
            resourceType,
            DdbUtil.generateFullId(id, parseInt(versionId, 10)),
        ).Update;

        try {
            await DynamoDb.updateItem(updateStatusToDeletedParam).promise();
        } catch (e) {
            const message = `Failed to delete ResourceType: ${resourceType}, Id: ${id}, VersionId: ${versionId}`;
            console.error(message, e);
            return Promise.resolve(new ServiceResponse(false, message));
        }
        return Promise.resolve(
            new ServiceResponse(
                true,
                `Successfully deleted ResourceType: ${resourceType}, Id: ${id}, VersionId: ${versionId}`,
                {},
            ),
        );
    }

    async updateResource(resourceType: string, id: string, resource: any) {
        const request: BatchReadWriteRequest = {
            type: BatchReadWriteRequestType.UPDATE,
            resourceType,
            id,
            resource,
        };

        let item: any = {};
        try {
            // Sending the request to `atomicallyReadWriteResources` to take advantage of LOCKING management handled by
            // that method
            const response: BatchReadWriteServiceResponse = await this.transactionService.atomicallyReadWriteResources([
                request,
            ]);
            item = clone(resource);
            const batchReadWriteEntryResponse = response.batchReadWriteResponses[0];
            item.meta = generateMeta(
                batchReadWriteEntryResponse.versionId,
                new Date(batchReadWriteEntryResponse.lastModified),
            );
        } catch (e) {
            const errorMessage = 'Failed to update resource';
            console.error(errorMessage, e);
            return new ServiceResponse(false, errorMessage);
        }

        return new ServiceResponse(true, 'Resource updated', DdbUtil.cleanItem(item));
    }

    async atomicallyReadWriteResources(
        requests: BatchReadWriteRequest[],
        startTime: Date,
    ): Promise<BatchReadWriteServiceResponse> {
        return this.transactionService.atomicallyReadWriteResources(requests, startTime);
    }
}
