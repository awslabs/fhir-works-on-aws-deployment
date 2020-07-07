/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Bundle,
    BatchReadWriteResponse,
    BundleResponse,
    BatchRequest,
    TransactionRequest,
} from '../../../interface/bundle';

const DynamoDbBundleService: Bundle = class {
    static batch(request: BatchRequest): Promise<BundleResponse> {
        throw new Error('Method not implemented.');
    }

    static async transaction(request: TransactionRequest): Promise<BundleResponse> {
        if (request.requests.length === 0) {
            return {
                success: true,
                message: 'No requests to process',
                batchReadWriteResponses: [],
            };
        }

        const bundleEntryResponses: BatchReadWriteResponse[] = [
            {
                id: '8cafa46d-08b4-4ee4-b51b-803e20ae8126',
                vid: '3',
                operation: 'update',
                lastModified: '2020-04-23T21:19:35.592Z',
                resourceType: 'Patient',
                resource: {},
            },
            {
                id: '7c7cf4ca-4ba7-4326-b0dd-f3275b735827',
                vid: '1',
                operation: 'create',
                lastModified: '2020-04-23T21:19:35.592Z',
                resourceType: 'Patient',
                resource: {},
            },
            {
                id: '47135b80-b721-430b-9d4b-1557edc64947',
                vid: '1',
                operation: 'read',
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
                vid: '1',
                operation: 'delete',
                lastModified: '2020-04-23T21:19:35.593Z',
                resource: {},
                resourceType: 'Patient',
            },
        ];
        return {
            success: true,
            message: 'Successfully committed requests to DB',
            batchReadWriteResponses: bundleEntryResponses,
        };
    }
};
export default DynamoDbBundleService;
