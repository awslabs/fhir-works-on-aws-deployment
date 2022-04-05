import { AxiosInstance } from 'axios';
import { getFhirClient } from './utils';

jest.setTimeout(60 * 1000);

const generateGetRequests = (id: string, amount: number) => {
    const requests = [];
    for (let i = 0; i < amount; i += 1) {
        requests.push({
            request: {
                method: 'GET',
                url: `/Patient/${id}`,
            },
        });
    }
    return requests;
};

const generateGetResponses = (id: string, amount: number) => {
    const responses = [];
    for (let i = 0; i < amount; i += 1) {
        responses.push({
            response: {
                status: '200 OK',
                location: `Patient/${id}`,
                etag: '1',
            },
        });
    }
    return responses;
};

describe('Batch bundles', () => {
    let client: AxiosInstance;
    beforeAll(async () => {
        client = await getFhirClient();
    });

    // expect get and delete to fail in this batch, but batch should succeed
    const firstBatch = {
        resourceType: 'Bundle',
        type: 'batch',
        entry: [
            {
                request: {
                    method: 'GET',
                    url: '/Patient/someRandomResource',
                },
            },
            {
                request: {
                    method: 'DELETE',
                    url: '/Patient/someResource',
                },
            },
            {
                resource: {
                    id: 'createdResource',
                    resourceType: 'Patient',
                    text: {
                        status: 'generated',
                        div: '<div xmlns="http://www.w3.org/1999/xhtml">Some narrative</div>',
                    },
                    active: true,
                    name: [
                        {
                            use: 'official',
                            family: 'Chalmers',
                            given: ['Peter', 'James'],
                        },
                    ],
                    gender: 'male',
                    birthDate: '1974-12-25',
                },
                request: {
                    method: 'POST',
                    url: '/Patient/',
                },
            },
            {
                resource: {
                    id: 'resourceToDelete',
                    resourceType: 'Patient',
                    text: {
                        status: 'generated',
                        div: '<div xmlns="http://www.w3.org/1999/xhtml">Some narrative</div>',
                    },
                    active: true,
                    name: [
                        {
                            use: 'official',
                            family: 'Chalmers',
                            given: ['Peter', 'James'],
                        },
                    ],
                    gender: 'male',
                    birthDate: '1974-12-25',
                },
                request: {
                    method: 'POST',
                    url: '/Patient/',
                },
            },
            {
                resource: {
                    id: 'resourceToGet',
                    resourceType: 'Patient',
                    text: {
                        status: 'generated',
                        div: '<div xmlns="http://www.w3.org/1999/xhtml">Some narrative</div>',
                    },
                    active: true,
                    name: [
                        {
                            use: 'official',
                            family: 'Chalmers',
                            given: ['Peter', 'James'],
                        },
                    ],
                    gender: 'male',
                    birthDate: '1974-12-25',
                },
                request: {
                    method: 'POST',
                    url: '/Patient/',
                },
            },
        ],
    };

    test('post multiple batches with failures', async () => {
        const response = await client.post('/', firstBatch);
        expect(response.data).toMatchObject({
            resourceType: 'Bundle',
            type: 'batch-response',
            entry: [
                {
                    response: {
                        status: '404 Not Found',
                        location: 'Patient/someRandomResource',
                    },
                },
                {
                    response: {
                        status: '404 Not Found',
                        location: 'Patient/someResource',
                    },
                },
                {
                    response: {
                        status: '201 Created',
                        etag: '1',
                    },
                },
                {
                    response: {
                        status: '201 Created',
                        etag: '1',
                    },
                },
                {
                    response: {
                        status: '201 Created',
                        etag: '1',
                    },
                },
            ],
        });

        const createdResourceId = response.data.entry[2].response.location;
        const deleteResourceId = response.data.entry[3].response.location;
        const getResourceId = response.data.entry[4].response.location;

        const secondBatch = {
            resourceType: 'Bundle',
            type: 'batch',
            entry: [
                {
                    request: {
                        method: 'GET',
                        url: `/${getResourceId}`,
                    },
                },
                {
                    request: {
                        method: 'DELETE',
                        url: `/${deleteResourceId}`,
                    },
                },
                {
                    resource: {
                        id: `${createdResourceId.replace('Patient/', '')}`,
                        resourceType: 'Patient',
                        text: {
                            status: 'generated',
                            div: '<div xmlns="http://www.w3.org/1999/xhtml">Some narrative</div>',
                        },
                        active: true,
                        name: [
                            {
                                use: 'official',
                                family: 'Chalmers',
                                given: ['Peter', 'James'],
                            },
                        ],
                        gender: 'female',
                        birthDate: '1974-12-25',
                    },
                    request: {
                        method: 'PUT',
                        url: `/${createdResourceId}`,
                    },
                },
            ],
        };

        const secondResponse = await client.post('/', secondBatch);
        expect(secondResponse.data).toMatchObject({
            resourceType: 'Bundle',
            type: 'batch-response',
            entry: [
                {
                    response: {
                        status: '200 OK',
                        location: `${getResourceId}`,
                        etag: '1',
                    },
                },
                {
                    response: {
                        status: '200 OK',
                        location: `${deleteResourceId}`,
                        etag: '1',
                    },
                },
                {
                    response: {
                        status: '200 OK',
                        location: `${createdResourceId}`,
                        etag: '2',
                    },
                },
            ],
        });
    });

    test('bulk test', async () => {
        const postRequest = {
            resourceType: 'Patient',
            active: true,
            name: [
                {
                    family: 'Emily',
                    given: ['Tester'],
                },
            ],
            gender: 'female',
            birthDate: '1995-09-24',
            id: 'test',
        };

        const response = await client.post('/Patient', postRequest);
        expect(response.status).toEqual(201);
        const { id } = response.data;
        const requests = generateGetRequests(id, 101);
        const batchResponse = await client.post('/', {
            resourceType: 'Bundle',
            type: 'batch',
            entry: requests,
        });
        expect(batchResponse.status).toEqual(200);
        expect(batchResponse.data).toMatchObject({
            resourceType: 'Bundle',
            type: 'batch-response',
            entry: generateGetResponses(id, 101),
        });
    });
});
