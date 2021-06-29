/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import axios, { AxiosInstance } from 'axios';
import waitForExpect from 'wait-for-expect';
import { cloneDeep } from 'lodash';
import { Chance } from 'chance';
import {
    expectResourceToBeInBundle,
    expectResourceToBePartOfSearchResults,
    expectResourceToNotBeInBundle,
    getFhirClient,
    randomPatient,
    waitForResourceToBeSearchable,
} from './utils';
import { CapabilityStatement } from './types';

jest.setTimeout(60 * 1000);

describe('Implementation Guides - US Core', () => {
    let client: AxiosInstance;
    beforeAll(async () => {
        client = await getFhirClient();
    });

    function getResourcesWithSupportedProfile(capStatement: CapabilityStatement) {
        const resourcesWithSupportedProfile: Record<string, string[]> = {};
        capStatement.rest[0].resource
            .filter(resource => {
                return resource.supportedProfile;
            })
            .forEach(resource => {
                if (resource.type) {
                    resourcesWithSupportedProfile[resource.type] = resource.supportedProfile!.sort();
                }
            });

        return resourcesWithSupportedProfile;
    }

    test('capability statement includes search parameters, supportedProfile, and operations', async () => {
        const actualCapabilityStatement: CapabilityStatement = (await client.get('metadata')).data;

        const usCorePatientSearchParams = actualCapabilityStatement.rest[0].resource
            .filter(resource => resource.type === 'Patient')
            .flatMap(resource => resource.searchParam ?? [])
            .filter(searchParam =>
                searchParam.definition.startsWith('http://hl7.org/fhir/us/core/SearchParameter/us-core'),
            );

        // Check for expected search params
        expect(usCorePatientSearchParams).toEqual(
            // There are many more search parameters in US Core but they are all loaded into FWoA in the same way.
            // Checking only a few of them is good enough
            expect.arrayContaining([
                {
                    name: 'ethnicity',
                    definition: 'http://hl7.org/fhir/us/core/SearchParameter/us-core-ethnicity',
                    type: 'token',
                    documentation: 'Returns patients with an ethnicity extension matching the specified code.',
                },
                {
                    name: 'race',
                    definition: 'http://hl7.org/fhir/us/core/SearchParameter/us-core-race',
                    type: 'token',
                    documentation: 'Returns patients with a race extension matching the specified code.',
                },
                {
                    name: 'given',
                    definition: 'http://hl7.org/fhir/us/core/SearchParameter/us-core-patient-given',
                    type: 'string',
                    documentation:
                        'A portion of the given name of the patient<br />\n' +
                        '<em>NOTE</em>: This US Core SearchParameter definition extends the usage context of\n' +
                        '<a href="http://hl7.org/fhir/R4/extension-capabilitystatement-expectation.html">capabilitystatement-expectation</a>\n' +
                        ' extension to formally express implementer conformance expectations for these elements:<br />\n' +
                        ' - multipleAnd<br />\n' +
                        ' - multipleOr<br />\n' +
                        ' - comparator<br />\n' +
                        ' - modifier<br />\n' +
                        ' - chain<br />\n' +
                        '\n' +
                        ' ',
                },
            ]),
        );

        const actualResourcesWithSupportedProfile: Record<string, string[]> = getResourcesWithSupportedProfile(
            actualCapabilityStatement,
        );

        const expectedCapStatement: CapabilityStatement = (
            await axios.get('https://www.hl7.org/fhir/us/core/CapabilityStatement-us-core-server.json')
        ).data;

        const expectedResourcesWithSupportedProfile: Record<string, string[]> = getResourcesWithSupportedProfile(
            expectedCapStatement,
        );

        // Check for expected supportedProfile
        expect(actualResourcesWithSupportedProfile).toEqual(expectedResourcesWithSupportedProfile);

        const usCoreDocumentReference = actualCapabilityStatement.rest[0].resource.find(
            resource => resource.type === 'DocumentReference',
        );

        // Check for docref operation
        expect(usCoreDocumentReference).toMatchObject({
            operation: [
                {
                    name: 'docref',
                    definition: 'http://hl7.org/fhir/us/core/OperationDefinition/docref',
                    documentation:
                        "This operation is used to return all the references to documents related to a patient. \n\n The operation takes the optional input parameters: \n  - patient id\n  - start date\n  - end date\n  - document type \n\n and returns a [Bundle](http://hl7.org/fhir/bundle.html) of type \"searchset\" containing [US Core DocumentReference Profiles](http://hl7.org/fhir/us/core/StructureDefinition/us-core-documentreference) for the patient. If the server has or can create documents that are related to the patient, and that are available for the given user, the server returns the DocumentReference profiles needed to support the records.  The principle intended use for this operation is to provide a provider or patient with access to their available document information. \n\n This operation is *different* from a search by patient and type and date range because: \n\n 1. It is used to request a server *generate* a document based on the specified parameters. \n\n 1. If no parameters are specified, the server SHALL return a DocumentReference to the patient's most current CCD \n\n 1. If the server cannot *generate* a document based on the specified parameters, the operation will return an empty search bundle. \n\n This operation is the *same* as a FHIR RESTful search by patient,type and date range because: \n\n 1. References for *existing* documents that meet the requirements of the request SHOULD also be returned unless the client indicates they are only interested in 'on-demand' documents using the *on-demand* parameter.\n\n This server does not generate documents on-demand",
                },
            ],
        });
    });

    const ethnicityCode = '2148-5';
    const raceCode = '2106-3';
    function getRandomPatientWithEthnicityAndRace() {
        const patient = {
            ...randomPatient(),
            ...{
                extension: [
                    {
                        extension: [
                            {
                                url: 'ombCategory',
                                valueCoding: {
                                    system: 'urn:oid:2.16.840.1.113883.6.238',
                                    code: raceCode,
                                    display: 'White',
                                },
                            },
                            {
                                url: 'text',
                                valueString: 'Caucasian',
                            },
                        ],
                        url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
                    },
                    {
                        extension: [
                            {
                                url: 'detailed',
                                valueCoding: {
                                    system: 'urn:oid:2.16.840.1.113883.6.238',
                                    code: ethnicityCode,
                                    display: 'Mexican',
                                },
                            },
                            {
                                url: 'text',
                                valueString: 'Hispanic',
                            },
                        ],
                        url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
                    },
                ],
            },
        };
        return patient;
    }

    const noTextFieldErrorResponse = {
        status: 400,
        data: {
            resourceType: 'OperationOutcome',
            text: {
                status: 'generated',
                div:
                    '<div xmlns="http://www.w3.org/1999/xhtml"><h1>Operation Outcome</h1><table border="0"><tr><td style="font-weight: bold;">error</td><td>[]</td><td><pre>Patient.extension[0].extension[1] - The property extension must be an Array, not null (at Patient.extension[0].extension[1])\nPatient.extension[1].extension[1] - The property extension must be an Array, not null (at Patient.extension[1].extension[1])\nPatient.extension[0] - Extension.extension:text: minimum required = 1, but only found 0 (from http://hl7.org/fhir/us/core/StructureDefinition/us-core-race)\nPatient.extension[1] - Extension.extension:text: minimum required = 1, but only found 0 (from http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity)</pre></td></tr></table></div>',
            },
            issue: [
                {
                    severity: 'error',
                    code: 'invalid',
                    diagnostics:
                        'Patient.extension[0].extension[1] - The property extension must be an Array, not null (at Patient.extension[0].extension[1])\nPatient.extension[1].extension[1] - The property extension must be an Array, not null (at Patient.extension[1].extension[1])\nPatient.extension[0] - Extension.extension:text: minimum required = 1, but only found 0 (from http://hl7.org/fhir/us/core/StructureDefinition/us-core-race)\nPatient.extension[1] - Extension.extension:text: minimum required = 1, but only found 0 (from http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity)',
                },
            ],
        },
    };

    describe('Updating patient', () => {
        let patientId = '';
        beforeAll(async () => {
            const patient = getRandomPatientWithEthnicityAndRace();
            const { data } = await client.post('Patient', patient);
            patientId = data.id;
        });

        test('valid US Core patient', async () => {
            const patient = getRandomPatientWithEthnicityAndRace();
            patient.id = patientId;

            await expect(client.put(`Patient/${patientId}`, patient)).resolves.toMatchObject({
                status: 200,
                data: patient,
            });
        });

        test('invalid US Core patient: no text field', async () => {
            const patient = getRandomPatientWithEthnicityAndRace();
            patient.id = patientId;

            // Remove text field
            delete patient.extension[0].extension[1];
            delete patient.extension[1].extension[1];

            await expect(client.put(`Patient/${patientId}`, patient)).rejects.toMatchObject({
                response: noTextFieldErrorResponse,
            });
        });
    });

    describe('Creating patient', () => {
        test('valid US Core patient', async () => {
            const patient = getRandomPatientWithEthnicityAndRace();

            const expectedPatient: any = cloneDeep(patient);
            delete expectedPatient.id;
            await expect(client.post('Patient', patient)).resolves.toMatchObject({
                status: 201,
                data: expectedPatient,
            });
        });

        test('invalid US Core patient: no text field', async () => {
            const patient = getRandomPatientWithEthnicityAndRace();
            // Remove text field
            delete patient.extension[0].extension[1];
            delete patient.extension[1].extension[1];
            await expect(client.post('Patient', patient)).rejects.toMatchObject({
                response: noTextFieldErrorResponse,
            });
        });
    });

    test('query using search parameters', async () => {
        const patient = getRandomPatientWithEthnicityAndRace();

        const testPatient: ReturnType<typeof randomPatient> = (await client.post('Patient', patient)).data;

        // wait for the patient to be asynchronously written to ES
        await waitForExpect(
            expectResourceToBePartOfSearchResults.bind(
                null,
                client,
                {
                    url: 'Patient',
                    params: {
                        _id: testPatient.id,
                    },
                },
                testPatient,
            ),
            20000,
            3000,
        );

        const p = (params: any) => ({ url: 'Patient', params });
        const testsParams = [
            p({ race: raceCode, name: testPatient.name[0].family }),
            p({ ethnicity: ethnicityCode, name: testPatient.name[0].family }),
            p({ given: testPatient.name[0].given[0] }), // US Core "given" is functionally the same as the base FHIR "given"
        ];

        // run tests serially for easier debugging and to avoid throttling
        // eslint-disable-next-line no-restricted-syntax
        for (const testParams of testsParams) {
            // eslint-disable-next-line no-await-in-loop
            await expectResourceToBePartOfSearchResults(client, testParams, testPatient);
        }
    });

    describe('$docref', () => {
        const basicDocumentReference = () => ({
            subject: {
                reference: 'Patient/lala',
            },
            content: [
                {
                    attachment: {
                        url: '/Binary/1-note',
                    },
                },
            ],
            type: {
                coding: [
                    {
                        system: 'http://loinc.org',
                        code: '34133-9',
                        display: 'Summary of episode note',
                    },
                ],
            },
            context: {
                period: {
                    start: '2020-12-10T00:00:00Z',
                    end: '2021-12-20T00:00:00Z',
                },
            },
            id: '8dc58795-be85-4786-9538-6835eb2bf7b8',
            resourceType: 'DocumentReference',
            status: 'current',
        });
        let patientRef: string;
        let latestCCDADocRef: any;
        let oldCCDADocRef: any;
        let otherTypeDocRef: any;

        beforeAll(async () => {
            const chance = new Chance();
            patientRef = `Patient/${chance.word({ length: 15 })}`;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            latestCCDADocRef = (
                await client.post('DocumentReference', {
                    ...basicDocumentReference(),
                    subject: {
                        reference: patientRef,
                    },
                    context: {
                        period: {
                            start: '2020-12-10T00:00:00Z',
                            end: '2020-12-20T00:00:00Z',
                        },
                    },
                })
            ).data;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            oldCCDADocRef = (
                await client.post('DocumentReference', {
                    ...basicDocumentReference(),
                    subject: {
                        reference: patientRef,
                    },
                    context: {
                        period: {
                            start: '2010-12-10T00:00:00Z',
                            end: '2010-12-20T00:00:00Z',
                        },
                    },
                })
            ).data;

            otherTypeDocRef = (
                await client.post('DocumentReference', {
                    ...basicDocumentReference(),
                    subject: {
                        reference: patientRef,
                    },
                    type: {
                        coding: [
                            {
                                system: 'http://fwoa-codes.org',
                                code: '1111',
                            },
                        ],
                    },
                })
            ).data;

            // wait for resource to be asynchronously written to ES
            await waitForResourceToBeSearchable(client, otherTypeDocRef);
        });

        test('minimal params', async () => {
            const docrefResponse = (await client.get('DocumentReference/$docref', { params: { patient: patientRef } }))
                .data;

            expectResourceToBeInBundle(latestCCDADocRef, docrefResponse);

            expectResourceToNotBeInBundle(oldCCDADocRef, docrefResponse);
            expectResourceToNotBeInBundle(otherTypeDocRef, docrefResponse);
        });

        test('date params', async () => {
            const docrefResponse = (
                await client.get('DocumentReference/$docref', {
                    params: { patient: patientRef, start: '1999-01-01', end: '2030-01-01' },
                })
            ).data;

            expectResourceToBeInBundle(latestCCDADocRef, docrefResponse);
            expectResourceToBeInBundle(oldCCDADocRef, docrefResponse);

            expectResourceToNotBeInBundle(otherTypeDocRef, docrefResponse);
        });

        test('POST document type params', async () => {
            const docrefResponse = (
                await client.post('DocumentReference/$docref', {
                    resourceType: 'Parameters',
                    parameter: [
                        {
                            name: 'patient',
                            valueId: patientRef,
                        },
                        {
                            name: 'codeableConcept',
                            valueCodeableConcept: {
                                coding: {
                                    system: 'http://fwoa-codes.org',
                                    code: '1111',
                                },
                            },
                        },
                    ],
                })
            ).data;

            expectResourceToBeInBundle(otherTypeDocRef, docrefResponse);
        });

        test('missing required params', async () => {
            await expect(() => client.get('DocumentReference/$docref')).rejects.toMatchObject({
                response: { status: 400 },
            });
        });

        test('bad extra params', async () => {
            await expect(() =>
                client.get('DocumentReference/$docref', { params: { patient: patientRef, someBadParam: 'someValue' } }),
            ).rejects.toMatchObject({
                response: { status: 400 },
            });
        });
    });
});
