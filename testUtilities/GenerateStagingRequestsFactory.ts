/* eslint-disable class-methods-use-this */
import { BatchReadWriteRequest } from '../src/interface/bundle';
import { DynamoDBConverter } from '../src/persistence/dataServices/dynamoDb';
import DynamoDbUtil, { DOCUMENT_STATUS_FIELD } from '../src/persistence/dataServices/dynamoDbUtil';
import DOCUMENT_STATUS from '../src/persistence/dataServices/documentStatus';
import { timeFromEpochInMsRegExp, utcTimeRegExp, uuidRegExp } from '../src/regExpressions';
import DynamoDbParamBuilder from '../src/persistence/dataServices/dynamoDbParamBuilder';
import { ItemRequest } from '../src/persistence/dataServices/dynamoDbBundleServiceHelper';

export default class GenerateStagingRequestsFactory {
    static getCreate(): RequestResult {
        const createResource = {
            resourceType: 'Patient',
            name: [
                {
                    family: 'Jameson',
                    given: ['Matt'],
                },
            ],
            gender: 'male',
        };
        const request = {
            operation: 'create',
            resourceType: 'Patient',
            id: '',
            resource: createResource,
            fullUrl: '',
        };

        const expectedCreateItem: any = { ...createResource };
        expectedCreateItem[DOCUMENT_STATUS_FIELD] = DOCUMENT_STATUS.PENDING;

        const expectedRequest = {
            Put: {
                TableName: '',
                Item: DynamoDBConverter.marshall(expectedCreateItem),
            },
        };

        const expectedLock = {
            id: expect.stringMatching(uuidRegExp),
            vid: '1',
            resourceType: 'Patient',
            operation: 'create',
        };

        const expectedStagingResponse = {
            id: expect.stringMatching(uuidRegExp),
            vid: '1',
            operation: 'create',
            resourceType: 'Patient',
            resource: {},
            lastModified: expect.stringMatching(utcTimeRegExp),
        };
        return {
            request,
            expectedRequest,
            expectedLock,
            expectedStagingResponse,
            idToVersionId: {},
        };
    }

    static getRead(): RequestResult {
        const id = '47135b80-b721-430b-9d4b-1557edc64947';
        const request = {
            operation: 'read',
            resource: `Patient/${id}`,
            fullUrl: '',
            resourceType: 'Patient',
            id,
        };

        const vid = '1';

        const expectedRequest = {
            Get: {
                TableName: '',
                Key: {
                    resourceType: {
                        S: 'Patient',
                    },
                    id: {
                        S: DynamoDbUtil.generateFullId(id, vid),
                    },
                },
            },
        };

        const expectedLock: [] = [];
        const expectedStagingResponse = {
            id,
            vid,
            operation: 'read',
            lastModified: '',
            resource: {},
            resourceType: 'Patient',
        };

        const idToVersionId: Record<string, string> = {};
        idToVersionId[id] = vid;

        return {
            request,
            expectedRequest,
            expectedLock,
            expectedStagingResponse,
            idToVersionId,
        };
    }

    static getUpdate(): RequestResult {
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
        const request: BatchReadWriteRequest = {
            operation: 'update',
            resourceType: 'Patient',
            id,
            resource,
            fullUrl: `urn:uuid:${id}`,
        };
        const vid = '1';
        const nextVid = '2';
        const expectedUpdateItem: any = { ...resource };
        expectedUpdateItem[DOCUMENT_STATUS_FIELD] = DOCUMENT_STATUS.PENDING;
        expectedUpdateItem.id = DynamoDbUtil.generateFullId(id, nextVid);

        const expectedRequest = {
            Put: {
                TableName: '',
                Item: DynamoDBConverter.marshall(expectedUpdateItem),
            },
        };

        const expectedLock: ItemRequest = {
            id: expect.stringMatching(uuidRegExp),
            vid: nextVid,
            resourceType: 'Patient',
            operation: 'update',
            isOriginalUpdateItem: false,
        };

        const expectedStagingResponse = {
            id: expect.stringMatching(uuidRegExp),
            vid: nextVid,
            operation: 'update',
            resourceType: 'Patient',
            resource: {},
            lastModified: expect.stringMatching(utcTimeRegExp),
        };

        const idToVersionId: Record<string, string> = {};
        idToVersionId[id] = vid;

        return {
            request,
            expectedRequest,
            expectedLock,
            expectedStagingResponse,
            idToVersionId,
        };
    }

    static getDelete(): RequestResult {
        const id = 'bce8411e-c15e-448c-95dd-69155a837405';
        const request: BatchReadWriteRequest = {
            operation: 'delete',
            resource: `Patient/${id}`,
            fullUrl: '',
            resourceType: 'Patient',
            id,
        };

        const vid = '1';
        const expectedRequest = DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
            DOCUMENT_STATUS.LOCKED,
            DOCUMENT_STATUS.PENDING_DELETE,
            'Patient',
            DynamoDbUtil.generateFullId(id, vid),
        );

        expectedRequest.Update.ExpressionAttributeValues[':currentTs'].N = expect.stringMatching(
            timeFromEpochInMsRegExp,
        );
        expectedRequest.Update.ExpressionAttributeValues[':futureEndTs'].N = expect.stringMatching(
            timeFromEpochInMsRegExp,
        );

        const expectedLock: [] = [];

        const expectedStagingResponse = {
            id,
            vid,
            operation: 'delete',
            lastModified: expect.stringMatching(utcTimeRegExp),
            resource: {},
            resourceType: 'Patient',
        };

        const idToVersionId: Record<string, string> = {};
        idToVersionId[id] = vid;

        return {
            request,
            expectedRequest,
            expectedLock,
            expectedStagingResponse,
            idToVersionId,
        };
    }
}
interface RequestResult {
    request: any;
    expectedRequest: any;
    expectedLock: any;
    expectedStagingResponse: any;
    idToVersionId: Record<string, string>;
}
