/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import uuidv4 from 'uuid/v4';
import DynamoDbDataService from '../../persistence/dataServices/__mocks__/dynamoDbDataService';
import DynamoDbBundleService from '../../persistence/dataServices/__mocks__/dynamoDbBundleService';
import BundleHandler from './bundleHandler';
import { MAX_BUNDLE_ENTRIES, SUPPORTED_R3_RESOURCES, SUPPORTED_R4_RESOURCES } from '../../constants';
import OperationsGenerator from '../operationsGenerator';
import { uuidRegExp, utcTimeRegExp } from '../../regExpressions';
import { clone } from '../../interface/utilities';
import RBACHandler from '../../authorization/RBACHandler';
import RBACRules from '../../authorization/RBACRules';
import { GenericResource, Resources } from '../../interface/fhirConfig';
import stubs from '../../stubs';
import { FhirVersion } from '../../interface/constants';
import ConfigHandler from '../../configHandler';
import { fhirConfig } from '../../config';
import InvalidResourceError from '../../interface/errors/InvalidResourceError';

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
const genericResource: GenericResource = {
    operations: ['create', 'read', 'update', 'delete'],
    fhirVersions: ['3.0.1', '4.0.1'],
    persistence: DynamoDbDataService,
    typeHistory: stubs.history,
    typeSearch: stubs.search,
};
const resources = {};

const getSupportedGenericResources = (
    genRes: GenericResource,
    supportedResources: string[],
    fhirVersion: FhirVersion,
): string[] => {
    const customFhirConfig = clone(fhirConfig);
    customFhirConfig.profile.genericResource = genRes;
    const configHandler = new ConfigHandler(customFhirConfig, supportedResources);
    return configHandler.getGenericResources(fhirVersion);
};

const bundleHandlerR4 = new BundleHandler(
    DynamoDbBundleService,
    'https://API_URL.com',
    '4.0.1',
    authService,
    getSupportedGenericResources(genericResource, SUPPORTED_R4_RESOURCES, '4.0.1'),
    genericResource,
    resources,
);

const bundleHandlerR3 = new BundleHandler(
    DynamoDbBundleService,
    'https://API_URL.com',
    '3.0.1',
    authService,
    getSupportedGenericResources(genericResource, SUPPORTED_R3_RESOURCES, '3.0.1'),
    genericResource,
    resources,
);

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
    test('Batch processing', async () => {
        try {
            // Cloning
            const bundleRequestJSON = clone(sampleBundleRequestJSON);

            await bundleHandlerR4.processBatch(bundleRequestJSON, practitionerAccessToken);
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
            expect(e).toEqual(new InvalidResourceError('data.entry[0].request should NOT have additional properties'));
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
            expect(e).toEqual(new InvalidResourceError("data should have required property 'resourceType'"));
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
                        etag: '3',
                        lastModified: '2020-04-23T21:19:35.592Z',
                    },
                },
                {
                    response: {
                        status: '201 Created',
                        location: 'Patient/7c7cf4ca-4ba7-4326-b0dd-f3275b735827',
                        etag: '1',
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
                        etag: '1',
                        lastModified: expect.stringMatching(utcTimeRegExp),
                    },
                },
                {
                    response: {
                        status: '200 OK',
                        location: 'Patient/bce8411e-c15e-448c-95dd-69155a837405',
                        etag: '1',
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

    test('Missing operation permission', async () => {
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

describe('SERVER-CAPABILITIES Cases: Validating Bundle request is allowed given server capabilities', () => {
    beforeEach(() => {
        // Ensures that for each test, we test the assertions in the catch block
        expect.hasAssertions();
    });

    const bundleRequestJsonCreatePatient = clone(sampleBundleRequestJSON);
    bundleRequestJsonCreatePatient.entry = [
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
    ];

    // validator.ts doesn't validate Fhir V3 correctly, therefore the tests below will fail if we try to run them with
    // Fhir v3.
    const fhirfhirVersions: FhirVersion[] = ['4.0.1'];
    fhirfhirVersions.forEach((version: FhirVersion) => {
        const supportedResource = version === '4.0.1' ? SUPPORTED_R4_RESOURCES : SUPPORTED_R3_RESOURCES;
        test(`FhirVersion: ${version}. Failed to operate on Bundle because server does not support Generic Resource for Patient  with operation Create`, async () => {
            // BUILD
            const genericResourceReadOnly: GenericResource = {
                operations: ['read'],
                fhirVersions: [version],
                persistence: DynamoDbDataService,
                typeHistory: stubs.history,
                typeSearch: stubs.search,
            };

            const bundleHandlerReadGenericResource = new BundleHandler(
                DynamoDbBundleService,
                'https://API_URL.com',
                version,
                authService,
                getSupportedGenericResources(genericResourceReadOnly, supportedResource, version),
                genericResourceReadOnly,
                resources,
            );

            try {
                // OPERATE
                await bundleHandlerReadGenericResource.processTransaction(
                    bundleRequestJsonCreatePatient,
                    practitionerAccessToken,
                );
            } catch (e) {
                // CHECK
                expect(e.name).toEqual('BadRequestError');
                expect(e.statusCode).toEqual(400);
                expect(e.errorDetail).toEqual(
                    OperationsGenerator.generateError(
                        'Server does not support these resource and operations: {Patient: create}',
                    ),
                );
            }
        });

        test(`FhirVersion: ${version}. Failed to operate on Bundle because server does not support Generic Resource for Patient`, async () => {
            // BUILD
            const genericResourceExcludePatient: GenericResource = {
                operations: ['create', 'read', 'update', 'delete'],
                fhirVersions: [version],
                persistence: DynamoDbDataService,
                typeHistory: stubs.history,
                typeSearch: stubs.search,
            };
            if (version === '4.0.1') {
                genericResourceExcludePatient.excludedR4Resources = ['Patient'];
            } else {
                genericResourceExcludePatient.excludedR3Resources = ['Patient'];
            }

            const bundleHandlerExcludePatient = new BundleHandler(
                DynamoDbBundleService,
                'https://API_URL.com',
                version,
                authService,
                getSupportedGenericResources(genericResourceExcludePatient, supportedResource, version),
                genericResourceExcludePatient,
                resources,
            );

            try {
                // OPERATE
                await bundleHandlerExcludePatient.processTransaction(
                    bundleRequestJsonCreatePatient,
                    practitionerAccessToken,
                );
            } catch (e) {
                // CHECK
                expect(e.name).toEqual('BadRequestError');
                expect(e.statusCode).toEqual(400);
                expect(e.errorDetail).toEqual(
                    OperationsGenerator.generateError(
                        'Server does not support these resource and operations: {Patient: create}',
                    ),
                );
            }
        });

        // For now, entries in Bundle must be generic resource, because only one persistence obj can be passed into
        // bundleParser
        test.skip(`FhirVersion: ${version}. Succeed because Generic Resource exclude Patient but Special Resource support Patient`, async () => {
            // BUILD
            const genericResourceExcludePatient: GenericResource = {
                operations: ['create', 'read', 'update', 'delete'],
                fhirVersions: [version],
                persistence: DynamoDbDataService,
                typeHistory: stubs.history,
                typeSearch: stubs.search,
            };
            if (version === '4.0.1') {
                genericResourceExcludePatient.excludedR4Resources = ['Patient'];
            } else {
                genericResourceExcludePatient.excludedR3Resources = ['Patient'];
            }

            const patientResource: Resources = {
                Patient: {
                    operations: ['create'],
                    fhirVersions: [version],
                    persistence: DynamoDbDataService,
                    typeSearch: stubs.search,
                    typeHistory: stubs.history,
                },
            };

            const bundleHandlerSpecialResourcePatient = new BundleHandler(
                DynamoDbBundleService,
                'https://API_URL.com',
                version,
                authService,
                getSupportedGenericResources(genericResourceExcludePatient, supportedResource, version),
                genericResourceExcludePatient,
                patientResource,
            );

            // OPERATE
            const result = await bundleHandlerSpecialResourcePatient.processTransaction(
                bundleRequestJsonCreatePatient,
                practitionerAccessToken,
            );

            // CHECK
            expect(result).toBeTruthy();
        });
        test(`FhirVersion: ${version}. Succeed because Generic Resource does not exclude Patient`, async () => {
            // BUILD
            const genericResourceNoExclusion: GenericResource = {
                operations: ['create', 'read', 'update', 'delete'],
                fhirVersions: [version],
                persistence: DynamoDbDataService,
                typeHistory: stubs.history,
                typeSearch: stubs.search,
            };

            const bundleHandlerNoExclusion = new BundleHandler(
                DynamoDbBundleService,
                'https://API_URL.com',
                version,
                authService,
                getSupportedGenericResources(genericResourceNoExclusion, supportedResource, version),
                genericResourceNoExclusion,
                {},
            );

            // OPERATE
            const result = await bundleHandlerNoExclusion.processTransaction(
                bundleRequestJsonCreatePatient,
                practitionerAccessToken,
            );

            // CHECK
            expect(result).toBeTruthy();
        });
    });
});
