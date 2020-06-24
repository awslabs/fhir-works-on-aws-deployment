/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line max-classes-per-file
import BinaryHandler from './binaryHandler';
import validV4PdfBinary from '../../sampleData/validV4PdfBinary.json';
import validV4JpegBinary from '../../sampleData/validV4JpegBinary.json';
import OperationsGenerator from '../operationsGenerator';
import DynamoDbDataService from '../dataServices/ddb/__mocks__/dynamoDbDataService';
import S3ObjectStorageService from '../objectStorageService/s3ObjectStorageService';
import { generateMeta } from '../common/resourceMeta';
import ServiceResponse from '../common/serviceResponse';

jest.mock('../objectStorageService/s3ObjectStorageService');

describe('SUCCESS CASES: Testing create, read, update, delete of resources', () => {
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

    DynamoDbDataService.getVersionedResource = jest.fn((resourceType: string, id: string, versionId: string) => {
        const resourceCopy: any = { ...binaryJsonWithGetUrl };
        resourceCopy.id = id;
        resourceCopy.meta = generateMeta(parseInt(versionId, 10));
        return Promise.resolve(new ServiceResponse(true, 'Resource found', resourceCopy));
    });

    const binaryHandler = new BinaryHandler(DynamoDbDataService, S3ObjectStorageService, '4.0.1');

    test('create', async () => {
        const response = await binaryHandler.create('Binary', validV4PdfBinary);

        expect(response).toMatchObject({
            resourceType: 'Binary',
            contentType: 'application/pdf',
            presignedPutUrl: 'https://VALID_S3_PUT_URL.com',
        });

        expect(response.data).toBeUndefined();
        expect(response.content).toBeUndefined();
        expect(response.id).toBeDefined();
        expect(response.meta).toBeDefined();
    });

    test('read', async () => {
        // Create Binary
        const createResponse = await binaryHandler.create('Binary', validV4PdfBinary);
        const readResponse = await binaryHandler.get('Binary', createResponse.id);

        expect(readResponse).toMatchObject({
            resourceType: 'Binary',
            contentType: 'application/pdf',
            presignedGetUrl: 'https://VALID_S3_GET_URL.com',
        });

        expect(readResponse.data).not.toBeDefined();
        expect(readResponse.content).not.toBeDefined();
        expect(readResponse.id).toBeDefined();
        expect(readResponse.meta).toBeDefined();
    });

    test('update', async () => {
        // Create Binary
        const createResponse = await binaryHandler.create('Binary', validV4JpegBinary);
        // Update Binary
        const updateResponse = await binaryHandler.update('Binary', createResponse.id, validV4PdfBinary);

        expect(updateResponse).toMatchObject({
            resourceType: 'Binary',
            contentType: 'application/pdf',
            presignedPutUrl: 'https://VALID_S3_PUT_URL.com',
        });

        expect(updateResponse.data).not.toBeDefined();
        expect(updateResponse.content).not.toBeDefined();
        expect(updateResponse.id).toBeDefined();
        expect(updateResponse.meta).toBeDefined();
    });

    test('delete', async () => {
        // Create Binary
        const createResponse = await binaryHandler.create('Binary', validV4JpegBinary);
        // Delete Binary
        const deleteResponse = await binaryHandler.delete('Binary', createResponse.id);

        expect(deleteResponse).toEqual(OperationsGenerator.generateSuccessfulDeleteOperation(3));
    });
});

describe('ERROR CASES: Testing create, read, update, delete of resources', () => {
    const binaryHandler = new BinaryHandler(DynamoDbDataService, S3ObjectStorageService, '4.0.1');

    beforeEach(() => {
        // Ensures that for each test, we test the assertions in the catch block
        expect.hasAssertions();
    });

    test('create: invalid binary', async () => {
        try {
            const invalidBinary = {
                resourceType: 'Binary',
                invalidField: 'image/jpeg',
                data: 'abcd',
            };
            await binaryHandler.create('Binary', invalidBinary);
        } catch (e) {
            expect(e.name).toEqual('BadRequestError');
            expect(e.statusCode).toEqual(400);
            expect(e.errorDetail).toEqual(
                OperationsGenerator.generatInputValidationError('data should NOT have additional properties'),
            );
        }
    });

    test('read: binary does not exist', async () => {
        DynamoDbDataService.getResource = jest.fn((resourceType: string, id: string) => {
            return Promise.resolve(new ServiceResponse(false, 'Resource not found', {}));
        });
        const id = 'FAKE_ID';
        try {
            await binaryHandler.get('Binary', 'FAKE_ID');
        } catch (e) {
            expect(e.name).toEqual('NotFoundError');
            expect(e.statusCode).toEqual(404);
            expect(e.errorDetail).toEqual(OperationsGenerator.generateResourceNotFoundError('Binary', id));
        }
    });

    test('history: binary does not exist', async () => {
        DynamoDbDataService.getVersionedResource = jest.fn((resourceType: string, id: string) => {
            return Promise.resolve(new ServiceResponse(false, 'Resource not found', {}));
        });
        const id = 'FAKE_ID';
        try {
            await binaryHandler.getHistory('Binary', 'FAKE_ID', '1');
        } catch (e) {
            expect(e.name).toEqual('NotFoundError');
            expect(e.statusCode).toEqual(404);
            expect(e.errorDetail).toEqual(OperationsGenerator.generateResourceNotFoundError('Binary', id));
        }
    });

    test('update: invalid binary ', async () => {
        try {
            const invalidBinary = {
                resourceType: 'Binary',
                invalidField: 'image/jpeg',
                data: 'abcd',
            };

            await binaryHandler.update('Binary', 'id-xyz', invalidBinary);
        } catch (e) {
            expect(e.name).toEqual('BadRequestError');
            expect(e.statusCode).toEqual(400);
            expect(e.errorDetail).toEqual(
                OperationsGenerator.generatInputValidationError('data should NOT have additional properties'),
            );
        }
    });

    test('update: binary not found ', async () => {
        DynamoDbDataService.getResource = jest.fn((resourceType: string, id: string) => {
            return Promise.resolve(new ServiceResponse(false, 'Resource not found', {}));
        });
        const id = 'FAKE_ID';
        try {
            await binaryHandler.update('Binary', id, validV4PdfBinary);
        } catch (e) {
            expect(e.name).toEqual('NotFoundError');
            expect(e.statusCode).toEqual(404);
            expect(e.errorDetail).toEqual(OperationsGenerator.generateResourceNotFoundError('Binary', id));
        }
    });

    test('delete: binary does not exist', async () => {
        DynamoDbDataService.getResource = jest.fn((resourceType: string, id: string) => {
            return Promise.resolve(new ServiceResponse(false, 'Resource not found', {}));
        });
        const id = 'FAKE_ID';
        try {
            await binaryHandler.delete('Binary', 'FAKE_ID');
        } catch (e) {
            expect(e.name).toEqual('NotFoundError');
            expect(e.statusCode).toEqual(404);
            expect(e.errorDetail).toEqual(OperationsGenerator.generateResourceNotFoundError('Binary', id));
        }
    });
});
