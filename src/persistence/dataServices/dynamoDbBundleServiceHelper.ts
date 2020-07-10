// eslint-disable-next-line import/extensions
import uuidv4 from 'uuid/v4';
import { BatchReadWriteRequest, BatchReadWriteResponse } from '../../interface/bundle';
import DdbUtil from './dynamoDbUtil';
import DOCUMENT_STATUS from './documentStatus';
import { DynamoDBConverter, RESOURCE_TABLE } from './dynamoDb';
import DynamoDbParamBuilder from './dynamoDbParamBuilder';
import { TypeOperation, SystemOperation } from '../../interface/constants';

export default class DynamoDbBundleServiceHelper {
    static generateStagingRequests(requests: BatchReadWriteRequest[], idToVersionId: Record<string, string>) {
        const deleteRequests: any = [];
        const createRequests: any = [];
        const updateRequests: any = [];
        const readRequests: any = [];

        let newLocks: ItemRequest[] = [];
        let newBundleEntryResponses: BatchReadWriteResponse[] = [];

        requests.forEach(request => {
            switch (request.operation) {
                case 'create': {
                    // Add create request, put it in PENDING
                    let id = uuidv4();
                    if (request.id) {
                        id = request.id;
                    }
                    const vid = '1';
                    const Item = DdbUtil.prepItemForDdbInsert(request.resource, id, vid, DOCUMENT_STATUS.PENDING);

                    createRequests.push({
                        Put: {
                            TableName: RESOURCE_TABLE,
                            Item: DynamoDBConverter.marshall(Item),
                        },
                    });
                    const { stagingResponse, itemLocked } = this.addStagingResponseAndItemsLocked(
                        id,
                        vid,
                        request.resourceType,
                        request.operation,
                        Item.meta.lastUpdated,
                    );
                    newBundleEntryResponses = newBundleEntryResponses.concat(stagingResponse);
                    newLocks = newLocks.concat(itemLocked);
                    break;
                }
                case 'update': {
                    // Create new entry with status = PENDING
                    // When updating a resource, create a new Document for that resource
                    const { id } = request.resource;
                    const vid = ((parseInt(idToVersionId[id], 10) || 0) + 1).toString();
                    const Item = DdbUtil.prepItemForDdbInsert(request.resource, id, vid, DOCUMENT_STATUS.PENDING);

                    updateRequests.push({
                        Put: {
                            TableName: RESOURCE_TABLE,
                            Item: DynamoDBConverter.marshall(Item),
                        },
                    });

                    const { stagingResponse, itemLocked } = this.addStagingResponseAndItemsLocked(
                        id,
                        vid,
                        request.resourceType,
                        request.operation,
                        Item.meta.lastUpdated,
                    );
                    newBundleEntryResponses = newBundleEntryResponses.concat(stagingResponse);
                    newLocks = newLocks.concat(itemLocked);
                    break;
                }
                case 'delete': {
                    // Mark documentStatus as PENDING_DELETE
                    const { id } = request;
                    const vid = idToVersionId[id];
                    const idWithVersion = DdbUtil.generateFullId(id, vid);
                    deleteRequests.push(
                        DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
                            DOCUMENT_STATUS.LOCKED,
                            DOCUMENT_STATUS.PENDING_DELETE,
                            request.resourceType,
                            idWithVersion,
                        ),
                    );
                    newBundleEntryResponses.push({
                        id,
                        vid,
                        operation: request.operation,
                        lastModified: new Date().toISOString(),
                        resource: {},
                        resourceType: request.resourceType,
                    });
                    break;
                }
                case 'read': {
                    // Read the latest version with documentStatus = "LOCKED"
                    const { id } = request;
                    const vid = idToVersionId[id];
                    const idWithVersion = DdbUtil.generateFullId(id, vid);
                    readRequests.push({
                        Get: {
                            TableName: RESOURCE_TABLE,
                            Key: DynamoDBConverter.marshall({
                                resourceType: request.resourceType,
                                id: idWithVersion,
                            }),
                        },
                    });
                    newBundleEntryResponses.push({
                        id,
                        vid,
                        operation: request.operation,
                        lastModified: '',
                        resource: {},
                        resourceType: request.resourceType,
                    });
                    break;
                }
                default: {
                    break;
                }
            }
        });

        return {
            deleteRequests,
            createRequests,
            updateRequests,
            readRequests,
            newLocks,
            newStagingResponses: newBundleEntryResponses,
        };
    }

    static generateRollbackRequests(bundleEntryResponses: BatchReadWriteResponse[]) {
        let itemsToRemoveFromLock: { id: string; vid: string; resourceType: string }[] = [];
        let transactionRequests: any = [];
        bundleEntryResponses.forEach(stagingResponse => {
            switch (stagingResponse.operation) {
                case 'create':
                case 'update': {
                    /*
                        DELETE latest record
                        and remove lock entry from lockedItems
                     */
                    const {
                        transactionRequest,
                        itemToRemoveFromLock,
                    } = this.generateDeleteLatestRecordAndItemToRemoveFromLock(
                        stagingResponse.resourceType,
                        stagingResponse.id,
                        stagingResponse.vid,
                    );
                    transactionRequests = transactionRequests.concat(transactionRequest);
                    itemsToRemoveFromLock = itemsToRemoveFromLock.concat(itemToRemoveFromLock);
                    break;
                }
                default: {
                    // For READ and DELETE we don't need to delete anything, because no new records were made for those
                    // requests
                    break;
                }
            }
        });

        return { transactionRequests, itemsToRemoveFromLock };
    }

    private static generateDeleteLatestRecordAndItemToRemoveFromLock(resourceType: string, id: string, vid: string) {
        const transactionRequest = DynamoDbParamBuilder.buildDeleteParam(id, vid, resourceType);
        const itemToRemoveFromLock = {
            id,
            vid,
            resourceType,
        };

        return { transactionRequest, itemToRemoveFromLock };
    }

    static populateBundleEntryResponseWithReadResult(bundleEntryResponses: BatchReadWriteResponse[], readResult: any) {
        let index = 0;
        const updatedStagingResponses = bundleEntryResponses;
        for (let i = 0; i < bundleEntryResponses.length; i += 1) {
            const stagingResponse = bundleEntryResponses[i];
            // The first readResult will be the response to the first READ stagingResponse
            if (stagingResponse.operation === 'read') {
                let item = readResult?.Responses[index]?.Item;
                if (item === undefined) {
                    throw new Error('Failed to fulfill all READ requests');
                }
                item = DynamoDBConverter.unmarshall(item);
                item = DdbUtil.cleanItem(item);

                stagingResponse.resource = item;
                stagingResponse.lastModified = item?.meta?.lastUpdated ? item.meta.lastUpdated : '';
                updatedStagingResponses[i] = stagingResponse;
                index += 1;
            }
        }
        return updatedStagingResponses;
    }

    private static addStagingResponseAndItemsLocked(
        id: string,
        vid: string,
        resourceType: string,
        operation: TypeOperation,
        lastModified: string,
    ) {
        const stagingResponse = {
            id,
            vid,
            operation,
            lastModified,
            resourceType,
            resource: {},
        };
        const itemLocked = {
            id,
            vid,
            resourceType,
            operation,
        };

        return { stagingResponse, itemLocked };
    }
}

export interface ItemRequest {
    id: string;
    vid?: string;
    resourceType: string;
    operation: TypeOperation | SystemOperation;
}
