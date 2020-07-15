// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWSMock from 'aws-sdk-mock';
// eslint-disable-next-line import/extensions
import { QueryInput } from 'aws-sdk/clients/dynamodb';
import * as AWS from 'aws-sdk';
// eslint-disable-next-line import/no-extraneous-dependencies
import { BundleResponse, BatchReadWriteResponse } from 'aws-fhir-interface';
// eslint-disable-next-line import/no-extraneous-dependencies
import sinon from 'sinon';
import { utcTimeRegExp } from '../../testUtilities/regExpressions';
import { DynamoDbBundleService } from './dynamoDbBundleService';
import { DynamoDbDataService } from './dynamoDbDataService';
import { DynamoDBConverter } from './dynamoDb';
import DynamoDbUtil from './dynamoDbUtil';

describe('updateResource', () => {
    beforeAll(async done => {
        console.log('ttest11');
        // get requires env vars
        done();
    });

    beforeEach(() => {
        console.log('ttest22');
        AWSMock.setSDKInstance(AWS);
    });

    afterEach(() => {
        AWSMock.restore();
    });

    test('Successfully update resource', async () => {
        console.log('ttest33');

        // BUILD
        const id = '8cafa46d-08b4-4ee4-b51b-803e20ae8126';
        const resource = {
            id: DynamoDbUtil.generateFullId(id, '1'),
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
