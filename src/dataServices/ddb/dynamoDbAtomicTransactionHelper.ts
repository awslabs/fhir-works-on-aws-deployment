// eslint-disable-next-line import/extensions
import uuidv4 from 'uuid/v4';
import BatchReadWriteRequest, { BatchReadWriteRequestType } from './batchReadWriteRequest';
import DdbUtil from './dynamoDbUtil';
import DOCUMENT_STATUS from './documentStatus';
import { DynamoDBConverter, RESOURCE_TABLE } from './dynamoDb';
import BatchReadWriteResponse from './batchReadWriteResponse';
import DynamoDbParamBuilder from './dynamoDbParamBuilder';

export default class DynamoDbAtomicTransactionHelper {
    static generateStagingRequests(requests: BatchReadWriteRequest[], idToVersionId: Record<string, number>) {
        const deleteRequests: any = [];
        const createRequests: any = [];
        const updateRequests: any = [];
        const readRequests: any = [];

        let newLocks: ItemRequest[] = [];
        let newBundleEntryResponses: BatchReadWriteResponse[] = [];

        requests.forEach(request => {
            switch (request.type) {
                case BatchReadWriteRequestType.CREATE: {
                    // Add create request, put it in PENDING
                    let id = uuidv4();
                    if (request.id) {
                        id = request.id;
                    }
                    const versionId = 1;
                    const Item = DdbUtil.prepItemForDdbInsert(request.resource, id, versionId, DOCUMENT_STATUS.PENDING);

                    createRequests.push({
                        Put: {
                            TableName: RESOURCE_TABLE,
                            Item: DynamoDBConverter.marshall(Item),
                        },
                    });
                    const { stagingResponse, itemLocked } = this.addStagingResponseAndItemsLocked(
                        id,
                        versionId,
                        request.resourceType,
                        request.type,
                        Item.meta.lastUpdated,
                    );
                    newBundleEntryResponses = newBundleEntryResponses.concat(stagingResponse);
                    newLocks = newLocks.concat(itemLocked);
                    break;
                }
                case BatchReadWriteRequestType.UPDATE: {
                    // Create new entry with status = PENDING
                    // When updating a resource, create a new Document for that resource
                    const { id } = request.resource;
                    const versionId = idToVersionId[id] + 1;
                    const Item = DdbUtil.prepItemForDdbInsert(request.resource, id, versionId, DOCUMENT_STATUS.PENDING);

                    updateRequests.push({
                        Put: {
                            TableName: RESOURCE_TABLE,
                            Item: DynamoDBConverter.marshall(Item),
                        },
                    });

                    const { stagingResponse, itemLocked } = this.addStagingResponseAndItemsLocked(
                        id,
                        versionId,
                        request.resourceType,
                        request.type,
                        Item.meta.lastUpdated,
                    );
                    newBundleEntryResponses = newBundleEntryResponses.concat(stagingResponse);
                    newLocks = newLocks.concat(itemLocked);
                    break;
                }
                case BatchReadWriteRequestType.DELETE: {
                    // Mark documentStatus as PENDING_DELETE
                    const { id } = request;
                    const versionId = idToVersionId[id];
                    const idWithVersion = DdbUtil.generateFullId(id, versionId);
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
                        versionId,
                        type: request.type,
                        lastModified: new Date().toISOString(),
                        resource: {},
                        resourceType: request.resourceType,
                    });
                    break;
                }
                case BatchReadWriteRequestType.READ: {
                    // Read the latest version with documentStatus = "LOCKED"
                    const { id } = request;
                    const versionId = idToVersionId[id];
                    const idWithVersion = DdbUtil.generateFullId(id, versionId);
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
                        versionId,
                        type: request.type,
                        lastModified: '',
                        resource: {},
                        resourceType: request.resourceType,
                    });
                    break;
                }
                case BatchReadWriteRequestType.SEARCH: {
                    // TODO Implement this
                    break;
                }
                case BatchReadWriteRequestType.V_READ: {
                    // TODO Implement this
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
        let itemsToRemoveFromLock: { id: string; versionId: number; resourceType: string }[] = [];
        let transactionRequests: any = [];
        bundleEntryResponses.forEach(stagingResponse => {
            switch (stagingResponse.type) {
                case BatchReadWriteRequestType.CREATE:
                case BatchReadWriteRequestType.UPDATE: {
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
                        stagingResponse.versionId,
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

    private static generateDeleteLatestRecordAndItemToRemoveFromLock(
        resourceType: string,
        id: string,
        versionId: number,
    ) {
        const transactionRequest = DynamoDbParamBuilder.buildDeleteParam(id, versionId, resourceType);
        const itemToRemoveFromLock = {
            id,
            versionId,
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
            if (stagingResponse.type === BatchReadWriteRequestType.READ) {
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
        versionId: number,
        resourceType: string,
        type: BatchReadWriteRequestType,
        lastModified: string,
    ) {
        const stagingResponse = {
            id,
            versionId,
            type,
            lastModified,
            resourceType,
            resource: {},
        };
        const itemLocked = {
            id,
            versionId,
            resourceType,
            type,
        };

        return { stagingResponse, itemLocked };
    }
}

export interface ItemRequest {
    id: string;
    versionId?: number;
    resourceType: string;
    type: BatchReadWriteRequestType;
}
