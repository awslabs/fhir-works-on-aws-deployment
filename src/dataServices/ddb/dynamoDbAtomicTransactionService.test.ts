// eslint-disable-next-line import/no-extraneous-dependencies
import AWSMock from 'aws-sdk-mock';
// eslint-disable-next-line import/extensions
import { QueryInput, TransactWriteItemsInput } from 'aws-sdk/clients/dynamodb';
import * as AWS from 'aws-sdk';
import DynamoDbAtomicTransactionService from './dynamoDbAtomicTransactionService';
import { BatchReadWriteRequestType } from './batchReadWriteRequest';
import BatchReadWriteServiceResponse, { BatchReadWriteErrorType } from './batchReadWriteServiceResponse';
import DynamoDbUtil from './dynamoDbUtil';
import { DynamoDBConverter } from './dynamoDb';
// eslint-disable-next-line import/order
import sinon = require('sinon');

AWSMock.setSDKInstance(AWS);

describe('atomicallyReadWriteResources', () => {
    afterEach(() => {
        AWSMock.restore();
    });

    const id = 'bce8411e-c15e-448c-95dd-69155a837405';
    describe('ERROR Cases', () => {
        const runTest = async (expectedResponse: BatchReadWriteServiceResponse) => {
            const dynamoDb = new AWS.DynamoDB();
            const transactionService = new DynamoDbAtomicTransactionService(dynamoDb);

            const deleteRequest = {
                type: BatchReadWriteRequestType.DELETE,
                resourceType: 'Patient',
                id,
                resource: 'Patient/bce8411e-c15e-448c-95dd-69155a837405',
            };
            const actualResponse = await transactionService.atomicallyReadWriteResources([deleteRequest], new Date());

            expect(actualResponse).toEqual(expectedResponse);
        };

        test('LOCK: Delete item that does not exist', async () => {
            // READ items (Failure)
            AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
                callback(null, { Items: [] });
            });

            const expectedResponse = new BatchReadWriteServiceResponse(
                false,
                'Failed to find resources: Patient/bce8411e-c15e-448c-95dd-69155a837405',
                [],
                BatchReadWriteErrorType.USER_ERROR,
            );

            await runTest(expectedResponse);
        });

        test('LOCK: Try to delete item that exist, but system cannot obtain the lock', async () => {
            // READ items (Success)
            AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
                callback(null, {
                    Items: [
                        DynamoDBConverter.marshall({
                            id: DynamoDbUtil.generateFullId(id, 1),
                            resourceType: 'Patient',
                            meta: { versionId: 1, lastUpdate: new Date().toUTCString() },
                        }),
                    ],
                });
            });

            // LOCK items (Failure)
            AWSMock.mock('DynamoDB', 'transactWriteItems', (params: TransactWriteItemsInput, callback: Function) => {
                callback('ConditionalCheckFailed', {});
            });

            const expectedResponse = new BatchReadWriteServiceResponse(
                false,
                'Failed to lock resources for transaction. Please try again after  35 seconds.',
                [],
                BatchReadWriteErrorType.SYSTEM_ERROR,
            );

            await runTest(expectedResponse);
        });

        test('STAGING: Item exist and lock obtained, but failed to stage', async () => {
            // READ items (Success)
            AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
                callback(null, {
                    Items: [
                        DynamoDBConverter.marshall({
                            id: DynamoDbUtil.generateFullId(id, 1),
                            resourceType: 'Patient',
                            meta: { versionId: 1, lastUpdate: new Date().toUTCString() },
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

            const expectedResponse = new BatchReadWriteServiceResponse(
                false,
                'Failed to stage resources for transaction',
                [],
                BatchReadWriteErrorType.SYSTEM_ERROR,
            );

            await runTest(expectedResponse);
        });
    });

    // TODO Add tests for SUCCESS Cases
});
