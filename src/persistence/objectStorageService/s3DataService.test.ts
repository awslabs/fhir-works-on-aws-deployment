/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line max-classes-per-file
import validV4PdfBinary from '../../../sampleData/validV4PdfBinary.json';
import validV4JpegBinary from '../../../sampleData/validV4JpegBinary.json';
import validV3JpegBinary from '../../../sampleData/validV3JpegBinary.json';
import DynamoDbDataService from '../dataServices/__mocks__/dynamoDbDataService';
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
import ResourceNotFoundError from '../../interface/errors/ResourceNotFoundError';
import ResourceVersionNotFoundError from '../../interface/errors/ResourceVersionNotFoundError';

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
        // BUILD
        // OPERATE
        const response = await s3DataService.createResource({ resourceType: 'Binary', resource: validV4PdfBinary });
        // CHECK
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
        // BUILD
        const id = 'id';

        // OPERATE
        const readResponse = await s3DataService.readResource({ resourceType: 'Binary', id });

        // CHECK
        expect(readResponse).toMatchObject({
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
        // BUILD
        const id = 'id';

        // OPERATE
        const updateResponse = await s3DataService.updateResource({
            resourceType: 'Binary',
            id,
            resource: validV4JpegBinary,
        });

        // CHECK
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
        // BUILD
        const id = 'id';

        // OPERATE
        const deleteResponse: GenericResponse = await s3DataService.deleteResource({ resourceType: 'Binary', id });
        expect(deleteResponse).toMatchObject({
            success: true,
            message: 'Resource deleted',
        });
        // CHECK
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
        // BUILD
        // OPERATE
        const response = await s3DataService.createResource({ resourceType: 'Binary', resource: validV3JpegBinary });

        // CHECK
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
        // BUILD
        const id = 'id';

        // OPERATE
        const updateResponse = await s3DataService.updateResource({
            resourceType: 'Binary',
            id,
            resource: validV4JpegBinary,
        });

        // CHECK
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
        // Ensures that for each test, we test the assertions in the catch block
        expect.hasAssertions();
    });

    test('read: binary does not exist', async () => {
        // BUILD
        DynamoDbDataService.readResource = jest.fn(async (request: ReadResourceRequest) => {
            throw new ResourceNotFoundError(request.resourceType, request.id);
        });
        const id = 'FAKE_ID';

        try {
            // OPERATE
            await s3DataService.readResource({ resourceType: 'Binary', id });
        } catch (e) {
            // CHECK
            expect(e).toEqual(new ResourceNotFoundError('Binary', id));
        }
    });

    test('vread: binary does not exist', async () => {
        // BUILD
        DynamoDbDataService.vReadResource = jest.fn(async (request: vReadResourceRequest) => {
            throw new ResourceVersionNotFoundError(request.resourceType, request.id, request.vid);
        });
        const id = 'FAKE_ID';

        try {
            // OPERATE
            await s3DataService.vReadResource({ resourceType: 'Binary', id, vid: '1' });
        } catch (e) {
            // CHECK
            expect(e).toMatchObject(new ResourceVersionNotFoundError('Binary', id, '1'));
        }
    });

    test('update: db update failed', async () => {
        // BUILD
        DynamoDbDataService.updateResource = jest.fn().mockRejectedValue(new Error('boom'));
        const id = 'FAKE_ID';

        // OPERATE
        try {
            await s3DataService.updateResource({
                resourceType: 'Binary',
                id,
                resource: validV4PdfBinary,
            });
        } catch (e) {
            // CHECK
            expect(e).toMatchObject(new Error('boom'));
        }
    });

    test('create: db create failed', async () => {
        // BUILD
        DynamoDbDataService.createResource = jest.fn().mockRejectedValue(new Error('boom'));
        const id = 'FAKE_ID';

        try {
            // OPERATE
            const updateResponse = await s3DataService.createResource({
                resourceType: 'Binary',
                id,
                resource: validV4PdfBinary,
            });
        } catch (e) {
            // CHECK
            expect(e).toMatchObject(new Error('boom'));
        }
    });

    test('delete: binary does not exist', async () => {
        const id = 'FAKE_ID';
        // BUILD
        DynamoDbDataService.readResource = jest.fn().mockRejectedValue(new ResourceNotFoundError('Binary', id));

        try {
            // OPERATE
            await s3DataService.deleteResource({ resourceType: 'Binary', id });
        } catch (e) {
            // CHECK
            expect(e).toMatchObject(new ResourceNotFoundError('Binary', id));
        }
    });

    test('delete: db delete failed', async () => {
        // BUILD
        DynamoDbDataService.readResource = jest.fn(async (request: ReadResourceRequest) => {
            return { success: true, message: 'Resource found' };
        });
        DynamoDbDataService.deleteResource = jest.fn().mockRejectedValue(new Error('Failed to delete'));
        const id = 'FAKE_ID';

        try {
            // OPERATE
            const deleteResponse = await s3DataService.deleteResource({ resourceType: 'Binary', id });
        } catch (e) {
            // CHECK
            expect(e).toMatchObject(new Error('Failed to delete'));
        }
    });
});
