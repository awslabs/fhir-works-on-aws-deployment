import { Search } from '../../interface/search';
import { History } from '../../interface/history';
import OperationsGenerator from '../operationsGenerator';
import BundleGenerator from '../bundle/bundleGenerator';
import InternalServerError from '../../interface/errors/InternalServerError';

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
        if (!searchResponse.success) {
            const errorMessage = searchResponse.result.message;
            const processingError = OperationsGenerator.generateProcessingError(errorMessage, errorMessage);
            throw new InternalServerError(processingError);
        }
        return BundleGenerator.generateBundle(this.serverUrl, queryParams, searchResponse.result, 'searchset');
    }

    async globalHistory(queryParams: any) {
        const historyResponse = await this.historyService.globalHistory({
            queryParams,
            baseUrl: this.serverUrl,
        });
        if (!historyResponse.success) {
            const errorMessage = historyResponse.result.message;
            const processingError = OperationsGenerator.generateProcessingError(errorMessage, errorMessage);
            throw new InternalServerError(processingError);
        }
        return BundleGenerator.generateBundle(this.serverUrl, queryParams, historyResponse.result, 'history');
    }
}
