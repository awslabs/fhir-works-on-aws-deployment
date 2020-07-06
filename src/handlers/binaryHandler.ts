// eslint-disable-next-line import/extensions
import mime from 'mime-types';
// eslint-disable-next-line import/extensions
import uuidv4 from 'uuid/v4';
import { SEPARATOR } from '../constants';
import Validator from '../validation/validator';
import { Persistence } from '../interface/persistence';
import OperationsGenerator from '../operationsGenerator';
import ObjectStorageInterface from '../objectStorageService/objectStorageInterface';
import CrudHandlerInterface from './CrudHandlerInterface';
import { generateMeta } from '../common/resourceMeta';
import BadRequestError from '../errors/BadRequestError';
import InternalServerError from '../errors/InternalServerError';
import NotFoundError from '../errors/NotFoundError';
import { FhirVersion } from '../interface/constants';

export default class BinaryHandler implements CrudHandlerInterface {
    private validator: Validator;

    constructor(
        private dataService: Persistence,
        private objectStorageService: ObjectStorageInterface,
        readonly fhirVersion: FhirVersion,
    ) {
        this.validator = new Validator(fhirVersion);
    }

    async create(resourceType: string, resource: any) {
        const validationResponse = this.validator.validate(resourceType, resource);
        if (!validationResponse.success) {
            const invalidInput = OperationsGenerator.generatInputValidationError(validationResponse.message);
            throw new BadRequestError(invalidInput);
        }

        const json = { ...resource };
        if (json.id) {
            delete json.id;
        }

        // Delete binary data because we don't want to store the content in the data service, we store the content
        // as an object in the objStorageService
        if (this.fhirVersion === '3.0.1') {
            delete json.content;
        } else {
            delete json.data;
        }

        json.meta = generateMeta('1');

        const id = uuidv4();
        const createResponse = await this.dataService.createResource({ resourceType, id, resource: json });
        if (!createResponse.success) {
            const serverError = OperationsGenerator.generateError(createResponse.message);
            throw new InternalServerError(serverError);
        }

        const fileName = BinaryHandler.getFileName(id, json.meta.versionId, resource.contentType);

        const presignedPutUrlResponse = await this.objectStorageService.getPresignedPutUrl(fileName);
        if (!presignedPutUrlResponse.success) {
            await this.dataService.deleteResource({ resourceType, id });
            const message = 'Failed to generate presigned PUT Url';
            const serverError = OperationsGenerator.generateProcessingError(message, message);
            throw new InternalServerError(serverError);
        }

        const updatedResource = { ...json };
        updatedResource.id = id;
        updatedResource.presignedPutUrl = presignedPutUrlResponse.message;
        return updatedResource;
    }

    // After getting the response from the PUT request, you can use CURL to upload the binary file
    // curl -X PUT -T "<LOCATION_OF_FILE_TO_UPLOAD>" "<PRESIGNED_PUT_URL"
    // Exp.
    // curl -X PUT -T "./application.pdf" "https://S3_PUT_URL.com"

    async update(resourceType: string, id: string, resource: any) {
        const validationResponse = this.validator.validate(resourceType, resource);
        if (!validationResponse.success) {
            const invalidInput = OperationsGenerator.generatInputValidationError(validationResponse.message);
            throw new BadRequestError(invalidInput);
        }

        const json = { ...resource };
        const getResponse = await this.dataService.readResource({ resourceType, id });
        if (!getResponse.success) {
            const notFound = OperationsGenerator.generateResourceNotFoundError(resourceType, id);
            throw new NotFoundError(notFound);
        }

        const currentVId: number = getResponse.resource.meta
            ? parseInt(getResponse.resource.meta.versionId, 10) || 0
            : 0;

        // TODO validate this works
        json.meta = generateMeta((currentVId + 1).toString());

        if (this.fhirVersion === '3.0.1') {
            delete json.content;
        } else {
            delete json.data;
        }

        const updateResponse = await this.dataService.updateResource({ resourceType, id, resource: json });
        if (!updateResponse.success) {
            const serverError = OperationsGenerator.generateProcessingError(
                updateResponse.message,
                updateResponse.message,
            );
            throw new InternalServerError(serverError);
        }

        const fileName = BinaryHandler.getFileName(id, json.meta.versionId, resource.contentType);
        const presignedPutUrlResponse = await this.objectStorageService.getPresignedPutUrl(fileName);

        if (!presignedPutUrlResponse.success) {
            // Restore the original resource in the data service, if we failed to update the resource's Obj
            await this.dataService.updateResource({ resourceType, id, resource: getResponse.resource });
            const message = 'Failed to generate PUT Url';
            const serverError = OperationsGenerator.generateProcessingError(message, message);
            throw new InternalServerError(serverError);
        }

        const updatedResource = { ...json };
        updatedResource.id = id;
        updatedResource.presignedPutUrl = presignedPutUrlResponse.message;

        return updatedResource;
    }

    async read(resourceType: string, id: string) {
        const getResponse = await this.dataService.readResource({ resourceType, id });
        if (!getResponse.success) {
            const notFound = OperationsGenerator.generateResourceNotFoundError(resourceType, id);
            throw new NotFoundError(notFound);
        }
        // TODO Handle case in which user wants the binary file returned directly, instead of as a JSON
        // http://hl7.org/fhir/STU3/binary.html
        return this.vRead(resourceType, id, getResponse.resource.meta.versionId);
    }

    async delete(resourceType: string, id: string) {
        const getResponse = await this.dataService.readResource({ resourceType, id });
        if (getResponse.success) {
            const deleteObjResponse = await this.objectStorageService.deleteBasedOnPrefix(id);
            if (!deleteObjResponse.success) {
                const message = 'Failed to delete binary resource from object storage';
                const serverError = OperationsGenerator.generateProcessingError(message, message);
                throw new InternalServerError(serverError);
            }
        } else {
            const notFound = OperationsGenerator.generateResourceNotFoundError(resourceType, id);
            throw new NotFoundError(notFound);
        }

        const deleteResponse = await this.dataService.deleteResource({ resourceType, id });
        if (!deleteResponse.success) {
            const notFound = OperationsGenerator.generateResourceNotFoundError(resourceType, id);
            throw new NotFoundError(notFound);
        }

        return OperationsGenerator.generateSuccessfulDeleteOperation(deleteResponse.resource.count);
    }

    async vRead(resourceType: string, id: string, vid: string) {
        const getResponse = await this.dataService.vReadResource({ resourceType, id, vid });

        if (!getResponse.success) {
            const notFound = OperationsGenerator.generateResourceNotFoundError(resourceType, id);
            throw new NotFoundError(notFound);
        }

        const fileName = BinaryHandler.getFileName(
            id,
            getResponse.resource.meta.versionId,
            getResponse.resource.contentType,
        );
        const presignedGetUrlResponse = await this.objectStorageService.getPresignedGetUrl(fileName);

        if (!presignedGetUrlResponse.success) {
            const message = 'Unable to retrieve binary object from block storage';
            const serverError = OperationsGenerator.generateProcessingError(message, message);
            throw new InternalServerError(serverError);
        }

        const binary = getResponse.resource;
        // Add binary content to message
        binary.presignedGetUrl = presignedGetUrlResponse.message;

        return binary;
    }

    private static getFileName(id: string, versionId: string, contentType: string) {
        const fileExtension = mime.extension(contentType);
        return `${id}${SEPARATOR}${versionId}.${fileExtension}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,class-methods-use-this
    async search(resourceType: string, searchParams: any) {
        // FHIR specfication does not support search for Binary
        throw new Error('Base on FHIR specification Binary resource does not handle search');
    }
}
