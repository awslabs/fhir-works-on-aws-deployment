/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { AxiosInstance } from 'axios';
import {
    aFewMinutesAgoAsDate,
    expectResourceToBePartOfSearchResults,
    expectResourceToNotBePartOfSearchResults,
    getFhirClient,
    randomPatient,
    waitForResourceToBeSearchable,
} from './utils';

jest.setTimeout(600 * 1000);

describe('search', () => {
    let client: AxiosInstance;
    beforeAll(async () => {
        client = await getFhirClient();
    });
    test('search for various valid parameters', async () => {
        const testPatient: ReturnType<typeof randomPatient> = (await client.post('Patient', randomPatient())).data;

        // wait for the patient to be asynchronously written to ES
        await waitForResourceToBeSearchable(client, testPatient);

        const aFewMinutesAgo = aFewMinutesAgoAsDate();

        const p = (params: any) => ({ url: 'Patient', params: { _lastUpdated: `ge${aFewMinutesAgo}`, ...params } });
        const testsParams = [
            p({ 'address-city': testPatient.address[0].city }),
            p({ 'address-country': testPatient.address[0].country }),
            p({ 'address-postalcode': testPatient.address[0].postalCode }),
            p({ family: testPatient.name[0].family }),
            p({ given: testPatient.name[0].given[0] }),
            p({ name: testPatient.name[0].given[0] }),
            p({ gender: testPatient.gender }),
            p({ phone: testPatient.telecom.find(x => x.system === 'phone')!.value }),
            p({ email: testPatient.telecom.find(x => x.system === 'email')!.value }),
            p({ telecom: testPatient.telecom.find(x => x.system === 'email')!.value }),
            p({ organization: testPatient.managingOrganization.reference }),
        ];

        // run tests serially for easier debugging and to avoid throttling
        // eslint-disable-next-line no-restricted-syntax
        for (const testParams of testsParams) {
            // eslint-disable-next-line no-await-in-loop
            await expectResourceToBePartOfSearchResults(client, testParams, testPatient);
        }
    });

    test('search for various valid parameters in query and request body', async () => {
        const testPatient: ReturnType<typeof randomPatient> = (await client.post('Patient', randomPatient())).data;

        // wait for the patient to be asynchronously written to ES
        await waitForResourceToBeSearchable(client, testPatient);

        const aFewMinutesAgo = aFewMinutesAgoAsDate();

        const p = (params: any, postQueryParams: any) => ({
            url: 'Patient',
            params: { _lastUpdated: `ge${aFewMinutesAgo}`, ...params },
            postQueryParams,
        });
        const testsParams = [
            p({ 'address-city': testPatient.address[0].city }, { 'address-country': testPatient.address[0].country }),
            p(
                { 'address-postalcode': testPatient.address[0].postalCode },
                { family: testPatient.name[0].family, 'address-postalcode': testPatient.address[0].postalCode },
            ),
            p(
                { name: testPatient.name[0].given[0] },
                { name: testPatient.name[0].given[0], gender: testPatient.gender },
            ),
            p(
                { phone: testPatient.telecom.find(x => x.system === 'phone')!.value },
                { email: testPatient.telecom.find(x => x.system === 'email')!.value },
            ),
        ];

        // run tests serially for easier debugging and to avoid throttling
        // eslint-disable-next-line no-restricted-syntax
        for (const testParams of testsParams) {
            // eslint-disable-next-line no-await-in-loop
            await expectResourceToBePartOfSearchResults(client, testParams, testPatient);
        }
    });

    test('date ranges', async () => {
        const randomPatientData = randomPatient();
        randomPatientData.birthDate = '1990-05-05';
        const testPatient: ReturnType<typeof randomPatient> = (await client.post('Patient', randomPatientData)).data;

        // wait for the patient to be asynchronously written to ES
        await waitForResourceToBeSearchable(client, testPatient);

        const aFewMinutesAgo = aFewMinutesAgoAsDate();
        const p = (params: any) => ({ url: 'Patient', params: { _lastUpdated: `ge${aFewMinutesAgo}`, ...params } });

        const testsParamsThatMatch = [
            p({ birthdate: '1990-05-05' }),
            p({ birthdate: 'eq1990-05-05' }),
            p({ birthdate: 'eq1990' }),
            p({ birthdate: 'gt1990-05-01T07:30' }),
            p({ birthdate: 'ge1990-05-05' }),
            p({ birthdate: 'lt1991' }),
            p({ birthdate: 'le1990-05-06' }),
            p({ birthdate: 'sa1990-04' }),
            p({ birthdate: 'eb1990-06' }),
            p({ birthdate: 'ne1990-06' }),
        ];

        // eslint-disable-next-line no-restricted-syntax
        for (const testParams of testsParamsThatMatch) {
            // eslint-disable-next-line no-await-in-loop
            await expectResourceToBePartOfSearchResults(client, testParams, testPatient);
        }

        const testsParamsThatDoNotMatch = [
            p({ birthdate: '1990-05-06' }),
            p({ birthdate: '1990-05-05T07:30' }),
            p({ birthdate: 'ne1990' }),
            p({ birthdate: 'lt1990-05-01' }),
            p({ birthdate: 'le1990-05-04' }),
            p({ birthdate: 'gt1991' }),
            p({ birthdate: 'ge1990-05-06' }),
            p({ birthdate: 'eb1990-04' }),
            p({ birthdate: 'sa1990-06' }),
            p({ birthdate: 'eq1990-06' }),
        ];

        // eslint-disable-next-line no-restricted-syntax
        for (const testParams of testsParamsThatDoNotMatch) {
            // eslint-disable-next-line no-await-in-loop
            await expectResourceToNotBePartOfSearchResults(client, testParams, testPatient);
        }
    });

    test('date period', async () => {
        const documentReference = {
            resourceType: 'DocumentReference',
            status: 'current',
            type: {
                coding: [
                    {
                        system: 'http://loinc.org',
                        code: '34133-9',
                        display: 'Summary of episode note',
                    },
                ],
                text: 'CCD Document',
            },
            subject: {
                reference: 'Patient/example',
                display: 'Amy Shaw',
            },
            content: [
                {
                    attachment: {
                        contentType: 'text/plain',
                        url: '/Binary/1-note',
                        title: 'Uri where the data can be found: [base]/Binary/1-note',
                    },
                    format: {
                        system: 'urn:oid:1.3.6.1.4.1.19376.1.2.3',
                        code: 'urn:hl7-org:sdwg:ccda-structuredBody:2.1',
                        display: 'Documents following C-CDA constraints using a structured body',
                    },
                },
            ],
            context: {
                period: {
                    start: '2010-10-10T06:00:00Z',
                    end: '2010-10-20T06:00:00Z',
                },
            },
        };
        const testdocumentReference = (await client.post('DocumentReference', documentReference)).data;
        await waitForResourceToBeSearchable(client, testdocumentReference);

        const aFewMinutesAgo = aFewMinutesAgoAsDate();

        const testsParams = [
            { period: 'eq2010' },
            { period: 'gt2010' },
            { period: 'ge2010' },
            { period: 'lt2010' },
            { period: 'le2010' },
            { period: 'ap2010' },

            { period: 'ne2010-10-15' },
            { period: 'lt2010-10-15' },
            { period: 'le2010-10-15' },
            { period: 'gt2010-10-15' },
            { period: 'ge2010-10-15' },
            { period: 'ap2010-10-15' },

            { period: 'ne2010-10-20' },
            { period: 'lt2010-10-20' },
            { period: 'le2010-10-20' },
            { period: 'gt2010-10-20' },
            { period: 'ge2010-10-20' },
            { period: 'ap2010-10-20' },

            { period: 'ne2010-10-10' },
            { period: 'lt2010-10-10' },
            { period: 'le2010-10-10' },
            { period: 'gt2010-10-10' },
            { period: 'ge2010-10-10' },
            { period: 'ap2010-10-10' },

            { period: 'ne2020' },
            { period: 'eb2020' },
            { period: 'lt2020' },
            { period: 'le2020' },

            { period: 'ne2000' },
            { period: 'sa2000' },
            { period: 'gt2000' },
            { period: 'ge2000' },
        ].map(params => ({
            url: 'DocumentReference',
            params: { _lastUpdated: `ge${aFewMinutesAgo}`, ...params },
        }));

        // eslint-disable-next-line no-restricted-syntax
        for (const testParams of testsParams) {
            // eslint-disable-next-line no-await-in-loop
            await expectResourceToBePartOfSearchResults(client, testParams, testdocumentReference);
        }

        const testsParamsThatDoNotMatch = [
            { period: 'ne2010' },
            { period: 'sa2010' },
            { period: 'eb2010' },

            { period: 'eq2010-10-15' },
            { period: 'sa2010-10-15' },
            { period: 'eb2010-10-15' },

            { period: 'eq2010-10-20' },
            { period: 'sa2010-10-20' },
            { period: 'eb2010-10-20' },

            { period: 'eq2010-10-10' },
            { period: 'sa2010-10-10' },
            { period: 'eb2010-10-10' },

            { period: 'eq2020' },
            { period: 'sa2020' },
            { period: 'gt2020' },
            { period: 'ge2020' },
            { period: 'ap2020' },

            { period: 'eq2000' },
            { period: 'eb2000' },
            { period: 'lt2000' },
            { period: 'le2000' },
            { period: 'ap2000' },
        ].map(params => ({
            url: 'DocumentReference',
            params: { _lastUpdated: `ge${aFewMinutesAgo}`, ...params },
        }));

        // eslint-disable-next-line no-restricted-syntax
        for (const testParams of testsParamsThatDoNotMatch) {
            // eslint-disable-next-line no-await-in-loop
            await expectResourceToNotBePartOfSearchResults(client, testParams, testdocumentReference);
        }
    });

    test('tokens', async () => {
        const randomPatientData = randomPatient();
        randomPatientData.identifier = [
            {
                system: 'http://fwoa-integ-tests.com',
                value: 'someCode',
            },
            {
                system: 'http://fwoa-mail.com',
                value: 'somepatient@fwoa-mail.com',
            },
        ];
        const testPatient: ReturnType<typeof randomPatient> = (await client.post('Patient', randomPatientData)).data;

        const randomPatientDataNoSystem = randomPatient();
        randomPatientDataNoSystem.identifier = [
            {
                value: 'someCodeWithoutSystem',
            },
        ];
        const testPatientNoSystem: ReturnType<typeof randomPatient> = (
            await client.post('Patient', randomPatientDataNoSystem)
        ).data;

        // wait for the patient to be asynchronously written to ES
        await waitForResourceToBeSearchable(client, testPatient);
        await waitForResourceToBeSearchable(client, testPatientNoSystem);

        const aFewMinutesAgo = aFewMinutesAgoAsDate();
        const p = (params: any) => ({ url: 'Patient', params: { _lastUpdated: `ge${aFewMinutesAgo}`, ...params } });

        const testsParamsThatMatch = [
            p({ identifier: 'http://fwoa-integ-tests.com|someCode' }),
            p({ identifier: 'someCode' }),
            p({ identifier: 'http://fwoa-integ-tests.com|' }),
            p({ identifier: 'somepatient@fwoa-mail.com' }),
        ];
        // eslint-disable-next-line no-restricted-syntax
        for (const testParams of testsParamsThatMatch) {
            // eslint-disable-next-line no-await-in-loop
            await expectResourceToBePartOfSearchResults(client, testParams, testPatient);
        }
        await expectResourceToBePartOfSearchResults(
            client,
            p({ identifier: '|someCodeWithoutSystem' }),
            testPatientNoSystem,
        );

        const testsParamsThatDoNotMatch = [
            // only exact string matches should work
            p({ identifier: 'someOtherPatient@fwoa-mail.com' }),
            p({ identifier: 'somepatient' }),
            p({ identifier: 'fwoa-mail.com' }),
        ];

        // eslint-disable-next-line no-restricted-syntax
        for (const testParams of testsParamsThatDoNotMatch) {
            // eslint-disable-next-line no-await-in-loop
            await expectResourceToNotBePartOfSearchResults(client, testParams, testPatient);
        }
    });

    test('quantity', async () => {
        const observation = {
            resourceType: 'Observation',
            status: 'final',
            code: {
                coding: [
                    {
                        system: 'http://loinc.org',
                        code: '29463-7',
                        display: 'Body Weight',
                    },
                ],
            },
            valueQuantity: {
                value: 185,
                unit: 'lbs',
                system: 'http://unitsofmeasure.org',
                code: '[lb_av]',
            },
        };

        const testObservation = (await client.post('Observation', observation)).data;
        await waitForResourceToBeSearchable(client, testObservation);

        const aFewMinutesAgo = aFewMinutesAgoAsDate();

        const testsParams = [
            { 'value-quantity': '185|http://unitsofmeasure.org|[lb_av]' },
            { 'value-quantity': '185||[lb_av]' },
            { 'value-quantity': '185' },
            { 'value-quantity': 'ge185' },
            { 'value-quantity': 'le185' },
            { 'value-quantity': 'gt184.5' },
            { 'value-quantity': 'sa184.5' },
            { 'value-quantity': 'lt200' },
            { 'value-quantity': 'eb200' },
            { 'value-quantity': 'eq1.8e2' },
        ].map(params => ({
            url: 'Observation',
            params: { _lastUpdated: `ge${aFewMinutesAgo}`, ...params },
        }));

        // eslint-disable-next-line no-restricted-syntax
        for (const testParams of testsParams) {
            // eslint-disable-next-line no-await-in-loop
            await expectResourceToBePartOfSearchResults(client, testParams, testObservation);
        }
    });

    test('numeric', async () => {
        const chargeItem = {
            resourceType: 'ChargeItem',
            status: 'billable',
            code: {
                coding: [
                    {
                        code: '01510',
                        display: 'Zusatzpauschale für Beobachtung nach diagnostischer Koronarangiografie',
                    },
                ],
            },
            subject: {
                reference: 'Patient/example',
            },
            factorOverride: 0.8,
        };

        const testChargeItem = (await client.post('ChargeItem', chargeItem)).data;
        await waitForResourceToBeSearchable(client, testChargeItem);

        const aFewMinutesAgo = aFewMinutesAgoAsDate();

        const testsParams = [
            { 'factor-override': '0.8' },
            { 'factor-override': 'ge0.8' },
            { 'factor-override': 'le0.8' },
            { 'factor-override': 'gt0.5' },
            { 'factor-override': 'sa0.5' },
            { 'factor-override': 'lt1' },
            { 'factor-override': 'eb1' },
            { 'factor-override': 'eq8e-1' },
        ].map(params => ({
            url: 'ChargeItem',
            params: { _lastUpdated: `ge${aFewMinutesAgo}`, ...params },
        }));

        // eslint-disable-next-line no-restricted-syntax
        for (const testParams of testsParams) {
            // eslint-disable-next-line no-await-in-loop
            await expectResourceToBePartOfSearchResults(client, testParams, testChargeItem);
        }
    });

    test('invalid search parameter should fail with 400', async () => {
        await expect(client.get('Patient', { params: { someInvalidSearchParam: 'someValue' } })).rejects.toMatchObject({
            response: { status: 400 },
        });
    });
});
