/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import * as AWS from 'aws-sdk';
import axios, { AxiosInstance } from 'axios';
import { Chance } from 'chance';
import qs from 'qs';
import { decode } from 'jsonwebtoken';
import waitForExpect from 'wait-for-expect';

const DEFAULT_TENANT_ID = 'tenant1';

const getAuthParameters: (role: string, tenantId: string) => { PASSWORD: string; USERNAME: string } = (
    role: string,
    tenantId: string,
) => {
    const {
        COGNITO_USERNAME_PRACTITIONER,
        COGNITO_USERNAME_AUDITOR,
        COGNITO_PASSWORD,
        COGNITO_USERNAME_PRACTITIONER_ANOTHER_TENANT,
        MULTI_TENANCY_ENABLED,
    } = process.env;

    if (COGNITO_USERNAME_PRACTITIONER === undefined) {
        throw new Error('COGNITO_USERNAME_PRACTITIONER environment variable is not defined');
    }
    if (COGNITO_USERNAME_AUDITOR === undefined) {
        throw new Error('COGNITO_USERNAME_AUDITOR environment variable is not defined');
    }
    if (COGNITO_PASSWORD === undefined) {
        throw new Error('COGNITO_PASSWORD environment variable is not defined');
    }

    if (MULTI_TENANCY_ENABLED === 'true') {
        if (COGNITO_USERNAME_PRACTITIONER_ANOTHER_TENANT === undefined) {
            throw new Error('COGNITO_USERNAME_PRACTITIONER_ANOTHER_TENANT environment variable is not defined');
        }
    }

    // for simplicity the different test users have the same password
    const password = COGNITO_PASSWORD;
    let username: string | undefined;
    switch (role) {
        case 'practitioner':
            if (tenantId === undefined || tenantId === DEFAULT_TENANT_ID) {
                username = COGNITO_USERNAME_PRACTITIONER;
                break;
            }
            if (tenantId === 'tenant2') {
                username = COGNITO_USERNAME_PRACTITIONER_ANOTHER_TENANT!;
                break;
            }
            break;
        case 'auditor':
            username = COGNITO_USERNAME_AUDITOR;
            break;
        default:
            break;
    }

    if (username === undefined) {
        throw new Error('Could not find a username. Did you set up the integ tests correctly');
    }

    return {
        USERNAME: username,
        PASSWORD: password,
    };
};

export const getFhirClient = async ({
    role = 'practitioner',
    providedAccessToken,
    tenant = 'tenant1',
}: { role?: 'auditor' | 'practitioner'; providedAccessToken?: string; tenant?: string } = {}) => {
    const { API_URL, API_KEY, API_AWS_REGION, COGNITO_CLIENT_ID, MULTI_TENANCY_ENABLED } = process.env;
    if (API_URL === undefined) {
        throw new Error('API_URL environment variable is not defined');
    }
    if (API_KEY === undefined) {
        throw new Error('API_KEY environment variable is not defined');
    }
    if (API_AWS_REGION === undefined) {
        throw new Error('API_AWS_REGION environment variable is not defined');
    }
    if (COGNITO_CLIENT_ID === undefined) {
        throw new Error('COGNITO_CLIENT_ID environment variable is not defined');
    }

    AWS.config.update({ region: API_AWS_REGION });
    const Cognito = new AWS.CognitoIdentityServiceProvider();

    const IdToken =
        providedAccessToken ??
        (
            await Cognito.initiateAuth({
                ClientId: COGNITO_CLIENT_ID,
                AuthFlow: 'USER_PASSWORD_AUTH',
                AuthParameters: getAuthParameters(role, tenant),
            }).promise()
        ).AuthenticationResult!.IdToken!;

    let baseURL = API_URL;

    if (MULTI_TENANCY_ENABLED === 'true') {
        const decoded = decode(IdToken) as any;
        let tenantIdFromToken;
        if (!decoded) {
            // This only happens when the jwt token is invalid.
            tenantIdFromToken = DEFAULT_TENANT_ID;
        } else {
            tenantIdFromToken = decoded['custom:tenantId'];
        }
        if (!tenantIdFromToken) {
            throw new Error(
                'Attempted to run multi-tenancy tests but the tenantId is not present in the token. Did you set up the integ tests correctly?',
            );
        }

        baseURL = `${API_URL}/tenant/${tenantIdFromToken}`;
    }

    return axios.create({
        headers: {
            'x-api-key': API_KEY,
            Authorization: `Bearer ${IdToken}`,
        },
        baseURL,
    });
};

export const randomPatient = () => {
    const chance = new Chance();
    return {
        id: chance.word({ length: 15 }),
        resourceType: 'Patient',
        active: true,
        identifier: [
            {
                system: 'http://fwoa-integ-tests.com',
                value: chance.word({ length: 15 }),
            },
            {
                value: chance.word({ length: 15 }),
            },
        ],
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
        generalPractitioner: [
            {
                reference: `Practitioner/${chance.word({ length: 15 })}`,
            },
        ],
    };
};

const expectSearchResultsToFulfillExpectation = async (
    client: AxiosInstance,
    search: { url: string; params?: any; postQueryParams?: any },
    bundleEntryExpectation: jest.Expect,
) => {
    if (search.postQueryParams === undefined) {
        console.log('GET Searching with params:', search);
        const searchResult = (await client.get(search.url, { params: search.params })).data;
        expect(searchResult).toMatchObject({
            resourceType: 'Bundle',
            entry: bundleEntryExpectation,
        });

        console.log('POST Searching with params as x-www-form-urlencoded in body:', search);
        const postSearchResult = (await client.post(`${search.url}/_search`, qs.stringify(search.params))).data;
        expect(postSearchResult).toMatchObject({
            resourceType: 'Bundle',
            entry: bundleEntryExpectation,
        });
    } else {
        console.log('POST Searching with params in body and in query:', search);
        const postSearchRepeatingParamsResult = (
            await client.post(`${search.url}/_search`, qs.stringify(search.params), { params: search.postQueryParams })
        ).data;
        expect(postSearchRepeatingParamsResult).toMatchObject({
            resourceType: 'Bundle',
            entry: bundleEntryExpectation,
        });
    }
};

export const expectResourceToBePartOfSearchResults = async (
    client: AxiosInstance,
    search: { url: string; params?: any; postQueryParams?: any },
    resource: any,
) => {
    const bundleEntryExpectation = expect.arrayContaining([
        expect.objectContaining({
            resource,
        }),
    ]);
    await expectSearchResultsToFulfillExpectation(client, search, bundleEntryExpectation);
};

export const expectResourceToNotBePartOfSearchResults = async (
    client: AxiosInstance,
    search: { url: string; params?: any; postQueryParams?: any },
    resource: any,
) => {
    const bundleEntryExpectation = expect.not.arrayContaining([
        expect.objectContaining({
            resource,
        }),
    ]);
    await expectSearchResultsToFulfillExpectation(client, search, bundleEntryExpectation);
};

export const aFewMinutesAgoAsDate = () => new Date(Date.now() - 1000 * 60 * 10).toJSON();

export const expectResourceToBeInBundle = (resource: any, bundle: any) => {
    expect(bundle).toMatchObject({
        resourceType: 'Bundle',
        entry: expect.arrayContaining([
            expect.objectContaining({
                resource,
            }),
        ]),
    });
};

export const expectResourceToNotBeInBundle = (resource: any, bundle: any) => {
    expect(bundle).toMatchObject({
        resourceType: 'Bundle',
        entry: expect.not.arrayContaining([
            expect.objectContaining({
                resource,
            }),
        ]),
    });
};

export const waitForResourceToBeSearchable = async (client: AxiosInstance, resource: any) => {
    return waitForExpect(
        expectResourceToBePartOfSearchResults.bind(
            null,
            client,
            {
                url: resource.resourceType,
                params: {
                    _id: resource.id,
                },
            },
            resource,
        ),
        20000,
        3000,
    );
};
