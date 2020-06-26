// eslint-disable-next-line import/no-extraneous-dependencies
import { utcTimeRegExp } from '../../regExpressions';
import { BatchReadWriteRequestType } from './batchReadWriteRequest';
import BatchReadWriteResponse from './batchReadWriteResponse';
import BatchReadWriteServiceResponse from './batchReadWriteServiceResponse';
import DynamoDbAtomicTransactionService from './dynamoDbAtomicTransactionService';
import DynamoDbDataService from './dynamoDbDataService';

import sinon = require('sinon');
import DynamoDB = require('aws-sdk/clients/dynamodb');

describe('updateResource', () => {
    test('Successfully update resource', async () => {
        // BUILD
        const id = '8cafa46d-08b4-4ee4-b51b-803e20ae8126';
        const resource = {
            resourceType: 'Patient',
            id,
            name: [
                {
                    family: 'Jameson',
                    given: ['Matt'],
                },
            ],
            gender: 'male',
        };

        const versionId = 2;
        const batchReadWriteResponse: BatchReadWriteResponse = {
            id,
            versionId,
            resourceType: 'Patient',
            type: BatchReadWriteRequestType.UPDATE,
            resource: {},
            lastModified: '2020-06-18T20:20:12.763Z',
        };

        const batchReadWriteServiceResponse = new BatchReadWriteServiceResponse(true, '', [batchReadWriteResponse]);

        sinon
            .stub(DynamoDbAtomicTransactionService.prototype, 'atomicallyReadWriteResources')
            .returns(Promise.resolve(batchReadWriteServiceResponse));

        const dynamoDbDataService = new DynamoDbDataService(new DynamoDB());

        // OPERATE
        const serviceResponse = await dynamoDbDataService.updateResource('Patient', id, resource);

        // CHECK
        const expectedResource: any = { ...resource };
        expectedResource.meta = {
            versionId: versionId.toString(),
            lastUpdated: expect.stringMatching(utcTimeRegExp),
        };

        expect(serviceResponse.success).toEqual(true);
        expect(serviceResponse.message).toEqual('Resource updated');
        expect(serviceResponse.resource).toMatchObject(expectedResource);
    });
});
