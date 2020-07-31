/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import AWSMock from 'aws-sdk-mock';
import { QueryInput, TransactWriteItemsInput } from 'aws-sdk/clients/dynamodb';
import * as AWS from 'aws-sdk';
import DynamoDbBundleService from './dynamoDbBundleService';
import { BundleResponse, BatchReadWriteRequest } from '../../interface/bundle';
import DynamoDbUtil from './dynamoDbUtil';
import { DynamoDBConverter } from './dynamoDb';
import { timeFromEpochInMsRegExp, utcTimeRegExp } from '../../regExpressions';
// eslint-disable-next-line import/order
import sinon = require('sinon');

AWSMock.setSDKInstance(AWS);

describe('atomicallyReadWriteResources', () => {
    afterEach(() => {
        AWSMock.restore();
    });

    const id = 'bce8411e-c15e-448c-95dd-69155a837405';
    describe('ERROR Cases', () => {
        const runTest = async (expectedResponse: BundleResponse) => {
            const dynamoDb = new AWS.DynamoDB();
            const bundleService = new DynamoDbBundleService(dynamoDb);

            const deleteRequest: BatchReadWriteRequest = {
                operation: 'delete',
                resourceType: 'Patient',
                id,
                resource: 'Patient/bce8411e-c15e-448c-95dd-69155a837405',
            };
            const actualResponse = await bundleService.transaction({
                requests: [deleteRequest],
                startTime: new Date(),
            });

            expect(actualResponse).toEqual(expectedResponse);
        };

        test('LOCK: Delete item that does not exist', async () => {
            // READ items (Failure)
            AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
                callback(null, { Items: [] });
            });

            const expectedResponse: BundleResponse = {
                success: false,
                message: 'Failed to find resources: Patient/bce8411e-c15e-448c-95dd-69155a837405',
                batchReadWriteResponses: [],
                errorType: 'USER_ERROR',
            };

            await runTest(expectedResponse);
        });

        test('LOCK: Try to delete item that exist, but system cannot obtain the lock', async () => {
            // READ items (Success)
            AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
                callback(null, {
                    Items: [
                        DynamoDBConverter.marshall({
                            id: DynamoDbUtil.generateFullId(id, '1'),
                            resourceType: 'Patient',
                            meta: { versionId: '1', lastUpdate: new Date().toUTCString() },
                        }),
                    ],
                });
            });

            // LOCK items (Failure)
            AWSMock.mock('DynamoDB', 'transactWriteItems', (params: TransactWriteItemsInput, callback: Function) => {
                callback('ConditionalCheckFailed', {});
            });

            const expectedResponse: BundleResponse = {
                success: false,
                message: 'Failed to lock resources for transaction. Please try again after 35 seconds.',
                batchReadWriteResponses: [],
                errorType: 'SYSTEM_ERROR',
            };

            await runTest(expectedResponse);
        });

        test('STAGING: Item exist and lock obtained, but failed to stage', async () => {
            // READ items (Success)
            AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
                callback(null, {
                    Items: [
                        DynamoDBConverter.marshall({
                            id: DynamoDbUtil.generateFullId(id, '1'),
                            resourceType: 'Patient',
                            meta: { versionId: '1', lastUpdate: new Date().toUTCString() },
                        }),
                    ],
                });
            });

            const transactWriteItemStub = sinon.stub();
            // LOCK Items (Success)
            transactWriteItemStub.onFirstCall().returns({ error: null, value: {} });

            // STAGE Items (Failure)
            transactWriteItemStub.onSecondCall().returns({ error: 'ConditionalCheckFailed', value: {} });

            // Rollback Items (Success)
            transactWriteItemStub.onThirdCall().returns({ error: null, value: {} });
            AWSMock.mock('DynamoDB', 'transactWriteItems', (params: TransactWriteItemsInput, callback: Function) => {
                const { error, value } = transactWriteItemStub();
                callback(error, value);
            });

            const expectedResponse: BundleResponse = {
                success: false,
                message: 'Failed to stage resources for transaction',
                batchReadWriteResponses: [],
                errorType: 'SYSTEM_ERROR',
            };

            await runTest(expectedResponse);
        });
    });

    describe('SUCCESS Cases', () => {
        // When creating a resource, no locks is needed because no items in DDB to put a lock on yet
        test('CREATING a resource', async () => {
            // BUILD
            const transactWriteItemSpy = sinon.spy();
            AWSMock.mock('DynamoDB', 'transactWriteItems', (params: TransactWriteItemsInput, callback: Function) => {
                transactWriteItemSpy(params);
                callback(null, {});
            });

            const dynamoDb = new AWS.DynamoDB();
            const transactionService = new DynamoDbBundleService(dynamoDb);

            const createRequest: BatchReadWriteRequest = {
                operation: 'create',
                resourceType: 'Patient',
                id,
                resource: {
                    resourceType: 'Patient',
                    name: [
                        {
                            family: 'Smith',
                            given: ['John'],
                        },
                    ],
                    gender: 'male',
                },
            };

            // OPERATE
            const actualResponse = await transactionService.transaction({
                requests: [createRequest],
                startTime: new Date(),
            });

            // CHECK
            // transactWriteItem requests is called twice
            expect(transactWriteItemSpy.calledTwice).toBeTruthy();

            // 1. create new Patient record with documentStatus of 'PENDING'
            expect(transactWriteItemSpy.getCall(0).args[0]).toMatchObject({
                TransactItems: [
                    {
                        Put: {
                            TableName: '',
                            Item: {
                                resourceType: {
                                    S: 'Patient',
                                },
                                name: {
                                    L: [
                                        {
                                            M: {
                                                family: {
                                                    S: 'Smith',
                                                },
                                                given: {
                                                    L: [
                                                        {
                                                            S: 'John',
                                                        },
                                                    ],
                                                },
                                            },
                                        },
                                    ],
                                },
                                gender: {
                                    S: 'male',
                                },
                                id: {
                                    S: 'bce8411e-c15e-448c-95dd-69155a837405_1',
                                },
                                meta: {
                                    M: {
                                        versionId: {
                                            S: '1',
                                        },
                                        lastUpdated: {
                                            S: expect.stringMatching(utcTimeRegExp),
                                        },
                                    },
                                },
                                documentStatus: {
                                    S: 'PENDING',
                                },
                                lockEndTs: {
                                    N: expect.stringMatching(timeFromEpochInMsRegExp),
                                },
                            },
                        },
                    },
                ],
            });

            // 2. change Patient record's documentStatus to be 'AVAILABLE'
            expect(transactWriteItemSpy.getCall(1).args[0]).toMatchObject({
                TransactItems: [
                    {
                        Update: {
                            TableName: '',
                            Key: {
                                resourceType: { S: 'Patient' },
                                id: { S: 'bce8411e-c15e-448c-95dd-69155a837405_1' },
                            },
                            UpdateExpression: 'set documentStatus = :newStatus, lockEndTs = :futureEndTs',
                            ExpressionAttributeValues: {
                                ':newStatus': { S: 'AVAILABLE' },
                                ':futureEndTs': { N: expect.stringMatching(timeFromEpochInMsRegExp) },
                            },
                        },
                    },
                ],
            });

            expect(actualResponse).toMatchObject({
                message: 'Successfully committed requests to DB',
                batchReadWriteResponses: [
                    {
                        id: 'bce8411e-c15e-448c-95dd-69155a837405',
                        vid: '1',
                        operation: 'create',
                        lastModified: expect.stringMatching(utcTimeRegExp),
                        resourceType: 'Patient',
                        resource: {},
                    },
                ],
                success: true,
            });
        });
    });
});
