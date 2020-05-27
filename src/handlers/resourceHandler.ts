// eslint-disable-next-line import/extensions
import uuidv4 from 'uuid/v4';
import Validator from '../validation/validator';
import DataServiceInterface from '../dataServices/dataServiceInterface';
import OperationsGenerator from '../operationsGenerator';
import CrudHandlerInterface from './CrudHandlerInterface';
import BundleGenerator from '../bundle/bundleGenerator';
import SearchServiceInterface from '../searchService/searchServiceInterface';
import { VERSION } from '../constants';
import { generateMeta } from '../common/resourceMeta';
import NotFoundError from '../errors/NotFoundError';
import BadRequestError from '../errors/BadRequestError';
import InternalServerError from '../errors/InternalServerError';

export default class ResourceHandler implements CrudHandlerInterface {
    private validator: Validator;

    private dataService: DataServiceInterface;

    private searchService: SearchServiceInterface;

    private serverUrl: string;

    constructor(
        dataService: DataServiceInterface,
        searchService: SearchServiceInterface,
        fhirVersion: VERSION,
        serverUrl: string,
    ) {
        this.dataService = dataService;
        this.validator = new Validator(fhirVersion);
        this.searchService = searchService;
        this.serverUrl = serverUrl;
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

        const id = uuidv4();

        json.meta = generateMeta(1);

        const createResponse = await this.dataService.createResource(resourceType, id, json);
        if (!createResponse.success) {
            const serverError = OperationsGenerator.generateError(createResponse.message);
            throw new InternalServerError(serverError);
        }

        return createResponse.resource;
    }

    async update(resourceType: string, id: string, resource: any) {
        const validationResponse = this.validator.validate(resourceType, resource);
        if (!validationResponse.success) {
            const invalidInput = OperationsGenerator.generatInputValidationError(validationResponse.message);
            throw new BadRequestError(invalidInput);
        }

        const json = { ...resource };
        const getResponse = await this.dataService.getResource(resourceType, id);
        if (!getResponse.success) {
            const notFound = OperationsGenerator.generateResourceNotFoundError(resourceType, id);
            throw new NotFoundError(notFound);
        }
        const currentVId: number = getResponse.resource.meta
            ? parseInt(getResponse.resource.meta.versionId, 10) || 0
            : 0;

        json.meta = generateMeta(currentVId + 1);

        const updateResponse = await this.dataService.updateResource(resourceType, id, json);
        if (!updateResponse.success) {
            const serverError = OperationsGenerator.generateError(updateResponse.message);
            throw new InternalServerError(serverError);
        }

        return updateResponse.resource;
    }

    async search(resourceType: string, searchParams: any) {
        const searchResponse = await this.searchService.search(resourceType, searchParams);
        if (!searchResponse.success) {
            const errorMessage = searchResponse.result.message;
            const processingError = OperationsGenerator.generateProcessingError(errorMessage, errorMessage);
            throw new InternalServerError(processingError);
        }
        return BundleGenerator.generateSearchBundle(this.serverUrl, resourceType, searchParams, searchResponse.result);
    }

    async get(resourceType: string, id: string) {
        const getResponse = await this.dataService.getResource(resourceType, id);
        if (!getResponse.success) {
            const errorDetail = OperationsGenerator.generateResourceNotFoundError(resourceType, id);
            throw new NotFoundError(errorDetail);
        }

        return getResponse.resource;
    }

    async getHistory(resourceType: string, id: string, versionId: string) {
        const getResponse = await this.dataService.getVersionedResource(resourceType, id, versionId);
        if (!getResponse.success) {
            const errorDetail = OperationsGenerator.generateHistoricResourceNotFoundError(resourceType, id, versionId);
            throw new NotFoundError(errorDetail);
        }

        return getResponse.resource;
    }

    async delete(resourceType: string, id: string) {
        const deleteResponse = await this.dataService.deleteResource(resourceType, id);
        if (!deleteResponse.success) {
            const resourceNotFound = OperationsGenerator.generateResourceNotFoundError(resourceType, id);
            throw new NotFoundError(resourceNotFound);
        }

        return OperationsGenerator.generateSuccessfulDeleteOperation(deleteResponse.resource.count);
    }
}
