// eslint-disable-next-line import/extensions
import uuidv4 from 'uuid/v4';
import { Search } from '../interface/search';
import Validator from '../validation/validator';
import { Persistence } from '../interface/persistence';
import OperationsGenerator from '../operationsGenerator';
import CrudHandlerInterface from './CrudHandlerInterface';
import BundleGenerator from '../bundle/bundleGenerator';
import { generateMeta } from '../common/resourceMeta';
import NotFoundError from '../errors/NotFoundError';
import BadRequestError from '../errors/BadRequestError';
import InternalServerError from '../errors/InternalServerError';
import { FhirVersion } from '../interface/constants';

export default class ResourceHandler implements CrudHandlerInterface {
    private validator: Validator;

    private dataService: Persistence;

    private searchService: Search;

    private serverUrl: string;

    constructor(dataService: Persistence, searchService: Search, fhirVersion: FhirVersion, serverUrl: string) {
        this.validator = new Validator(fhirVersion);
        this.dataService = dataService;
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

        json.meta = generateMeta('1');

        const createResponse = await this.dataService.createResource({ resourceType, id, resource: json });
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
        const getResponse = await this.dataService.readResource({ resourceType, id });
        if (!getResponse.success) {
            const notFound = OperationsGenerator.generateResourceNotFoundError(resourceType, id);
            throw new NotFoundError(notFound);
        }
        const currentVId: number = getResponse.resource.meta
            ? parseInt(getResponse.resource.meta.versionId, 10) || 0
            : 0;

        // TODO does this work?
        json.meta = generateMeta((currentVId + 1).toString());

        const updateResponse = await this.dataService.updateResource({ resourceType, id, resource: json });
        if (!updateResponse.success) {
            const serverError = OperationsGenerator.generateError(updateResponse.message);
            throw new InternalServerError(serverError);
        }

        return updateResponse.resource;
    }

    async search(resourceType: string, queryParams: any) {
        const searchResponse = await this.searchService.typeSearch({
            resourceType,
            queryParams,
            baseUrl: this.serverUrl,
        });
        if (!searchResponse.success) {
            const errorMessage = searchResponse.result.message;
            const processingError = OperationsGenerator.generateProcessingError(errorMessage, errorMessage);
            throw new InternalServerError(processingError);
        }
        return BundleGenerator.generateSearchBundle(this.serverUrl, queryParams, searchResponse.result, resourceType);
    }

    async read(resourceType: string, id: string) {
        const getResponse = await this.dataService.readResource({ resourceType, id });
        if (!getResponse.success) {
            const errorDetail = OperationsGenerator.generateResourceNotFoundError(resourceType, id);
            throw new NotFoundError(errorDetail);
        }

        return getResponse.resource;
    }

    async vRead(resourceType: string, id: string, vid: string) {
        const getResponse = await this.dataService.vReadResource({ resourceType, id, vid });
        if (!getResponse.success) {
            const errorDetail = OperationsGenerator.generateHistoricResourceNotFoundError(resourceType, id, vid);
            throw new NotFoundError(errorDetail);
        }

        return getResponse.resource;
    }

    async delete(resourceType: string, id: string) {
        const deleteResponse = await this.dataService.deleteResource({ resourceType, id });
        if (!deleteResponse.success) {
            const resourceNotFound = OperationsGenerator.generateResourceNotFoundError(resourceType, id);
            throw new NotFoundError(resourceNotFound);
        }

        return OperationsGenerator.generateSuccessfulDeleteOperation(deleteResponse.resource.count);
    }
}
