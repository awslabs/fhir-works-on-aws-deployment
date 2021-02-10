/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { AxiosInstance } from 'axios';
import waitForExpect from 'wait-for-expect';
import { Chance } from 'chance';
import { expectResourceToBePartOfSearchResults, getFhirClient, randomPatient } from './utils';
import { CapabilityStatement } from './types';

jest.setTimeout(60 * 1000);

describe('Implementation Guides - US Core', () => {
    let client: AxiosInstance;
    beforeAll(async () => {
        client = await getFhirClient();
    });
    test('capability statement includes search parameters', async () => {
        const capabilityStatement: CapabilityStatement = (await client.get('metadata')).data;

        const usCorePatientSearchParams = capabilityStatement.rest[0].resource
            .filter(x => x.type === 'Patient')
            .flatMap(x => x.searchParam ?? [])
            .filter(x => x.definition.startsWith('http://hl7.org/fhir/us/core/SearchParameter/us-core'));

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

        // console.log(usCorePatientSearchParams);
    });

    test('query using search parameters', async () => {
        const chance = new Chance();
        const raceCode = chance.word({ length: 15 });
        const ethnicityCode = chance.word({ length: 15 });
        const usCorePatient = {
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
                        ],
                        url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
                    },
                ],
            },
        };

        const testPatient: ReturnType<typeof randomPatient> = (await client.post('Patient', usCorePatient)).data;

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
            p({ race: raceCode }),
            p({ ethnicity: ethnicityCode }),
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
