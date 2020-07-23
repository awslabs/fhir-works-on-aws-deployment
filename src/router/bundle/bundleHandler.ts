/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable class-methods-use-this */
import Validator from '../validation/validator';
import { MAX_BUNDLE_ENTRIES, SUPPORTED_R3_RESOURCES, SUPPORTED_R4_RESOURCES } from '../../constants';
import BadRequestError from '../../interface/errors/BadRequestError';
import OperationsGenerator from '../operationsGenerator';
import InternalServerError from '../../interface/errors/InternalServerError';
import { BatchReadWriteRequest, Bundle } from '../../interface/bundle';
import BundleHandlerInterface from './bundleHandlerInterface';
import BundleGenerator from './bundleGenerator';
import BundleParser from './bundleParser';
import { Authorization } from '../../interface/authorization';
import { FhirVersion, R3Resource, R4Resource } from '../../interface/constants';
import { GenericResource, Resources } from '../../interface/fhirConfig';

export default class BundleHandler implements BundleHandlerInterface {
    private bundleService: Bundle;

    private validator: Validator;

    readonly serverUrl: string;

    private authService: Authorization;

    private genericResource?: GenericResource;

    private resources?: Resources;

    private fhirVersion: FhirVersion;

    constructor(
        bundleService: Bundle,
        serverUrl: string,
        fhirVersion: FhirVersion,
        authService: Authorization,
        genericResource?: GenericResource,
        resources?: Resources,
    ) {
        this.bundleService = bundleService;
        this.serverUrl = serverUrl;
        this.authService = authService;
        this.validator = new Validator(fhirVersion);
        this.genericResource = genericResource;
        this.resources = resources;
        this.fhirVersion = fhirVersion;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async processBatch(bundleRequestJson: any, accessToken: string) {
        const invalidInput = OperationsGenerator.generatInputValidationError(
            'Currently this server only support transaction Bundles',
        );
        throw new BadRequestError(invalidInput);
    }

    serverSupportResourceTypeAndOperation(bundleRequestJson: any): boolean {
        const resourceTypeToOperations = BundleParser.getResourceTypeOperationsInBundle(bundleRequestJson);

        // TODO Check operation is valid
        for (let i = 0; i < Object.keys(resourceTypeToOperations).length; i += 1) {
            const bundleResourceType = Object.keys(resourceTypeToOperations)[i];
            const bundleResourceOperations = resourceTypeToOperations[bundleResourceType];
            // 'Special resource' includes bundle resourceType and Operation
            if (this.resources && Object.keys(this.resources).includes(bundleResourceType)) {
                const operationsInBundleThatServerDoesNotSupport = bundleResourceOperations.filter(operation => {
                    // @ts-ignore
                    return !this.resources[bundleResourceType].operations.includes(operation);
                });
                if (operationsInBundleThatServerDoesNotSupport.length === 0) {
                    return true;
                }
            }
            // 'Generic resource' includes bundle resourceType and Operation
            if (
                (this.fhirVersion === '4.0.1' &&
                    SUPPORTED_R4_RESOURCES.includes(<R4Resource>bundleResourceType) &&
                    this.genericResource &&
                    !this.genericResource.excludedR4Resources?.includes(<R4Resource>bundleResourceType)) ||
                (this.fhirVersion === '3.0.1' &&
                    SUPPORTED_R3_RESOURCES.includes(<R3Resource>bundleResourceType) &&
                    this.genericResource &&
                    !this.genericResource.excludedR4Resources?.includes(<R3Resource>bundleResourceType))
            ) {
                const operationsInBundleThatServerDoesNotSupport = bundleResourceOperations.filter(operation => {
                    return !this.genericResource?.operations.includes(operation);
                });
                if (operationsInBundleThatServerDoesNotSupport.length === 0) {
                    return true;
                }
            }
        }
        return false;
    }

    async processTransaction(bundleRequestJson: any, accessToken: string) {
        const startTime = new Date();

        const validationResponse = this.validator.validate('Bundle', bundleRequestJson);
        if (!validationResponse.success) {
            const invalidInput = OperationsGenerator.generatInputValidationError(validationResponse.message);
            throw new BadRequestError(invalidInput);
        }

        let requests: BatchReadWriteRequest[];
        try {
            // TODO use the correct persistence layer
            if (!this.serverSupportResourceTypeAndOperation(bundleRequestJson)) {
                throw new Error('Server is not capable of processing one of the entries in the Bundle');
            }
            if (this.genericResource) {
                requests = await BundleParser.parseResource(
                    bundleRequestJson,
                    this.genericResource.persistence,
                    this.serverUrl,
                );
            } else {
                throw new Error('Cannot process bundle');
            }
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
