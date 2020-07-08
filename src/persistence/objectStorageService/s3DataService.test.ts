/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line max-classes-per-file
import validV4PdfBinary from '../../../sampleData/validV4PdfBinary.json';
import validV4JpegBinary from '../../../sampleData/validV4JpegBinary.json';
import validV3JpegBinary from '../../../sampleData/validV3JpegBinary.json';
import OperationsGenerator from '../../router/operationsGenerator';
import DynamoDbDataService from '../dataServices/__mocks__/dynamoDbDataService';
import S3ObjectStorageService from './s3ObjectStorageService';
import { generateMeta } from '../../interface/resourceMeta';
import {
    vReadResourceRequest,
    ReadResourceRequest,
    UpdateResourceRequest,
    CreateResourceRequest,
    DeleteResourceRequest,
} from '../../interface/persistence';
import S3DataService from './s3DataService';
import GenericResponse from '../../interface/genericResponse';

jest.mock('../../persistence/objectStorageService/s3ObjectStorageService');

describe('SUCCESS CASES: Testing create, read, update, delete of resources; version 4', () => {
    const binaryJsonWithGetUrl = {
        resourceType: 'Binary',
        contentType: 'application/pdf',
        meta: {
            versionId: '1',
            lastUpdated: '2020-03-12T21:14:53.163Z',
        },
        id: '3a8bce46-c8e0-4f1e-9821-32fbb6184234',
        presignedPutUrl: 'https://S3_PUT_URL.com',
    };

    DynamoDbDataService.vReadResource = jest.fn(async (request: vReadResourceRequest) => {
        const resourceCopy: any = { ...binaryJsonWithGetUrl };
        resourceCopy.id = request.id;
        resourceCopy.meta = generateMeta(request.vid);
        return { success: true, message: 'Resource found', resource: resourceCopy };
    });
    DynamoDbDataService.readResource = jest.fn(async (request: ReadResourceRequest) => {
        const resourceCopy: any = { ...binaryJsonWithGetUrl };
        resourceCopy.id = request.id;
        resourceCopy.meta = generateMeta('1');
        return { success: true, message: 'Resource found', resource: resourceCopy };
    });

    const s3DataService = new S3DataService(DynamoDbDataService, '4.0.1');

    test('create', async () => {
        const response = await s3DataService.createResource({ resourceType: 'Binary', resource: validV4PdfBinary });

        expect(response).toMatchObject({
            success: true,
            message: 'Resource created',
            resource: {
                resourceType: 'Binary',
                contentType: 'application/pdf',
                presignedPutUrl: 'https://VALID_S3_PUT_URL.com',
            },
        });

        expect(response.resource.data).toBeUndefined();
        expect(response.resource.content).toBeUndefined();
        expect(response.resource.id).toBeDefined();
        expect(response.resource.meta).toBeDefined();
    });

    test('read', async () => {
        const id = 'id';
        const readResponse = await s3DataService.readResource({ resourceType: 'Binary', id });

        expect(readResponse).toMatchObject({
            success: true,
            message: 'Item found',
            resource: {
                resourceType: 'Binary',
                contentType: 'application/pdf',
                presignedGetUrl: 'https://VALID_S3_GET_URL.com',
            },
        });

        expect(readResponse.resource.data).toBeUndefined();
        expect(readResponse.resource.content).toBeUndefined();
        expect(readResponse.resource.id).toBeDefined();
        expect(readResponse.resource.meta).toBeDefined();
    });

    test('update', async () => {
        const id = 'id';
        const updateResponse = await s3DataService.updateResource({
            resourceType: 'Binary',
            id,
            resource: validV4JpegBinary,
        });

        expect(updateResponse).toMatchObject({
            success: true,
            message: 'Resource updated',
            resource: {
                resourceType: 'Binary',
                contentType: 'image/jpeg',
                presignedPutUrl: 'https://VALID_S3_PUT_URL.com',
            },
        });

        expect(updateResponse.resource.data).toBeUndefined();
        expect(updateResponse.resource.content).toBeUndefined();
        expect(updateResponse.resource.id).toBeDefined();
        expect(updateResponse.resource.meta).toBeDefined();
    });

    test('delete', async () => {
        const id = 'id';
        const deleteResponse: GenericResponse = await s3DataService.deleteResource({ resourceType: 'Binary', id });
        expect(deleteResponse).toMatchObject({
            success: true,
            message: 'Resource deleted',
        });

        expect(deleteResponse.resource).toBeUndefined();
    });
});

describe('SUCCESS CASES: Testing create, read, update, delete of resources; version 3', () => {
    const binaryJsonWithGetUrl = {
        resourceType: 'Binary',
        contentType: 'application/pdf',
        meta: {
            versionId: '1',
            lastUpdated: '2020-03-12T21:14:53.163Z',
        },
        id: '3a8bce46-c8e0-4f1e-9821-32fbb6184234',
        presignedPutUrl: 'https://S3_PUT_URL.com',
    };

    DynamoDbDataService.vReadResource = jest.fn(async (request: vReadResourceRequest) => {
        const resourceCopy: any = { ...binaryJsonWithGetUrl };
        resourceCopy.id = request.id;
        resourceCopy.meta = generateMeta(request.vid);
        return { success: true, message: 'Resource found', resource: resourceCopy };
    });
    DynamoDbDataService.readResource = jest.fn(async (request: ReadResourceRequest) => {
        const resourceCopy: any = { ...binaryJsonWithGetUrl };
        resourceCopy.id = request.id;
        resourceCopy.meta = generateMeta('1');
        return { success: true, message: 'Resource found', resource: resourceCopy };
    });

    const s3DataService = new S3DataService(DynamoDbDataService, '3.0.1');

    test('create', async () => {
        const response = await s3DataService.createResource({ resourceType: 'Binary', resource: validV3JpegBinary });

        expect(response).toMatchObject({
            success: true,
            message: 'Resource created',
            resource: {
                resourceType: 'Binary',
                contentType: 'image/jpeg',
                presignedPutUrl: 'https://VALID_S3_PUT_URL.com',
            },
        });

        expect(response.resource.data).toBeUndefined();
        expect(response.resource.content).toBeUndefined();
        expect(response.resource.id).toBeDefined();
        expect(response.resource.meta).toBeDefined();
    });

    test('update', async () => {
        const id = 'id';
        const updateResponse = await s3DataService.updateResource({
            resourceType: 'Binary',
            id,
            resource: validV4JpegBinary,
        });

        expect(updateResponse).toMatchObject({
            success: true,
            message: 'Resource updated',
            resource: {
                resourceType: 'Binary',
                contentType: 'image/jpeg',
                presignedPutUrl: 'https://VALID_S3_PUT_URL.com',
            },
        });

        expect(updateResponse.resource.data).toBeUndefined();
        expect(updateResponse.resource.content).toBeUndefined();
        expect(updateResponse.resource.id).toBeDefined();
        expect(updateResponse.resource.meta).toBeDefined();
    });
});

describe('ERROR CASES: Testing create, read, update, delete of resources', () => {
    const s3DataService = new S3DataService(DynamoDbDataService, '4.0.1');

    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('read: binary does not exist', async () => {
        DynamoDbDataService.readResource = jest.fn(async (request: ReadResourceRequest) => {
            return { success: false, message: 'Resource not found' };
        });
        const id = 'FAKE_ID';
        const readResponse = await s3DataService.readResource({ resourceType: 'Binary', id });
        expect(readResponse).toMatchObject({ success: false, message: 'Resource not found' });
    });

    test('vread: binary does not exist', async () => {
        DynamoDbDataService.vReadResource = jest.fn(async (request: vReadResourceRequest) => {
            return { success: false, message: 'Resource not found' };
        });
        const id = 'FAKE_ID';
        const readResponse = await s3DataService.vReadResource({ resourceType: 'Binary', id, vid: '1' });
        expect(readResponse).toMatchObject({ success: false, message: 'Resource not found' });
    });

    test('update: db update failed', async () => {
        DynamoDbDataService.updateResource = jest.fn(async (request: UpdateResourceRequest) => {
            return { success: false, message: 'Failed to update resource' };
        });
        const id = 'FAKE_ID';
        const updateResponse = await s3DataService.updateResource({
            resourceType: 'Binary',
            id,
            resource: validV4PdfBinary,
        });
        expect(updateResponse).toMatchObject({ success: false, message: 'Failed to update resource' });
    });

    test('create: db create failed', async () => {
        DynamoDbDataService.createResource = jest.fn(async (request: CreateResourceRequest) => {
            return { success: false, message: 'Failed to create new resource' };
        });
        const id = 'FAKE_ID';
        const updateResponse = await s3DataService.createResource({
            resourceType: 'Binary',
            id,
            resource: validV4PdfBinary,
        });
        expect(updateResponse).toMatchObject({ success: false, message: 'Failed to create new resource' });
    });

    test('delete: binary does not exist', async () => {
        DynamoDbDataService.readResource = jest.fn(async (request: ReadResourceRequest) => {
            return { success: false, message: 'Resource not found' };
        });
        const id = 'FAKE_ID';
        const deleteResponse = await s3DataService.deleteResource({ resourceType: 'Binary', id });
        expect(deleteResponse).toMatchObject({ success: false, message: 'Resource not found' });
    });

    test('delete: db delete failed', async () => {
        DynamoDbDataService.readResource = jest.fn(async (request: ReadResourceRequest) => {
            return { success: true, message: 'Resource found' };
        });
        DynamoDbDataService.deleteResource = jest.fn(async (request: DeleteResourceRequest) => {
            return { success: false, message: 'Failed to delete' };
        });
        const id = 'FAKE_ID';
        const deleteResponse = await s3DataService.deleteResource({ resourceType: 'Binary', id });
        expect(deleteResponse).toMatchObject({ success: false, message: 'Failed to delete' });
    });
});
