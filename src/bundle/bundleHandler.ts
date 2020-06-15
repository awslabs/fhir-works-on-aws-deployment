/* eslint-disable class-methods-use-this */
import Validator from '../validation/validator';
import DataServiceInterface from '../dataServices/dataServiceInterface';
import { MAX_BUNDLE_ENTRIES, R4_RESOURCE, VERSION } from '../constants';
import BadRequestError from '../errors/BadRequestError';
import OperationsGenerator from '../operationsGenerator';
import InternalServerError from '../errors/InternalServerError';
import BatchReadWriteRequest from '../dataServices/ddb/batchReadWriteRequest';
import BundleHandlerInterface from './bundleHandlerInterface';
import BundleGenerator from './bundleGenerator';
import { BatchReadWriteErrorType } from '../dataServices/ddb/batchReadWriteServiceResponse';
import BundleParser from './bundleParser';
import AuthorizationInterface from '../authorization/authorizationInterface';

export default class BundleHandler implements BundleHandlerInterface {
    private validator: Validator;

    private dataService: DataServiceInterface;

    private authService: AuthorizationInterface;

    private readonly serverUrl: string;

    constructor(
        dataService: DataServiceInterface,
        authService: AuthorizationInterface,
        fhirVersion: VERSION,
        serverUrl: string,
    ) {
        this.dataService = dataService;
        this.authService = authService;
        this.validator = new Validator(fhirVersion);
        this.serverUrl = serverUrl;
    }

    async processTransaction(bundleRequestJson: any, accessKey: string) {
        const startTime = new Date();
        if (bundleRequestJson.type.toLowerCase() !== 'transaction') {
            const invalidInput = OperationsGenerator.generatInputValidationError(
                'Currently this server only support transaction Bundles',
            );
            throw new BadRequestError(invalidInput);
        }

        const validationResponse = this.validator.validate(R4_RESOURCE.Bundle, bundleRequestJson);
        if (!validationResponse.success) {
            const invalidInput = OperationsGenerator.generatInputValidationError(validationResponse.message);
            throw new BadRequestError(invalidInput);
        }

        let bundleEntryRequests: BatchReadWriteRequest[];
        try {
            bundleEntryRequests = await BundleParser.parseResource(bundleRequestJson, this.dataService, this.serverUrl);
        } catch (e) {
            const error = OperationsGenerator.generateError(e.message);
            throw new BadRequestError(error);
        }

        const authZPromises: Promise<boolean>[] = bundleEntryRequests.map(request => {
            return this.authService.isBatchRequestAuthorized(accessKey, request);
        });
        const authZResponses: boolean[] = await Promise.all(authZPromises);

        if (!authZResponses.every(Boolean)) {
            throw new BadRequestError('Forbidden');
        }

        if (bundleEntryRequests.length > MAX_BUNDLE_ENTRIES) {
            const invalidInput = OperationsGenerator.generateError(
                `Maximum number of entries for a Bundle is ${MAX_BUNDLE_ENTRIES}. There are currently ${bundleEntryRequests.length} entries in this Bundle`,
            );
            throw new BadRequestError(invalidInput);
        }

        const bundleServiceResponse = await this.dataService.atomicallyReadWriteResources(
            bundleEntryRequests,
            startTime,
        );
        if (!bundleServiceResponse.success) {
            const error = OperationsGenerator.generateError(bundleServiceResponse.message);
            if (bundleServiceResponse.errorType === BatchReadWriteErrorType.SYSTEM_ERROR) {
                throw new InternalServerError(error);
            } else if (bundleServiceResponse.errorType === BatchReadWriteErrorType.USER_ERROR) {
                throw new BadRequestError(error);
            }
        }

        return BundleGenerator.generateTransactionBundle(this.serverUrl, bundleServiceResponse.batchReadWriteResponses);
    }
}
