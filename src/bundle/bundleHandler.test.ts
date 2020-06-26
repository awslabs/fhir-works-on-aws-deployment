// eslint-disable-next-line import/extensions
import uuidv4 from 'uuid/v4';
import DynamoDbDataService from '../dataServices/ddb/__mocks__/dynamoDbDataService';
import BundleHandler from './bundleHandler';
import { MAX_BUNDLE_ENTRIES, VERSION } from '../constants';
import OperationsGenerator from '../operationsGenerator';
import { uuidRegExp, utcTimeRegExp } from '../regExpressions';
import { clone } from '../common/utilities';
import RBACHandler from '../authorization/RBACHandler';
import RBACRules from '../authorization/RBACRules';

const sampleBundleRequestJSON = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: [],
};

const noGroupsAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwibmFtZSI6Im5vdCByZWFsIiwiaWF0IjoxNTE2MjM5MDIyfQ.kCA912Pb__JP54WjgZOazu1x8w5KU-kL0iRwQEVFNPw';
const nonPractAndAuditorAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiY29nbml0bzpncm91cHMiOlsibm9uLXByYWN0aXRpb25lciIsImF1ZGl0b3IiXSwibmFtZSI6Im5vdCByZWFsIiwiaWF0IjoxNTE2MjM5MDIyfQ.HBNrpqQZPvj43qv1QNFr5u9PoHrtqK4ApsRpN2t7Rz8';
const practitionerAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiY29nbml0bzpncm91cHMiOlsicHJhY3RpdGlvbmVyIl0sIm5hbWUiOiJub3QgcmVhbCIsImlhdCI6MTUxNjIzOTAyMn0.bhZZ2O8Vph5aiPfs1n34Enw0075Tt4Cnk2FL2C3mHaQ';

const authService = new RBACHandler(RBACRules);

const bundleHandlerR4 = new BundleHandler(DynamoDbDataService, authService, VERSION.R4_0_1, 'https://API_URL.com');
const bundleHandlerR3 = new BundleHandler(DynamoDbDataService, authService, VERSION.R3_0_1, 'https://API_URL.com');

const sampleCrudEntries = [
    {
        fullUrl: 'urn:uuid:8cafa46d-08b4-4ee4-b51b-803e20ae8126',
        resource: {
            resourceType: 'Patient',
            id: '8cafa46d-08b4-4ee4-b51b-803e20ae8126',
            name: [
                {
                    family: 'Jameson',
                    given: ['Matt'],
                },
            ],
            gender: 'male',
        },
        request: {
            method: 'PUT',
            url: 'Patient/8cafa46d-08b4-4ee4-b51b-803e20ae8126',
        },
    },
    {
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
        request: {
            method: 'POST',
            url: 'Patient',
        },
    },
    {
        request: {
            method: 'GET',
            url: 'Patient/47135b80-b721-430b-9d4b-1557edc64947',
        },
    },
    {
        request: {
            method: 'DELETE',
            url: 'Patient/bce8411e-c15e-448c-95dd-69155a837405',
        },
    },
];

describe('ERROR Cases: Validation of Bundle request', () => {
    beforeEach(() => {
        // Ensures that for each test, we test the assertions in the catch block
        expect.hasAssertions();
    });

    test('Bundle V4 JSON format not correct', async () => {
        try {
            const invalidReadRequest = {
                request: {
                    method: 'GET',
                    url: 'Patient/575fdea9-202d-4a14-9a23-0599dcd01a09',
                    invalidField: 'foo',
                },
            };

            // Cloning
            const bundleRequestJSON = clone(sampleBundleRequestJSON);
            bundleRequestJSON.entry.push(invalidReadRequest);

            await bundleHandlerR4.processTransaction(bundleRequestJSON, practitionerAccessToken);
        } catch (e) {
            expect(e.name).toEqual('BadRequestError');
            expect(e.statusCode).toEqual(400);
            expect(e.errorDetail).toEqual(
                OperationsGenerator.generatInputValidationError(
                    'data.entry[0].request should NOT have additional properties',
                ),
            );
        }
    });

    // V3 schema is very relaxed. It only requires that 'resourceType' is definded in the bundle
    test('Bundle V3 JSON format not correct', async () => {
        try {
            const invalidReadRequest = {
                request: {
                    method: 'GET',
                    url: 'Patient/575fdea9-202d-4a14-9a23-0599dcd01a09',
                    invalidField: 'foo',
                },
            };

            // Cloning
            const bundleRequestJSON = clone(sampleBundleRequestJSON);
            bundleRequestJSON.entry.push(invalidReadRequest);

            delete bundleRequestJSON.resourceType;

            await bundleHandlerR3.processTransaction(bundleRequestJSON, practitionerAccessToken);
        } catch (e) {
            expect(e.name).toEqual('BadRequestError');
            expect(e.statusCode).toEqual(400);
            expect(e.errorDetail).toEqual(
                OperationsGenerator.generatInputValidationError("data should have required property 'resourceType'"),
            );
        }
    });

    test('Bundle request has unsupported operation: SEARCH', async () => {
        try {
            const searchRequest = {
                request: {
                    method: 'GET',
                    url: 'Patient?gender=female',
                },
            };

            // Cloning
            const bundleRequestJSON = clone(sampleBundleRequestJSON);
            bundleRequestJSON.entry.push(searchRequest);

            await bundleHandlerR4.processTransaction(bundleRequestJSON, practitionerAccessToken);
        } catch (e) {
            expect(e.name).toEqual('BadRequestError');
            expect(e.statusCode).toEqual(400);
            expect(e.errorDetail).toEqual(
                OperationsGenerator.generateError('We currently do not support SEARCH entries in the Bundle'),
            );
        }
    });

    test('Bundle request has unsupported operation: VREAD', async () => {
        try {
            const vreadRequest = {
                request: {
                    method: 'GET',
                    url: 'Patient/575fdea9-202d-4a14-9a23-0599dcd01a09/_history/1',
                },
            };

            // Cloning
            const bundleRequestJSON = clone(sampleBundleRequestJSON);
            bundleRequestJSON.entry.push(vreadRequest);

            await bundleHandlerR4.processTransaction(bundleRequestJSON, practitionerAccessToken);
        } catch (e) {
            expect(e.name).toEqual('BadRequestError');
            expect(e.statusCode).toEqual(400);
            expect(e.errorDetail).toEqual(
                OperationsGenerator.generateError('We currently do not support V_READ entries in the Bundle'),
            );
        }
    });

    test('Bundle request has too many entries', async () => {
        // Cloning
        const bundleRequestJSON = clone(sampleBundleRequestJSON);
        for (let i = 0; i < MAX_BUNDLE_ENTRIES + 1; i += 1) {
            const readRequest = {
                request: {
                    method: 'GET',
                    url: `Patient/${uuidv4()}`,
                },
            };
            bundleRequestJSON.entry.push(readRequest);
        }
        try {
            await bundleHandlerR4.processTransaction(bundleRequestJSON, practitionerAccessToken);
        } catch (e) {
            expect(e.name).toEqual('BadRequestError');
            expect(e.statusCode).toEqual(400);
            expect(e.errorDetail).toEqual(
                OperationsGenerator.generateError(
                    `Maximum number of entries for a Bundle is ${MAX_BUNDLE_ENTRIES}. There are currently ${bundleRequestJSON.entry.length} entries in this Bundle`,
                ),
            );
        }
    });

    test('Passing in a batch Bundle type', async () => {
        try {
            const batchRequest = {
                resourceType: 'Bundle',
                type: 'batch',
                entry: [],
            };

            await bundleHandlerR4.processTransaction(batchRequest, practitionerAccessToken);
        } catch (e) {
            expect(e.name).toEqual('BadRequestError');
            expect(e.statusCode).toEqual(400);
            expect(e.errorDetail).toEqual(
                OperationsGenerator.generatInputValidationError(
                    'Currently this server only support transaction Bundles',
                ),
            );
        }
    });
});

describe('SUCCESS Cases: Testing Bundle with CRUD entries', () => {
    test('Handle CRUD requests in a Bundle', async () => {
        // Cloning
        const bundleRequestJSON = clone(sampleBundleRequestJSON);
        bundleRequestJSON.entry = bundleRequestJSON.entry.concat(sampleCrudEntries);

        const actualResult = await bundleHandlerR4.processTransaction(bundleRequestJSON, practitionerAccessToken);

        const expectedResult = {
            resourceType: 'Bundle',
            id: expect.stringMatching(uuidRegExp),
            type: 'transaction-response',
            link: [
                {
                    relation: 'self',
                    url: 'https://API_URL.com',
                },
            ],
            entry: [
                {
                    response: {
                        status: '200 OK',
                        location: 'Patient/8cafa46d-08b4-4ee4-b51b-803e20ae8126',
                        etag: 3,
                        lastModified: '2020-04-23T21:19:35.592Z',
                    },
                },
                {
                    response: {
                        status: '201 Created',
                        location: 'Patient/7c7cf4ca-4ba7-4326-b0dd-f3275b735827',
                        etag: 1,
                        lastModified: expect.stringMatching(utcTimeRegExp),
                    },
                },
                {
                    resource: {
                        active: true,
                        resourceType: 'Patient',
                        birthDate: '1995-09-24',
                        meta: {
                            lastUpdated: expect.stringMatching(utcTimeRegExp),
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
                    response: {
                        status: '200 OK',
                        location: 'Patient/47135b80-b721-430b-9d4b-1557edc64947',
                        etag: 1,
                        lastModified: expect.stringMatching(utcTimeRegExp),
                    },
                },
                {
                    response: {
                        status: '200 OK',
                        location: 'Patient/bce8411e-c15e-448c-95dd-69155a837405',
                        etag: 1,
                        lastModified: expect.stringMatching(utcTimeRegExp),
                    },
                },
            ],
        };
        expect(actualResult).toMatchObject(expectedResult);
    });

    test('Bundle request is empty', async () => {
        const bundleRequestJSON = clone(sampleBundleRequestJSON);

        const actualResult = await bundleHandlerR4.processTransaction(bundleRequestJSON, practitionerAccessToken);

        expect(actualResult).toMatchObject({
            resourceType: 'Bundle',
            id: expect.stringMatching(uuidRegExp),
            type: 'transaction-response',
            link: [
                {
                    relation: 'self',
                    url: 'https://API_URL.com',
                },
            ],
            entry: [],
        });
    });
});

describe('AUTHZ Cases: Validation of Bundle request is allowed', () => {
    beforeEach(() => {
        // Ensures that for each test, we test the assertions in the catch block
        expect.hasAssertions();
    });

    test('Successful read only', async () => {
        // Cloning
        const bundleRequestJSON = clone(sampleBundleRequestJSON);
        bundleRequestJSON.entry = bundleRequestJSON.entry.concat([
            {
                request: {
                    method: 'GET',
                    url: 'Patient/8cafa46d-08b4-4ee4-b51b-803e20ae8126',
                },
            },
        ]);
        const actualResult = await bundleHandlerR4.processTransaction(bundleRequestJSON, nonPractAndAuditorAccessToken);
        // We don't care for the results just that we are able to process them
        expect(actualResult).toBeTruthy();
    });

    test('Missing interaction permission', async () => {
        try {
            // Cloning
            const bundleRequestJSON = clone(sampleBundleRequestJSON);
            bundleRequestJSON.entry = bundleRequestJSON.entry.concat(sampleCrudEntries);

            await bundleHandlerR4.processTransaction(bundleRequestJSON, nonPractAndAuditorAccessToken);
        } catch (e) {
            expect(e.name).toEqual('BadRequestError');
            expect(e.statusCode).toEqual(400);
            expect(e.errorDetail).toEqual('Forbidden');
        }
    });
    test('Missing resource permission', async () => {
        try {
            // Cloning
            const bundleRequestJSON = clone(sampleBundleRequestJSON);
            bundleRequestJSON.entry = bundleRequestJSON.entry.concat([
                {
                    request: {
                        method: 'GET',
                        url: 'Medication/47135b80-b721-430b-9d4b-1557edc64947',
                    },
                },
            ]);

            await bundleHandlerR4.processTransaction(bundleRequestJSON, nonPractAndAuditorAccessToken);
        } catch (e) {
            expect(e.name).toEqual('BadRequestError');
            expect(e.statusCode).toEqual(400);
            expect(e.errorDetail).toEqual('Forbidden');
        }
    });
    test('User is in no group', async () => {
        try {
            // Cloning
            const bundleRequestJSON = clone(sampleBundleRequestJSON);
            bundleRequestJSON.entry = bundleRequestJSON.entry.concat(sampleCrudEntries);

            await bundleHandlerR4.processTransaction(bundleRequestJSON, noGroupsAccessToken);
        } catch (e) {
            expect(e.name).toEqual('BadRequestError');
            expect(e.statusCode).toEqual(400);
            expect(e.errorDetail).toEqual('Forbidden');
        }
    });
});
