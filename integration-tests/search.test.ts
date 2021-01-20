/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { AxiosInstance } from 'axios';
import waitForExpect from 'wait-for-expect';
import { getFhirClient, randomPatient } from './utils';

jest.setTimeout(60 * 1000);

const expectResourceToBePartOfSearchResults = async (
    client: AxiosInstance,
    search: { url: string; params?: any },
    resource: any,
) => {
    console.log('Searching with params:', search);
    await expect(
        (async () => {
            return (
                await client.get(search.url, {
                    params: search.params,
                })
            ).data;
        })(),
    ).resolves.toMatchObject({
        resourceType: 'Bundle',
        entry: expect.arrayContaining([
            expect.objectContaining({
                resource,
            }),
        ]),
    });
};

describe('search', () => {
    let client: AxiosInstance;
    beforeAll(async () => {
        client = await getFhirClient();
    });
    test('search for various valid parameters', async () => {
        const testPatient: ReturnType<typeof randomPatient> = (await client.post('Patient', randomPatient())).data;

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
            p({ 'address-city': testPatient.address[0].city }),
            p({ 'address-country': testPatient.address[0].country }),
            p({ 'address-postalcode': testPatient.address[0].postalCode }),
            p({ family: testPatient.name[0].family }),
            p({ given: testPatient.name[0].given[0] }),
            p({ name: testPatient.name[0].given[0] }),
            p({ gender: testPatient.gender, _id: testPatient.id }), // gender alone is not unique enough to guarantee a match on the first page of search results
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

    test('invalid search parameter should fail with 400', async () => {
        await expect(client.get('Patient', { params: { someInvalidSearchParam: 'someValue' } })).rejects.toMatchObject({
            response: { status: 400 },
        });
    });
});
