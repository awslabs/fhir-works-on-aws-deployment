// eslint-disable-next-line import/extensions
import uuidv4 from 'uuid/v4';
import { BatchReadWriteRequestType } from '../dataServices/ddb/batchReadWriteRequest';
import { R4_RESOURCE } from '../constants';
import BatchReadWriteResponse from '../dataServices/ddb/batchReadWriteResponse';
import DynamoDbParamBuilder from '../dataServices/ddb/dynamoDbParamBuilder';

export default class GenerateRollbackRequestsFactory {
    static buildBundleEntryResponse(requestType: BatchReadWriteRequestType, versionId: number) {
        let resource = {};
        if (requestType === BatchReadWriteRequestType.READ) {
            resource = {
                active: true,
                resourceType: 'Patient',
                birthDate: '1995-09-24',
                meta: {
                    lastUpdated: '2020-04-10T20:41:39.912Z',
                    versionId: '1',
                },
                managingOrganization: {
                    reference: 'Organization/2.16.840.1.113883.19.5',
                    display: 'Good Health Clinic',
                },
                text: {
                    div: '<div xmlns="http://www.w3.org/1999/xhtml"><p></p></div>',
                    status: 'generated',
                },
                id: '47135b80-b721-430b-9d4b-1557edc64947_1',
                name: [
                    {
                        family: 'Langard',
                        given: ['Abby'],
                    },
                ],
                gender: 'female',
            };
        }
        const id = uuidv4();
        const resourceType = R4_RESOURCE.Patient;
        const bundleEntryResponse: BatchReadWriteResponse = {
            id,
            versionId,
            type: requestType,
            lastModified: '2020-04-23T15:19:35.843Z',
            resourceType,
            resource,
        };

        return bundleEntryResponse;
    }

    static buildExpectedBundleEntryResult(bundleEntryResponse: BatchReadWriteResponse) {
        const requestType = bundleEntryResponse.type;
        const { id, versionId, resourceType } = bundleEntryResponse;

        let expectedResult: any = {};
        if (requestType === BatchReadWriteRequestType.CREATE || requestType === BatchReadWriteRequestType.UPDATE) {
            expectedResult = {
                transactionRequests: [DynamoDbParamBuilder.buildDeleteParam(id, versionId, resourceType)],
                itemsToRemoveFromLock: [
                    {
                        id,
                        versionId,
                        resourceType,
                    },
                ],
            };
        } else if (requestType === BatchReadWriteRequestType.READ || requestType === BatchReadWriteRequestType.DELETE) {
            expectedResult = { transactionRequests: [], itemsToRemoveFromLock: [] };
        }
        return expectedResult;
    }
}
