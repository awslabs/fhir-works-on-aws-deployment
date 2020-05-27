/* eslint-disable class-methods-use-this */
import BatchReadWriteRequest, { BatchReadWriteRequestType } from '../dataServices/ddb/batchReadWriteRequest';
import { R4_RESOURCE } from '../constants';
import { DynamoDBConverter } from '../dataServices/ddb/dynamoDb';
import DynamoDbUtil, { DOCUMENT_STATUS_FIELD } from '../dataServices/ddb/dynamoDbUtil';
import DOCUMENT_STATUS from '../dataServices/ddb/documentStatus';
import { timeFromEpochInMsRegExp, utcTimeRegExp, uuidRegExp } from '../regExpressions';
import DynamoDbParamBuilder from '../dataServices/ddb/dynamoDbParamBuilder';

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
            type: BatchReadWriteRequestType.CREATE,
            resourceType: R4_RESOURCE.Patient,
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
            versionId: 1,
            resourceType: R4_RESOURCE.Patient,
            type: BatchReadWriteRequestType.CREATE,
        };

        const expectedStagingResponse = {
            id: expect.stringMatching(uuidRegExp),
            versionId: 1,
            type: BatchReadWriteRequestType.CREATE,
            resourceType: R4_RESOURCE.Patient,
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
            type: BatchReadWriteRequestType.READ,
            resource: `Patient/${id}`,
            fullUrl: '',
            resourceType: 'Patient',
            id,
        };

        const versionId = 1;

        const expectedRequest = {
            Get: {
                TableName: '',
                Key: {
                    resourceType: {
                        S: 'Patient',
                    },
                    id: {
                        S: DynamoDbUtil.generateFullId(id, versionId),
                    },
                },
            },
        };

        const expectedLock: [] = [];
        const expectedStagingResponse = {
            id,
            versionId,
            type: BatchReadWriteRequestType.READ,
            lastModified: '',
            resource: {},
            resourceType: 'Patient',
        };

        const idToVersionId: Record<string, number> = {};
        idToVersionId[id] = versionId;

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
            type: BatchReadWriteRequestType.UPDATE,
            resourceType: R4_RESOURCE.Patient,
            id,
            resource,
            fullUrl: `urn:uuid:${id}`,
        };
        const versionId = 1;
        const expectedUpdateItem: any = { ...resource };
        expectedUpdateItem[DOCUMENT_STATUS_FIELD] = DOCUMENT_STATUS.PENDING;
        expectedUpdateItem.id = DynamoDbUtil.generateFullId(id, versionId + 1);

        const expectedRequest = {
            Put: {
                TableName: '',
                Item: DynamoDBConverter.marshall(expectedUpdateItem),
            },
        };

        const expectedLock = {
            id: expect.stringMatching(uuidRegExp),
            versionId: versionId + 1,
            resourceType: R4_RESOURCE.Patient,
            type: BatchReadWriteRequestType.UPDATE,
        };

        const expectedStagingResponse = {
            id: expect.stringMatching(uuidRegExp),
            versionId: versionId + 1,
            type: BatchReadWriteRequestType.UPDATE,
            resourceType: R4_RESOURCE.Patient,
            resource: {},
            lastModified: expect.stringMatching(utcTimeRegExp),
        };

        const idToVersionId: Record<string, number> = {};
        idToVersionId[id] = versionId;

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
            type: BatchReadWriteRequestType.DELETE,
            resource: `Patient/${id}`,
            fullUrl: '',
            resourceType: 'Patient',
            id,
        };

        const versionId = 1;
        const expectedRequest = DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
            DOCUMENT_STATUS.LOCKED,
            DOCUMENT_STATUS.PENDING_DELETE,
            R4_RESOURCE.Patient,
            DynamoDbUtil.generateFullId(id, versionId),
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
            versionId,
            type: BatchReadWriteRequestType.DELETE,
            lastModified: expect.stringMatching(utcTimeRegExp),
            resource: {},
            resourceType: R4_RESOURCE.Patient,
        };

        const idToVersionId: Record<string, number> = {};
        idToVersionId[id] = versionId;

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
    idToVersionId: Record<string, number>;
}
