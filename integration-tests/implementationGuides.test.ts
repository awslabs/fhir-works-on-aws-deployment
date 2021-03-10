/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import axios, { AxiosInstance } from 'axios';
import waitForExpect from 'wait-for-expect';
import { cloneDeep } from 'lodash';
import { expectResourceToBePartOfSearchResults, getFhirClient, randomPatient } from './utils';
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

    test('capability statement includes search parameters and supportedProfile', async () => {
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
});
