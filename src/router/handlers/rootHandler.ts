/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { Search } from '../../interface/search';
import { History } from '../../interface/history';
import BundleGenerator from '../bundle/bundleGenerator';

export default class RootHandler {
    private searchService: Search;

    private historyService: History;

    private serverUrl: string;

    constructor(searchService: Search, historyService: History, serverUrl: string) {
        this.searchService = searchService;
        this.historyService = historyService;
        this.serverUrl = serverUrl;
    }

    async globalSearch(queryParams: any) {
        const searchResponse = await this.searchService.globalSearch({
            queryParams,
            baseUrl: this.serverUrl,
        });
        return BundleGenerator.generateBundle(this.serverUrl, queryParams, searchResponse.result, 'searchset');
    }

    async globalHistory(queryParams: any) {
        const historyResponse = await this.historyService.globalHistory({
            queryParams,
            baseUrl: this.serverUrl,
        });
        return BundleGenerator.generateBundle(this.serverUrl, queryParams, historyResponse.result, 'history');
    }
}
