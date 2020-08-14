/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { Search } from '../../interface/search';
import { History } from '../../interface/history';
import Validator from '../validation/validator';
import { Persistence } from '../../interface/persistence';
import OperationsGenerator from '../operationsGenerator';
import CrudHandlerInterface from './CrudHandlerInterface';
import BundleGenerator from '../bundle/bundleGenerator';
import { FhirVersion } from '../../interface/constants';

export default class ResourceHandler implements CrudHandlerInterface {
    private validator: Validator;

    private dataService: Persistence;

    private searchService: Search;

    private historyService: History;

    private serverUrl: string;

    constructor(
        dataService: Persistence,
        searchService: Search,
        historyService: History,
        fhirVersion: FhirVersion,
        serverUrl: string,
    ) {
        this.validator = new Validator(fhirVersion);
        this.dataService = dataService;
        this.searchService = searchService;
        this.historyService = historyService;
        this.serverUrl = serverUrl;
    }

    async create(resourceType: string, resource: any) {
        this.validator.validate(resourceType, resource);

        const createResponse = await this.dataService.createResource({ resourceType, resource });
        return createResponse.resource;
    }

    async update(resourceType: string, id: string, resource: any) {
        this.validator.validate(resourceType, resource);

        const updateResponse = await this.dataService.updateResource({ resourceType, id, resource });
        return updateResponse.resource;
    }

    async patch(resourceType: string, id: string, resource: any) {
        // TODO Add request validation around patching
        const patchResponse = await this.dataService.patchResource({ resourceType, id, resource });

        return patchResponse.resource;
    }

    async typeSearch(resourceType: string, queryParams: any) {
        const searchResponse = await this.searchService.typeSearch({
            resourceType,
            queryParams,
            baseUrl: this.serverUrl,
        });
        return BundleGenerator.generateBundle(
            this.serverUrl,
            queryParams,
            searchResponse.result,
            'searchset',
            resourceType,
        );
    }

    async typeHistory(resourceType: string, queryParams: any) {
        const historyResponse = await this.historyService.typeHistory({
            resourceType,
            queryParams,
            baseUrl: this.serverUrl,
        });
        return BundleGenerator.generateBundle(
            this.serverUrl,
            queryParams,
            historyResponse.result,
            'history',
            resourceType,
        );
    }

    async instanceHistory(resourceType: string, id: string, queryParams: any) {
        const historyResponse = await this.historyService.instanceHistory({
            id,
            resourceType,
            queryParams,
            baseUrl: this.serverUrl,
        });
        return BundleGenerator.generateBundle(
            this.serverUrl,
            queryParams,
            historyResponse.result,
            'history',
            resourceType,
            id,
        );
    }

    async read(resourceType: string, id: string) {
        const getResponse = await this.dataService.readResource({ resourceType, id });
        return getResponse.resource;
    }

    async vRead(resourceType: string, id: string, vid: string) {
        const getResponse = await this.dataService.vReadResource({ resourceType, id, vid });
        return getResponse.resource;
    }

    async delete(resourceType: string, id: string) {
        await this.dataService.deleteResource({ resourceType, id });
        return OperationsGenerator.generateSuccessfulDeleteOperation();
    }
}
