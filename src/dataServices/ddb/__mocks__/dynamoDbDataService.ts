/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars */
import DataServiceInterface from '../../dataServiceInterface';
import ServiceResponse from '../../../common/serviceResponse';
import { generateMeta } from '../../../common/resourceMeta';
import validPatient from '../../../../sampleData/validV4Patient.json';
import BatchReadWriteRequest, { BatchReadWriteRequestType } from '../batchReadWriteRequest';
import BatchReadWriteServiceResponse from '../batchReadWriteServiceResponse';
import BatchReadWriteResponse from '../batchReadWriteResponse';

const DynamoDbDataService: DataServiceInterface = class {
    static async createResource(resourceType: string, id: string, resource: any): Promise<ServiceResponse> {
        const resourceCopy: any = { ...resource };
        resourceCopy.id = id;
        resourceCopy.meta = generateMeta(1);
        return Promise.resolve(new ServiceResponse(true, 'Resource putted', resourceCopy));
    }

    static async updateResource(resourceType: string, id: string, resource: any): Promise<ServiceResponse> {
        const resourceCopy: any = { ...resource };
        resourceCopy.id = id;
        resourceCopy.meta = generateMeta(2);
        return Promise.resolve(new ServiceResponse(true, 'Resource putted', resourceCopy));
    }

    static async getResource(resourceType: string, id: string): Promise<ServiceResponse> {
        const resourceCopy: any = { ...validPatient };
        resourceCopy.id = id;
        resourceCopy.meta = generateMeta(1);
        return Promise.resolve(new ServiceResponse(true, 'Resource found', resourceCopy));
    }

    static async getVersionedResource(resourceType: string, id: string, versionId: string): Promise<ServiceResponse> {
        const resourceCopy: any = { ...validPatient };
        resourceCopy.id = id;
        resourceCopy.meta = generateMeta(parseInt(versionId, 10));
        return Promise.resolve(new ServiceResponse(true, 'Resource found', resourceCopy));
    }

    static async deleteResource(resourceType: string, id: string): Promise<ServiceResponse> {
        return Promise.resolve(
            new ServiceResponse(true, `Successfully deleted ResourceType: ${resourceType}, Id: ${id}`, {
                count: 3,
            }),
        );
    }

    static async deleteVersionedResource(
        resourceType: string,
        id: string,
        versionId: string,
    ): Promise<ServiceResponse> {
        return Promise.resolve(
            new ServiceResponse(
                true,
                `Successfully deleted ResourceType: ${resourceType}, Id: ${id}, VersionId: ${versionId}`,
                { count: 1 },
            ),
        );
    }

    static async atomicallyReadWriteResources(
        requests: BatchReadWriteRequest[],
    ): Promise<BatchReadWriteServiceResponse> {
        if (requests.length === 0) {
            return new BatchReadWriteServiceResponse(true, 'No requests to process', []);
        }

        const bundleEntryResponses: BatchReadWriteResponse[] = [
            {
                id: '8cafa46d-08b4-4ee4-b51b-803e20ae8126',
                versionId: 3,
                type: BatchReadWriteRequestType.UPDATE,
                lastModified: '2020-04-23T21:19:35.592Z',
                resourceType: 'Patient',
                resource: {},
            },
            {
                id: '7c7cf4ca-4ba7-4326-b0dd-f3275b735827',
                versionId: 1,
                type: BatchReadWriteRequestType.CREATE,
                lastModified: '2020-04-23T21:19:35.592Z',
                resourceType: 'Patient',
                resource: {},
            },
            {
                id: '47135b80-b721-430b-9d4b-1557edc64947',
                versionId: 1,
                type: BatchReadWriteRequestType.READ,
                lastModified: '2020-04-10T20:41:39.912Z',
                resource: {
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
                    id: '47135b80-b721-430b-9d4b-1557edc64947',
                    name: [
                        {
                            family: 'Langard',
                            given: ['Abby'],
                        },
                    ],
                    gender: 'female',
                },
                resourceType: 'Patient',
            },
            {
                id: 'bce8411e-c15e-448c-95dd-69155a837405',
                versionId: 1,
                type: BatchReadWriteRequestType.DELETE,
                lastModified: '2020-04-23T21:19:35.593Z',
                resource: {},
                resourceType: 'Patient',
            },
        ];
        return Promise.resolve(
            new BatchReadWriteServiceResponse(true, 'Successfully committed requests to DB', bundleEntryResponses),
        );
    }
};
export default DynamoDbDataService;
