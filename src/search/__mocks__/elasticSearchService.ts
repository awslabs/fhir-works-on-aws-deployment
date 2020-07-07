import { Search, SearchResponse, GlobalSearchRequest, TypeSearchRequest } from '../../interface/search';

const ElasticSearchService: Search = class {
    /*
    searchParams => {field: value}
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async typeSearch(request: TypeSearchRequest) {
        return {
            success: true,
            result: {
                numberOfResults: 0,
                message: '',
                entries: [],
            },
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static globalSearch(request: GlobalSearchRequest): Promise<SearchResponse> {
        throw new Error('Method not implemented.');
    }
};
export default ElasticSearchService;
