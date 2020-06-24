// eslint-disable-next-line import/extensions
import mime from 'mime-types';
// eslint-disable-next-line import/extensions
import uuidv4 from 'uuid/v4';
import { SEPARATOR } from '../constants';
import Validator from '../validation/validator';
import DataServiceInterface from '../dataServices/dataServiceInterface';
import OperationsGenerator from '../operationsGenerator';
import ObjectStorageInterface from '../objectStorageService/objectStorageInterface';
import CrudHandlerInterface from './CrudHandlerInterface';
import { generateMeta } from '../common/resourceMeta';

export default class BinaryHandlerBase64 implements CrudHandlerInterface {
    readonly fhirVersion: Hearth.FhirVersion;

    private validator: Validator;

    private dataService: DataServiceInterface;

    private objectStorageService: ObjectStorageInterface;

    constructor(
        dataService: DataServiceInterface,
        objectStorageService: ObjectStorageInterface,
        fhirVersion: Hearth.FhirVersion,
    ) {
        this.dataService = dataService;
        this.objectStorageService = objectStorageService;
        this.validator = new Validator(fhirVersion);
        this.fhirVersion = fhirVersion;
    }

    private async uploadObject(id: string, versionId: string, contentType: string, binaryData: any) {
        const fileExtension = mime.extension(contentType);
        const fileName = `${id}${SEPARATOR}${versionId}.${fileExtension}`;
        const uploadObjResp = await this.objectStorageService.uploadObject(binaryData, fileName, contentType);
        if (!uploadObjResp.success) {
            await this.dataService.deleteVersionedResource('Binary', id, versionId);
            const message = 'Failed to add object to object storage';
            throw message;
        }
    }

    async create(resourceType: string, resource: any) {
        const validationResponse = this.validator.validate(resourceType, resource);
        if (!validationResponse.success) {
            return OperationsGenerator.generatInputValidationError(validationResponse.message);
        }

        const json = { ...resource };
        if (json.id) {
            delete json.id;
        }

        // Delete binary data because we don't want to store the content in the data service, we store the content
        // as an object in the objStorageService
        let binaryData: any;
        if (this.fhirVersion === '3.0.1') {
            binaryData = json.content;
            delete json.content;
        } else {
            binaryData = json.data;
            delete json.data;
        }

        json.meta = generateMeta(1);

        const id = uuidv4();
        const createResponse = await this.dataService.createResource(resourceType, id, json);
        if (!createResponse.success) {
            return OperationsGenerator.generateError(createResponse.message);
        }

        try {
            await this.uploadObject(id, json.meta.versionId, resource.contentType, binaryData);
        } catch (e) {
            return OperationsGenerator.generateError(e.message);
        }

        const createdResource = resource;
        createdResource.id = id;
        return createdResource;
    }

    async update(resourceType: string, id: string, resource: any) {
        const validationResponse = this.validator.validate(resourceType, resource);
        if (!validationResponse.success) {
            return OperationsGenerator.generatInputValidationError(validationResponse.message);
        }
        const json = { ...resource };

        const getResponse = await this.dataService.getResource(resourceType, id);
        if (!getResponse.success) {
            return OperationsGenerator.generateResourceNotFoundError(resourceType, id);
        }
        const currentVId: number = getResponse.resource.meta
            ? parseInt(getResponse.resource.meta.versionId, 10) || 0
            : 0;

        json.meta = generateMeta(currentVId + 1);

        let binaryData: any;
        if (this.fhirVersion === '3.0.1') {
            binaryData = json.content;
            delete json.content;
        } else {
            binaryData = json.data;
            delete json.data;
        }

        const updateResponse = await this.dataService.updateResource(resourceType, id, json);
        if (!updateResponse.success) {
            return OperationsGenerator.generateError(updateResponse.message);
        }

        try {
            await this.uploadObject(id, json.meta.versionId, resource.contentType, binaryData);
        } catch (e) {
            return OperationsGenerator.generateError(e.message);
        }

        const updatedResource = resource;
        updatedResource.id = id;
        return updatedResource;
    }

    async get(resourceType: string, id: string) {
        const getResponse = await this.dataService.getResource(resourceType, id);
        if (!getResponse.success) {
            return OperationsGenerator.generateResourceNotFoundError(resourceType, id);
        }

        const binary = await this.addBinaryFileFromS3(getResponse.resource);
        return JSON.stringify(binary);
    }

    async getHistory(resourceType: string, id: string, versionId: string) {
        const getResponse = await this.dataService.getVersionedResource(resourceType, id, versionId);
        if (!getResponse.success) {
            return OperationsGenerator.generateResourceNotFoundError(resourceType, id);
        }

        const binary = await this.addBinaryFileFromS3(getResponse.resource);
        return JSON.stringify(binary);
    }

    private async addBinaryFileFromS3(binary: any) {
        // TODO Handle case in which user wants the binary file returned directly, instead of as a JSON
        // http://hl7.org/fhir/STU3/binary.html
        const binaryCopy = { ...binary };
        const fileNameExtension = mime.extension(binaryCopy.contentType);
        const response = await this.objectStorageService.readObject(
            `${binaryCopy.id}${SEPARATOR}${binaryCopy.versionId}.${fileNameExtension}`,
        );
        if (!response.success) {
            const message = 'Unable to retrieve binary object from block storage';
            return OperationsGenerator.generateError(message);
        }

        // Add binary content to message
        if (this.fhirVersion === '3.0.1') {
            binaryCopy.content = response.message;
        } else {
            binaryCopy.data = response.message;
        }
        return binaryCopy;
    }

    async delete(resourceType: string, id: string) {
        const getResponse = await this.dataService.getResource(resourceType, id);
        if (getResponse.success) {
            const deleteObjResponse = await this.objectStorageService.deleteBasedOnPrefix(id);
            if (!deleteObjResponse.success) {
                const message = 'Failed to delete binary resource from object storage';
                return OperationsGenerator.generateError(message);
            }
        } else {
            return OperationsGenerator.generateResourceNotFoundError(resourceType, id);
        }

        const deleteResponse = await this.dataService.deleteResource(resourceType, id);
        if (!deleteResponse.success) {
            return OperationsGenerator.generateResourceNotFoundError(resourceType, id);
        }

        return OperationsGenerator.generateSuccessfulDeleteOperation(deleteResponse.resource.count);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,class-methods-use-this
    async search(resourceType: string, searchParams: any) {
        // TODO: Implement this function when writing code to allow upload of binary file to S3 directly using presigned S3 URL
    }
}
