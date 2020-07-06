/* eslint-disable no-underscore-dangle */
import URL from 'url';
import ElasticSearch from './elasticSearch';
import { DEFAULT_SEARCH_RESULTS_PER_PAGE, SEARCH_PAGINATION_PARAMS } from '../constants';
import {
    Search,
    TypeSearchRequest,
    SearchResult,
    SearchResponse,
    GlobalSearchRequest,
    SearchEntry,
} from '../interface/search';

const ElasticSearchService: Search = class {
    /*
    searchParams => {field: value}
     */
    static async typeSearch(request: TypeSearchRequest): Promise<SearchResponse> {
        const { queryParams, resourceType } = request;
        try {
            const from = queryParams[SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]
                ? Number(queryParams[SEARCH_PAGINATION_PARAMS.PAGES_OFFSET])
                : 0;

            const size = queryParams[SEARCH_PAGINATION_PARAMS.COUNT]
                ? Number(queryParams[SEARCH_PAGINATION_PARAMS.COUNT])
                : DEFAULT_SEARCH_RESULTS_PER_PAGE;

            // Exp. {gender: 'male', name: 'john'}
            const searchFieldToValue = { ...queryParams };
            delete searchFieldToValue[SEARCH_PAGINATION_PARAMS.PAGES_OFFSET];
            delete searchFieldToValue[SEARCH_PAGINATION_PARAMS.COUNT];

            const must: any = [];
            // TODO Implement fuzzy matches
            Object.keys(searchFieldToValue).forEach(field => {
                // id is mapped in ElasticSearch to be of type "keyword", which requires an exact match
                const fieldParam = field === 'id' ? 'id' : `${field}.*`;
                const query = {
                    query_string: {
                        fields: [fieldParam],
                        query: queryParams[field],
                        default_operator: 'AND',
                    },
                };
                must.push(query);
            });

            const params = {
                index: resourceType.toLowerCase(),
                from,
                size,
                body: {
                    query: {
                        bool: {
                            must,
                        },
                    },
                },
            };

            const response = await ElasticSearch.search(params);
            const total = response.body.hits.total.value;

            const result: SearchResult = {
                numberOfResults: total,
                entries: response.body.hits.hits.map(
                    (hit: any): SearchEntry => {
                        return {
                            search: {
                                mode: 'match',
                            },
                            fullUrl: URL.format({
                                host: request.baseUrl,
                                pathname: `/${resourceType}/${hit._source.id}`,
                            }),
                            resource: hit._source,
                        };
                    },
                ),
                message: '',
            };

            if (from !== 0) {
                result.previousResultUrl = this.createURL(request.baseUrl, resourceType, {
                    ...searchFieldToValue,
                    [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: from - size,
                    [SEARCH_PAGINATION_PARAMS.COUNT]: size,
                });
            }
            if (from + size < total) {
                result.nextResultUrl = this.createURL(request.baseUrl, resourceType, {
                    ...searchFieldToValue,
                    [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: from + size,
                    [SEARCH_PAGINATION_PARAMS.COUNT]: size,
                });
            }

            return { success: true, result };
        } catch (error) {
            console.error(error);
            const result: SearchResult = {
                numberOfResults: 0,
                entries: [],
                message: error.message,
            };
            return { success: false, result };
        }
    }

    static createURL(host: string, query: any, resourceType?: string) {
        return URL.format({
            host,
            pathname: `/${resourceType}`,
            query,
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static globalSearch(request: GlobalSearchRequest): Promise<SearchResponse> {
        throw new Error('Method not implemented.');
    }
};

export default ElasticSearchService;
