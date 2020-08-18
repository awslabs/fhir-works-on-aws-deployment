/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import AWSMock from 'aws-sdk-mock';
import { QueryInput } from 'aws-sdk/clients/dynamodb';
import * as AWS from 'aws-sdk';
// eslint-disable-next-line import/no-extraneous-dependencies
import { utcTimeRegExp } from '../../regExpressions';
import { BundleResponse, BatchReadWriteResponse } from '../../interface/bundle';
import DynamoDbBundleService from './dynamoDbBundleService';
import DynamoDbDataService from './dynamoDbDataService';
import { DynamoDBConverter } from './dynamoDb';

AWSMock.setSDKInstance(AWS);

// eslint-disable-next-line import/order
import sinon = require('sinon');

describe('updateResource', () => {
    afterEach(() => {
        AWSMock.restore();
    });

    test('Successfully update resource', async () => {
        // BUILD
        const id = '8cafa46d-08b4-4ee4-b51b-803e20ae8126';
        const resource = {
            id,
            vid: '1',
            resourceType: 'Patient',
            name: [
                {
                    family: 'Jameson',
                    given: ['Matt'],
                },
            ],
            meta: { versionId: '1', lastUpdate: new Date().toUTCString() },
        };

        // READ items (Success)
        AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
            callback(null, {
                Items: [DynamoDBConverter.marshall(resource)],
            });
        });

        const vid = '2';
        const batchReadWriteResponse: BatchReadWriteResponse = {
            id,
            vid,
            resourceType: 'Patient',
            operation: 'update',
            resource: {},
            lastModified: '2020-06-18T20:20:12.763Z',
        };

        const batchReadWriteServiceResponse: BundleResponse = {
            success: true,
            message: '',
            batchReadWriteResponses: [batchReadWriteResponse],
        };

        sinon.stub(DynamoDbBundleService.prototype, 'batch').returns(Promise.resolve(batchReadWriteServiceResponse));
        sinon
            .stub(DynamoDbBundleService.prototype, 'transaction')
            .returns(Promise.resolve(batchReadWriteServiceResponse));

        const dynamoDbDataService = new DynamoDbDataService(new AWS.DynamoDB());

        // OPERATE
        const serviceResponse = await dynamoDbDataService.updateResource({ resourceType: 'Patient', id, resource });

        // CHECK
        const expectedResource: any = { ...resource };
        expectedResource.meta = {
            versionId: vid.toString(),
            lastUpdated: expect.stringMatching(utcTimeRegExp),
        };

        expect(serviceResponse.success).toEqual(true);
        expect(serviceResponse.message).toEqual('Resource updated');
        expect(serviceResponse.resource).toMatchObject(expectedResource);
    });
});
