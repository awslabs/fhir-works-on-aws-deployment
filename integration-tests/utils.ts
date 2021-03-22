/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import axios, { AxiosInstance } from 'axios';
import { Chance } from 'chance';
import { stringify } from 'query-string';

async function getAuthToken(
    username: string,
    password: string,
    clientId: string,
    clientPw: string,
    oauthApiEndpoint: string,
    scopes: string,
) {
    const data = stringify({
        grant_type: 'password',
        username,
        password,
        scope: scopes,
    });
    const authToken = `Basic ${Buffer.from(`${clientId}:${clientPw}`).toString('base64')}`;

    const config: any = {
        method: 'post',
        url: `${oauthApiEndpoint}/token`,
        headers: {
            Accept: 'application/json',
            Authorization: authToken,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        data,
    };
    const response = await axios(config);
    return response.data.access_token;
}

export const getFhirClient = async (
    scopes: string,
    isAdmin: boolean,
    providedAccessToken: string | undefined = undefined,
): Promise<AxiosInstance> => {
    // Check all environment variables are provided
    const {
        SMART_AUTH_USERNAME,
        SMART_AUTH_ADMIN_USERNAME,
        SMART_AUTH_PASSWORD,
        SMART_INTEGRATION_TEST_CLIENT_ID,
        SMART_INTEGRATION_TEST_CLIENT_PW,
        SMART_OAUTH2_API_ENDPOINT,
        SMART_SERVICE_URL,
        SMART_API_KEY,
    } = process.env;
    if (SMART_AUTH_USERNAME === undefined) {
        throw new Error('SMART_AUTH_USERNAME environment variable is not defined');
    }
    if (SMART_AUTH_ADMIN_USERNAME === undefined) {
        throw new Error('SMART_AUTH_ADMIN_USERNAME environment variable is not defined');
    }
    if (SMART_AUTH_PASSWORD === undefined) {
        throw new Error('SMART_AUTH_PASSWORD environment variable is not defined');
    }
    if (SMART_INTEGRATION_TEST_CLIENT_ID === undefined) {
        throw new Error('SMART_INTEGRATION_TEST_CLIENT_ID environment variable is not defined');
    }
    if (SMART_INTEGRATION_TEST_CLIENT_PW === undefined) {
        throw new Error('SMART_INTEGRATION_TEST_CLIENT_PW environment variable is not defined');
    }
    if (SMART_OAUTH2_API_ENDPOINT === undefined) {
        throw new Error('SMART_OAUTH2_API_ENDPOINT environment variable is not defined');
    }
    if (SMART_SERVICE_URL === undefined) {
        throw new Error('SMART_SERVICE_URL environment variable is not defined');
    }
    if (SMART_API_KEY === undefined) {
        throw new Error('SMART_API_KEY environment variable is not defined');
    }

    // SMART_AUTH_USERNAME should be for a Patient with the same relationships as Sherlock Holmes
    // SMART_ADMIN_USERNAME should be for an Admin, in this case a Practitioner like Joseph Bell
    const accessToken =
        providedAccessToken ??
        (await getAuthToken(
            isAdmin ? SMART_AUTH_ADMIN_USERNAME : SMART_AUTH_USERNAME,
            SMART_AUTH_PASSWORD,
            SMART_INTEGRATION_TEST_CLIENT_ID,
            SMART_INTEGRATION_TEST_CLIENT_PW,
            SMART_OAUTH2_API_ENDPOINT,
            scopes,
        ));
    return axios.create({
        headers: {
            'x-api-key': SMART_API_KEY,
            Authorization: `Bearer ${accessToken}`,
        },
        baseURL: SMART_SERVICE_URL,
    });
};

/*
 *  DDB Set Up on SMART Integration Env.
 *  Patient and Practitioner records should have the following relationships
 *  Sherlock Holmes (Patient)
 *     id: 92e0d921-bb19-4cae-a3cc-9d3c5bcf7a39
 *     reference: Patient Mycroft Holmes
 *     reference: Practitioner Joseph Bell
 *  Mycroft Holmes (Patient)
 *     id: cf52937f-a28f-437e-bfac-2228f5db6801
 *     reference: Patient Sherlock Holmes
 *     reference: Practitioner Joseph Bell
 *  John Watson (Patient)
 *     id: 7965ea12-7ecd-46cd-9ec1-340400c9548c
 *  Joseph Bell (Practitioner)
 *     id: 7cbe5ea4-826d-4de6-86d9-18644b1cc5b7
 */
export const idsOfFhirResources = {
    sherlockHolmes: '92e0d921-bb19-4cae-a3cc-9d3c5bcf7a39',
    mycroftHolmes: 'cf52937f-a28f-437e-bfac-2228f5db6801',
    johnWatson: '7965ea12-7ecd-46cd-9ec1-340400c9548c',
    josephBell: '7cbe5ea4-826d-4de6-86d9-18644b1cc5b7',
};

export const randomPatient = () => {
    const chance = new Chance();
    return {
        id: chance.word({ length: 15 }),
        resourceType: 'Patient',
        active: true,
        name: [
            {
                use: 'official',
                family: chance.word({ length: 15 }),
                given: [chance.word({ length: 15 }), chance.word({ length: 15 })],
            },
            {
                use: 'maiden',
                family: chance.word({ length: 15 }),
                given: [chance.word({ length: 15 }), chance.word({ length: 15 })],
                period: {
                    end: '2002',
                },
            },
        ],
        telecom: [
            {
                system: 'phone',
                value: chance.phone(),
                use: 'work',
                rank: 1,
            },
            {
                system: 'phone',
                value: chance.phone(),
                use: 'mobile',
                rank: 2,
            },
            {
                system: 'email',
                value: chance.email(),
                use: 'home',
            },
        ],
        gender: chance.pickone(['male', 'female']),
        birthDate: '1974-12-25',
        deceasedBoolean: false,
        address: [
            {
                use: 'home',
                type: 'both',
                text: chance.word({ length: 15 }),
                line: [chance.word({ length: 15 })],
                city: chance.word({ length: 15 }),
                district: chance.word({ length: 15 }),
                state: chance.word({ length: 15 }),
                postalCode: chance.word({ length: 15 }),
                country: chance.word({ length: 15 }),
                period: {
                    start: '1974-12-25',
                },
            },
        ],
        managingOrganization: {
            reference: `Organization/${chance.word({ length: 15 })}`,
        },
    };
};

export const expectResourceToBePartOfSearchResults = async (
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
