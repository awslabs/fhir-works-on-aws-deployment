/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-classes-per-file */
// eslint-disable-next-line import/extensions
import uuidv4 from 'uuid/v4';
import ResourceHandler from './resourceHandler';
import invalidPatient from '../../../sampleData/invalidV4Patient.json';
import validPatient from '../../../sampleData/validV4Patient.json';
import { SEARCH_PAGINATION_PARAMS } from '../../constants';
import { generateMeta } from '../../interface/resourceMeta';
import OperationsGenerator from '../operationsGenerator';
import { SearchResponse } from '../../interface/search';
import ElasticSearchService from '../../search/elasticSearchService';
import DynamoDbDataService from '../../persistence/dataServices/__mocks__/dynamoDbDataService';
import {
    Persistence,
    CreateResourceRequest,
    UpdateResourceRequest,
    ReadResourceRequest,
    vReadResourceRequest,
    DeleteResourceRequest,
    PatchResourceRequest,
    ConditionalDeleteResourceRequest,
} from '../../interface/persistence';
import GenericResponse from '../../interface/genericResponse';

jest.mock('../../search/elasticSearchService');

describe('SUCCESS CASES: Testing create, read, update, delete of resources', () => {
    const resourceHandler = new ResourceHandler(
        DynamoDbDataService,
        ElasticSearchService,
        '4.0.1',
        'https://API_URL.com',
    );

    test('create: patient', async () => {
        const createResponse = await resourceHandler.create('Patient', validPatient);

        const expectedValidPatient = { ...validPatient };

        // The patient that was created has a randomly generated id, which will not match the expectedValidPatient's id
        delete expectedValidPatient.id;

        // TODO spy on DS and ensure ID being passed in is not the expectedValidPatient.id
        expect(createResponse.id).toBeDefined();
        expect(createResponse.meta).toBeDefined();
        expect(createResponse.meta.versionId).toEqual('1');
        expect(createResponse.meta.lastUpdated).toBeDefined();
        delete createResponse.meta;
        expect(createResponse).toMatchObject(expectedValidPatient);
    });

    test('get: patient', async () => {
        const id = uuidv4();
        const getResponse: any = await resourceHandler.read('Patient', id);

        const expectedValidPatient = { ...validPatient };
        expectedValidPatient.id = id;
        expect(getResponse.meta).toBeDefined();
        expect(getResponse.meta.versionId).toEqual('1');
        expect(getResponse.meta.lastUpdated).toBeDefined();
        delete getResponse.meta;
        expect(getResponse).toMatchObject(expectedValidPatient);
    });

    test('history: patient', async () => {
        const id = uuidv4();
        const vid = '1';
        const getResponse: any = await resourceHandler.vRead('Patient', id, vid);

        const expectedValidPatient = { ...validPatient };
        expectedValidPatient.id = id;
        expect(getResponse.meta).toBeDefined();
        expect(getResponse.meta.versionId).toEqual('1');
        expect(getResponse.meta.lastUpdated).toBeDefined();
        delete getResponse.meta;
        expect(getResponse).toMatchObject(expectedValidPatient);
    });

    test('update: patient', async () => {
        const id = uuidv4();
        const updateResponse = await resourceHandler.update('Patient', id, validPatient);
        const expectedValidPatient = { ...validPatient };

        expectedValidPatient.id = id;
        // TODO spy on DS and ensure ID being passed in is the expectedValidPatient.id & versionId is set to 2
        expect(updateResponse.id).toEqual(id);
        expect(updateResponse.meta).toBeDefined();
        expect(updateResponse.meta.versionId).toEqual('2');
        expect(updateResponse.meta.lastUpdated).toBeDefined();
        delete updateResponse.meta;
        expect(updateResponse).toMatchObject(expectedValidPatient);
    });

    test('delete: patient', async () => {
        const id = uuidv4();
        const deleteResponse = await resourceHandler.delete('Patient', id);
        expect(deleteResponse).toEqual(OperationsGenerator.generateSuccessfulDeleteOperation(1));
    });
});
describe('ERROR CASES: Testing create, read, update, delete of resources', () => {
    const mockedDataService: Persistence = class {
        static updateCreateSupported: boolean = false;

        static async createResource(request: CreateResourceRequest): Promise<GenericResponse> {
            return {
                success: false,
                message: 'Failed to create resource',
            };
        }

        static async updateResource(request: UpdateResourceRequest): Promise<GenericResponse> {
            return {
                success: false,
                message: 'Failed to update resource',
            };
        }

        static async readResource(request: ReadResourceRequest): Promise<GenericResponse> {
            const { resourceType, id } = request;
            return {
                success: false,
                message: `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`,
            };
        }

        static async vReadResource(request: vReadResourceRequest): Promise<GenericResponse> {
            const { resourceType, id, vid } = request;
            return {
                success: false,
                message: `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}, VersionId: ${vid}`,
            };
        }

        static async deleteResource(request: DeleteResourceRequest): Promise<GenericResponse> {
            const { resourceType, id } = request;

            return {
                success: false,
                message: `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`,
            };
        }

        static async deleteVersionedResource(
            resourceType: string,
            id: string,
            versionId: string,
        ): Promise<GenericResponse> {
            return {
                success: false,
                message: `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`,
            };
        }

        static conditionalCreateResource(request: CreateResourceRequest, queryParams: any): Promise<GenericResponse> {
            throw new Error('Method not implemented.');
        }

        static conditionalUpdateResource(request: UpdateResourceRequest, queryParams: any): Promise<GenericResponse> {
            throw new Error('Method not implemented.');
        }

        static patchResource(request: PatchResourceRequest): Promise<GenericResponse> {
            throw new Error('Method not implemented.');
        }

        static conditionalPatchResource(request: PatchResourceRequest, queryParams: any): Promise<GenericResponse> {
            throw new Error('Method not implemented.');
        }

        static conditionalDeleteResource(
            request: ConditionalDeleteResourceRequest,
            queryParams: any,
        ): Promise<GenericResponse> {
            throw new Error('Method not implemented.');
        }
    };

    const resourceHandler = new ResourceHandler(
        mockedDataService,
        ElasticSearchService,
        '4.0.1',
        'https://API_URL.com',
    );

    beforeEach(() => {
        // Ensures that for each test, we test the assertions in the catch block
        expect.hasAssertions();
    });

    test('create: invalid patient', async () => {
        try {
            await resourceHandler.create('Patient', invalidPatient);
        } catch (e) {
            expect(e.name).toEqual('BadRequestError');
            expect(e.statusCode).toEqual(400);
            expect(e.errorDetail).toEqual(
                OperationsGenerator.generatInputValidationError(
                    "data.text should have required property 'div', data.gender should be equal to one of the allowed values",
                ),
            );
        }
    });

    test('create: Data Service failure', async () => {
        try {
            await resourceHandler.create('Patient', validPatient);
        } catch (e) {
            expect(e.name).toEqual('InternalServerError');
            expect(e.statusCode).toEqual(500);
            expect(e.errorDetail).toEqual(OperationsGenerator.generateError('Failed to create resource'));
        }
    });

    test('update: invalid patient', async () => {
        try {
            const id = uuidv4();
            await resourceHandler.update('Patient', id, invalidPatient);
        } catch (e) {
            expect(e.name).toEqual('BadRequestError');
            expect(e.statusCode).toEqual(400);
            expect(e.errorDetail).toEqual(
                OperationsGenerator.generatInputValidationError(
                    "data.text should have required property 'div', data.gender should be equal to one of the allowed values",
                ),
            );
        }
    });

    test('update: existing resource not found', async () => {
        const id = uuidv4();
        try {
            await resourceHandler.update('Patient', id, validPatient);
        } catch (e) {
            expect(e.name).toEqual('NotFoundError');
            expect(e.statusCode).toEqual(404);
            expect(e.errorDetail).toEqual(OperationsGenerator.generateResourceNotFoundError('Patient', id));
        }
    });

    test('update: Data Service failure', async () => {
        const mockedDataServiceWithGet: Persistence = class {
            static updateCreateSupported: boolean = false;

            static async createResource(request: CreateResourceRequest): Promise<GenericResponse> {
                return {
                    success: false,
                    message: 'Failed to create resource',
                };
            }

            static async updateResource(request: UpdateResourceRequest): Promise<GenericResponse> {
                return {
                    success: false,
                    message: 'Failed to update resource',
                };
            }

            static async readResource(request: ReadResourceRequest): Promise<GenericResponse> {
                const resourceCopy: any = { ...validPatient };
                resourceCopy.id = request.id;
                resourceCopy.meta = generateMeta('1');
                return {
                    success: true,
                    message: 'Resource found',
                    resource: resourceCopy,
                };
            }

            static async vReadResource(request: vReadResourceRequest): Promise<GenericResponse> {
                const { resourceType, id, vid } = request;
                return {
                    success: false,
                    message: `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}, VersionId: ${vid}`,
                };
            }

            static async deleteResource(request: DeleteResourceRequest): Promise<GenericResponse> {
                const { resourceType, id } = request;

                return {
                    success: false,
                    message: `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`,
                };
            }

            static async deleteVersionedResource(
                resourceType: string,
                id: string,
                versionId: string,
            ): Promise<GenericResponse> {
                return {
                    success: false,
                    message: `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`,
                };
            }

            static conditionalCreateResource(
                request: CreateResourceRequest,
                queryParams: any,
            ): Promise<GenericResponse> {
                throw new Error('Method not implemented.');
            }

            static conditionalUpdateResource(
                request: UpdateResourceRequest,
                queryParams: any,
            ): Promise<GenericResponse> {
                throw new Error('Method not implemented.');
            }

            static patchResource(request: PatchResourceRequest): Promise<GenericResponse> {
                throw new Error('Method not implemented.');
            }

            static conditionalPatchResource(request: PatchResourceRequest, queryParams: any): Promise<GenericResponse> {
                throw new Error('Method not implemented.');
            }

            static conditionalDeleteResource(
                request: ConditionalDeleteResourceRequest,
                queryParams: any,
            ): Promise<GenericResponse> {
                throw new Error('Method not implemented.');
            }
        };

        const resourceHandlerWithGet = new ResourceHandler(
            mockedDataServiceWithGet,
            ElasticSearchService,
            '4.0.1',
            'https://API_URL.com',
        );

        try {
            const id = uuidv4();
            await resourceHandlerWithGet.update('Patient', id, validPatient);
        } catch (e) {
            expect(e.name).toEqual('InternalServerError');
            expect(e.statusCode).toEqual(500);
            expect(e.errorDetail).toEqual(OperationsGenerator.generateError('Failed to update resource'));
        }
    });

    test('get: resource that does not exist', async () => {
        const id = uuidv4();
        try {
            await resourceHandler.read('Patient', id);
        } catch (e) {
            expect(e.name).toEqual('NotFoundError');
            expect(e.statusCode).toEqual(404);
            expect(e.errorDetail).toEqual(OperationsGenerator.generateResourceNotFoundError('Patient', id));
        }
    });

    test('history: resource that does not exist', async () => {
        const id = uuidv4();
        const vid = '1';
        try {
            await resourceHandler.vRead('Patient', id, vid);
        } catch (e) {
            expect(e.name).toEqual('NotFoundError');
            expect(e.statusCode).toEqual(404);
            expect(e.errorDetail).toEqual(
                OperationsGenerator.generateHistoricResourceNotFoundError('Patient', id, vid),
            );
        }
    });

    test('delete patient that does NOT exist', async () => {
        const id = uuidv4();
        try {
            await resourceHandler.delete('Patient', id);
        } catch (e) {
            expect(e.name).toEqual('NotFoundError');
            expect(e.statusCode).toEqual(404);
            expect(e.errorDetail).toEqual(OperationsGenerator.generateResourceNotFoundError('Patient', id));
        }
    });
});

describe('Testing search', () => {
    const initializeResourceHandler = (searchServiceResponse: SearchResponse) => {
        ElasticSearchService.typeSearch = jest.fn().mockReturnValue(Promise.resolve(searchServiceResponse));

        const resourceHandler = new ResourceHandler(
            DynamoDbDataService,
            ElasticSearchService,
            '4.0.1',
            'https://API_URL.com',
        );

        return resourceHandler;
    };

    test('Search for a patient that exist', async () => {
        const resourceHandler = initializeResourceHandler({
            success: true,
            result: {
                numberOfResults: 1,
                message: '',
                entries: [
                    {
                        fullUrl: 'https://API_URL.com/Patient/xcda',
                        resource: validPatient,
                        search: {
                            mode: 'match',
                        },
                    },
                ],
            },
        });

        const searchResponse: any = await resourceHandler.search('Patient', {
            name: 'Henry',
        });

        expect(searchResponse.resourceType).toEqual('Bundle');
        expect(searchResponse.meta).toBeDefined();
        expect(searchResponse.type).toEqual('searchset');
        expect(searchResponse.total).toEqual(1);
        expect(searchResponse.link).toEqual([
            {
                relation: 'self',
                url: 'https://API_URL.com/Patient?name=Henry',
            },
        ]);

        expect(searchResponse.entry).toEqual([
            {
                search: {
                    mode: 'match',
                },
                fullUrl: 'https://API_URL.com/Patient/xcda',
                resource: validPatient,
            },
        ]);
    });

    test('Search for a patient that does NOT exist', async () => {
        const resourceHandler = initializeResourceHandler({
            success: true,
            result: {
                numberOfResults: 0,
                message: '',
                entries: [],
            },
        });

        const searchResponse: any = await resourceHandler.search('Patient', {
            name: 'Henry',
        });

        expect(searchResponse.resourceType).toEqual('Bundle');
        expect(searchResponse.meta).toBeDefined();
        expect(searchResponse.type).toEqual('searchset');
        expect(searchResponse.total).toEqual(0);
        expect(searchResponse.link).toEqual([
            {
                relation: 'self',
                url: 'https://API_URL.com/Patient?name=Henry',
            },
        ]);

        expect(searchResponse.entry).toEqual([]);
    });

    describe('Pagination', () => {
        test('Pagination with a next page link', async () => {
            const resourceHandler = initializeResourceHandler({
                success: true,
                result: {
                    nextResultUrl: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=1&_count=1',
                    numberOfResults: 2,
                    message: '',
                    entries: [
                        {
                            fullUrl: 'https://API_URL.com/Patient/xcda',
                            resource: validPatient,
                            search: {
                                mode: 'match',
                            },
                        },
                    ],
                },
            });

            const searchResponse: any = await resourceHandler.search('Patient', {
                name: 'Henry',
                [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: 0,
                [SEARCH_PAGINATION_PARAMS.COUNT]: 1,
            });

            expect(searchResponse.resourceType).toEqual('Bundle');
            expect(searchResponse.meta).toBeDefined();
            expect(searchResponse.type).toEqual('searchset');
            expect(searchResponse.total).toEqual(2);
            expect(searchResponse.link).toEqual([
                {
                    relation: 'self',
                    url: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=0&_count=1',
                },
                {
                    relation: 'next',
                    url: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=1&_count=1',
                },
            ]);

            expect(searchResponse.entry).toEqual([
                {
                    search: {
                        mode: 'match',
                    },
                    fullUrl: 'https://API_URL.com/Patient/xcda',
                    resource: validPatient,
                },
            ]);
        });
        test('Pagination with a previous page link', async () => {
            const resourceHandler = initializeResourceHandler({
                success: true,
                result: {
                    previousResultUrl: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=0&_count=1',
                    numberOfResults: 2,
                    message: '',
                    entries: [
                        {
                            fullUrl: 'https://API_URL.com/Patient/xcda',
                            resource: validPatient,
                            search: {
                                mode: 'match',
                            },
                        },
                    ],
                },
            });

            const searchResponse: any = await resourceHandler.search('Patient', {
                name: 'Henry',
                [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: 1,
                [SEARCH_PAGINATION_PARAMS.COUNT]: 1,
            });

            expect(searchResponse.resourceType).toEqual('Bundle');
            expect(searchResponse.meta).toBeDefined();
            expect(searchResponse.type).toEqual('searchset');
            expect(searchResponse.total).toEqual(2);
            expect(searchResponse.link).toEqual([
                {
                    relation: 'self',
                    url: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=1&_count=1',
                },
                {
                    relation: 'previous',
                    url: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=0&_count=1',
                },
            ]);

            expect(searchResponse.entry).toEqual([
                {
                    search: {
                        mode: 'match',
                    },
                    fullUrl: 'https://API_URL.com/Patient/xcda',
                    resource: validPatient,
                },
            ]);
        });
        test('Pagination with a previous page link and a next page link', async () => {
            const resourceHandler = initializeResourceHandler({
                success: true,
                result: {
                    nextResultUrl: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=2&_count=1',
                    previousResultUrl: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=0&_count=1',
                    numberOfResults: 3,
                    message: '',
                    entries: [
                        {
                            fullUrl: 'https://API_URL.com/Patient/xcda',
                            resource: validPatient,
                            search: {
                                mode: 'match',
                            },
                        },
                    ],
                },
            });

            const searchResponse: any = await resourceHandler.search('Patient', {
                name: 'Henry',
                [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: 1,
                [SEARCH_PAGINATION_PARAMS.COUNT]: 1,
            });

            expect(searchResponse.resourceType).toEqual('Bundle');
            expect(searchResponse.meta).toBeDefined();
            expect(searchResponse.type).toEqual('searchset');
            expect(searchResponse.total).toEqual(3);
            expect(searchResponse.link).toEqual([
                {
                    relation: 'self',
                    url: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=1&_count=1',
                },
                {
                    relation: 'previous',
                    url: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=0&_count=1',
                },
                {
                    relation: 'next',
                    url: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=2&_count=1',
                },
            ]);

            expect(searchResponse.entry).toEqual([
                {
                    search: {
                        mode: 'match',
                    },
                    fullUrl: 'https://API_URL.com/Patient/xcda',
                    resource: validPatient,
                },
            ]);
        });
    });
});
