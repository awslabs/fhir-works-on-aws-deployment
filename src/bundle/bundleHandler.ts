/* eslint-disable class-methods-use-this */
import Validator from '../validation/validator';
import { Persistence } from '../interface/persistence';
import { MAX_BUNDLE_ENTRIES } from '../constants';
import BadRequestError from '../errors/BadRequestError';
import OperationsGenerator from '../operationsGenerator';
import InternalServerError from '../errors/InternalServerError';
import { BatchReadWriteRequest, Bundle } from '../interface/bundle';
import BundleHandlerInterface from './bundleHandlerInterface';
import BundleGenerator from './bundleGenerator';
import BundleParser from './bundleParser';
import { Authorization } from '../interface/authorization';
import { FhirVersion } from '../interface/constants';

export default class BundleHandler implements BundleHandlerInterface {
    private validator: Validator;

    constructor(
        private dataService: Persistence,
        private bundleService: Bundle,
        private authService: Authorization,
        readonly serverUrl: string,
        fhirVersion: FhirVersion,
    ) {
        this.validator = new Validator(fhirVersion);
    }

    async processTransaction(bundleRequestJson: any, accessToken: string) {
        const startTime = new Date();
        if (bundleRequestJson.type.toLowerCase() !== 'transaction') {
            const invalidInput = OperationsGenerator.generatInputValidationError(
                'Currently this server only support transaction Bundles',
            );
            throw new BadRequestError(invalidInput);
        }

        const validationResponse = this.validator.validate('Bundle', bundleRequestJson);
        if (!validationResponse.success) {
            const invalidInput = OperationsGenerator.generatInputValidationError(validationResponse.message);
            throw new BadRequestError(invalidInput);
        }

        let requests: BatchReadWriteRequest[];
        try {
            requests = await BundleParser.parseResource(bundleRequestJson, this.dataService, this.serverUrl);
        } catch (e) {
            const error = OperationsGenerator.generateError(e.message);
            throw new BadRequestError(error);
        }

        const isAllowed: boolean = await this.authService.isBundleRequestAuthorized({
            accessToken,
            requests,
        });
        if (!isAllowed) {
            throw new BadRequestError('Forbidden');
        }

        if (requests.length > MAX_BUNDLE_ENTRIES) {
            const invalidInput = OperationsGenerator.generateError(
                `Maximum number of entries for a Bundle is ${MAX_BUNDLE_ENTRIES}. There are currently ${requests.length} entries in this Bundle`,
            );
            throw new BadRequestError(invalidInput);
        }

        const bundleServiceResponse = await this.bundleService.transaction({ requests, startTime });
        if (!bundleServiceResponse.success) {
            const error = OperationsGenerator.generateError(bundleServiceResponse.message);
            if (bundleServiceResponse.errorType === 'SYSTEM_ERROR') {
                throw new InternalServerError(error);
            } else if (bundleServiceResponse.errorType === 'USER_ERROR') {
                throw new BadRequestError(error);
            }
        }

        return BundleGenerator.generateTransactionBundle(this.serverUrl, bundleServiceResponse.batchReadWriteResponses);
    }
}
