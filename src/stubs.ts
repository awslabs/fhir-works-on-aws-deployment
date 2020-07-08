import { Search, TypeSearchRequest, SearchResponse, GlobalSearchRequest } from './interface/search';

const stubSearch: Search = class {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static typeSearch(request: TypeSearchRequest): Promise<SearchResponse> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static globalSearch(request: GlobalSearchRequest): Promise<SearchResponse> {
        throw new Error('Method not implemented.');
    }
};
export default stubSearch;
