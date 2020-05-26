import SearchResult from './searchResult';

export default class SearchServiceResponse {
    readonly success: boolean = false;

    readonly result: SearchResult;

    constructor(success: boolean, result: SearchResult) {
        this.success = success;
        this.result = result;
    }
}
