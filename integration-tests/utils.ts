/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import axios, { AxiosInstance } from 'axios';
import { Chance } from 'chance';
import qs from 'qs';
import { stringify } from 'query-string';
import { decode } from 'jsonwebtoken';
import waitForExpect from 'wait-for-expect';
import { cloneDeep } from 'lodash';
import createBundle from './createPatientPractitionerEncounterBundle.json';

const DEFAULT_TENANT_ID = 'tenant1';

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
    { providedAccessToken, tenant = 'tenant1' }: { providedAccessToken?: string; tenant?: string } = {},
): Promise<AxiosInstance> => {
    // Check all environment variables are provided
    const {
        SMART_AUTH_USERNAME,
        SMART_AUTH_ADMIN_USERNAME,
        SMART_AUTH_ADMIN_ANOTHER_TENANT_USERNAME,
        SMART_AUTH_PASSWORD,
        SMART_INTEGRATION_TEST_CLIENT_ID,
        SMART_INTEGRATION_TEST_CLIENT_PW,
        SMART_OAUTH2_API_ENDPOINT,
        SMART_SERVICE_URL,
        SMART_API_KEY,
        MULTI_TENANCY_ENABLED,
    } = process.env;
    if (SMART_AUTH_USERNAME === undefined) {
        throw new Error('SMART_AUTH_USERNAME environment variable is not defined');
    }
    if (SMART_AUTH_ADMIN_USERNAME === undefined) {
        throw new Error('SMART_AUTH_ADMIN_USERNAME environment variable is not defined');
    }
    if (SMART_AUTH_ADMIN_ANOTHER_TENANT_USERNAME === undefined) {
        throw new Error('SMART_AUTH_ADMIN_ANOTHER_TENANT_USERNAME environment variable is not defined');
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

    let username: string | undefined;

    if (tenant === DEFAULT_TENANT_ID) {
        username = isAdmin ? SMART_AUTH_ADMIN_USERNAME : SMART_AUTH_USERNAME;
    } else if (isAdmin) {
        username = SMART_AUTH_ADMIN_ANOTHER_TENANT_USERNAME;
    }

    if (username === undefined) {
        throw new Error('Could not find a username. Did you set up the integ tests correctly');
    }

    const accessToken =
        providedAccessToken ??
        (await getAuthToken(
            username,
            SMART_AUTH_PASSWORD,
            SMART_INTEGRATION_TEST_CLIENT_ID,
            SMART_INTEGRATION_TEST_CLIENT_PW,
            SMART_OAUTH2_API_ENDPOINT,
            scopes,
        ));

    let baseURL = SMART_SERVICE_URL;

    if (MULTI_TENANCY_ENABLED === 'true') {
        const decoded = decode(accessToken) as any;
        let tenantIdFromToken;
        if (!decoded) {
            // This only happens when the jwt token is invalid.
            tenantIdFromToken = DEFAULT_TENANT_ID;
        } else {
            tenantIdFromToken = decoded.tenantId;
        }
        if (!tenantIdFromToken) {
            throw new Error(
                'Attempted to run multi-tenancy tests but the tenantId is not present in the token. Did you set up the integ tests correctly?',
            );
        }

        baseURL = `${SMART_SERVICE_URL}/tenant/${tenantIdFromToken}`;
    }

    return axios.create({
        headers: {
            'x-api-key': SMART_API_KEY,
            Authorization: `Bearer ${accessToken}`,
        },
        baseURL,
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
    };
};

export const randomChainedParamBundle = () => {
    const chance = new Chance();
    return {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
            {
                fullUrl: 'urn:uuid:fcfe413c-c62d-4097-9e31-02ff6ff523ad',
                resource: {
                    resourceType: 'Patient',
                    name: [
                        {
                            family: 'Escobedo608',
                            given: ['Cristina921'],
                        },
                    ],
                    managingOrganization: {
                        reference: 'urn:uuid:e92f7839-c81b-4341-93c3-4c6460bd78dc',
                    },
                    generalPractitioner: [
                        {
                            reference: 'urn:uuid:fcfe413c-c62d-4097-9e31-02ff6gg786yz',
                        },
                    ],
                },
                request: {
                    method: 'POST',
                    url: 'Patient',
                },
            },
            {
                fullUrl: 'urn:uuid:fcfe413c-c62d-4097-9e31-02ff6gg786yz',
                resource: {
                    practitioner: {
                        reference: 'urn:uuid:e0352b49-8798-398c-8f10-2fc0648a268a',
                        display: 'Dr Adam Careful',
                    },
                    organization: {
                        reference: 'urn:uuid:e92f7839-c81b-4341-93c3-4c6460bd78dc',
                    },
                    location: [
                        {
                            reference: 'urn:uuid:fcfe413c-c62d-4097-9e31-02ff6gg369ls',
                            display: 'South Wing, second floor',
                        },
                    ],
                    resourceType: 'PractitionerRole',
                },
                request: {
                    method: 'POST',
                    url: 'PractitionerRole',
                },
            },
            {
                fullUrl: 'urn:uuid:fcfe413c-c62d-4097-9e31-02ff6gg369ls',
                resource: {
                    description: 'Old South Wing, Neuro Radiology Operation Room 1 on second floor',
                    name: chance.word({ length: 15 }),
                    managingOrganization: {
                        reference: 'urn:uuid:e92f7839-c81b-4341-93c3-4c6460bd78dc',
                    },
                    resourceType: 'Location',
                    status: 'suspended',
                },
                request: {
                    method: 'POST',
                    url: 'Location',
                },
            },
            {
                fullUrl: 'urn:uuid:e0352b49-8798-398c-8f10-2fc0648a268a',
                resource: {
                    resourceType: 'Practitioner',
                    name: [
                        {
                            family: chance.word({ length: 15 }),
                            given: ['Julia241'],
                        },
                    ],
                },
                request: {
                    method: 'POST',
                    url: 'Practitioner',
                },
            },
            {
                fullUrl: 'urn:uuid:e92f7839-c81b-4341-93c3-4c6460bd78dc',
                resource: {
                    resourceType: 'Organization',
                    name: chance.word({ length: 15 }),
                    alias: ['HL7 International'],
                    address: [
                        {
                            line: ['3300 Washtenaw Avenue, Suite 227'],
                            city: 'Ann Arbor',
                            state: 'MI',
                            postalCode: '48104',
                            country: 'USA',
                        },
                    ],
                },
                request: {
                    method: 'POST',
                    url: 'Organization',
                },
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

export const randomString = () => new Chance().string();

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

export const getResourcesFromBundleResponse = (
    bundleResponse: any,
    originalBundle: any = createBundle,
    swapBundleInternalReference = false,
): Record<string, any> => {
    let resources = [];
    const clonedCreatedBundle = cloneDeep(originalBundle);
    const urlToReferenceList = [];
    for (let i = 0; i < bundleResponse.entry.length; i += 1) {
        const res: any = clonedCreatedBundle.entry[i].resource;
        const bundleResponseEntry = bundleResponse.entry[i];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [location, resourceType, id] = bundleResponseEntry.response.location.match(/(\w+)\/(.+)/);
        res.id = id;
        res.meta = {
            lastUpdated: bundleResponseEntry.response.lastModified,
            versionId: bundleResponseEntry.response.etag,
        };
        resources.push(res);
        urlToReferenceList.push({ url: clonedCreatedBundle.entry[i].fullUrl, reference: `${resourceType}/${id}` });
    }
    // If internal reference was used in bundle creation, swap it to resource reference
    if (swapBundleInternalReference) {
        let resourcesString = JSON.stringify(resources);
        urlToReferenceList.forEach((item) => {
            const regEx = new RegExp(`"reference":"${item.url}"`, 'g');
            resourcesString = resourcesString.replace(regEx, `"reference":"${item.reference}"`);
        });
        resources = JSON.parse(resourcesString);
    }
    const resourceTypeToExpectedResource: Record<string, any> = {};
    resources.forEach((res: { resourceType: string }) => {
        resourceTypeToExpectedResource[res.resourceType] = res;
    });
    return resourceTypeToExpectedResource;
};
