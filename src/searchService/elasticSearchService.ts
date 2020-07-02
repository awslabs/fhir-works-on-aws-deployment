import ElasticSearch from './elasticSearch';
import SearchResult from './searchResult';
import SearchServiceResponse from './searchServiceResponse';
import SearchServiceInterface from './searchServiceInterface';
import { DEFAULT_SEARCH_RESULTS_PER_PAGE, SEARCH_PAGINATION_PARAMS } from '../constants';

const ElasticSearchService: SearchServiceInterface = class {
    /*
    searchParams => {field: value}
     */
    static async search(resourceType: string, searchParams: any) {
        try {
            const from = searchParams[SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]
                ? Number(searchParams[SEARCH_PAGINATION_PARAMS.PAGES_OFFSET])
                : 0;

            const size = searchParams[SEARCH_PAGINATION_PARAMS.COUNT]
                ? Number(searchParams[SEARCH_PAGINATION_PARAMS.COUNT])
                : DEFAULT_SEARCH_RESULTS_PER_PAGE;

            // Exp. {gender: 'male', name: 'john'}
            const searchFieldToValue = { ...searchParams };
            delete searchFieldToValue[SEARCH_PAGINATION_PARAMS.PAGES_OFFSET];
            delete searchFieldToValue[SEARCH_PAGINATION_PARAMS.COUNT];

            const must: any = [];
            // TODO Implement fuzzy matches
            Object.keys(searchFieldToValue).forEach(field => {
                // id is mapped in ElasticSearch to be of type "keyword", which requires an exact match
                const fieldParam = field === 'id' ? 'id' : `${field}.*`;
                // Don't send _format param to ES
                if (field === '_format') {
                    return;
                }
                const query = {
                    query_string: {
                        fields: [fieldParam],
                        query: searchParams[field],
                        default_operator: 'AND',
                    },
                };
                must.push(query);
            });

            console.log('must', must);
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
                hasPreviousResult: from !== 0,
                hasNextResult: from + size < total,
                timeInMs: response.body.took,
                numberOfResults: total,
                resources: response.body.hits.hits.map((hit: any) => {
                    // Default format when ES sends us the response is hit._source, which is why there
                    // is a dangling underscore
                    // eslint-disable-next-line no-underscore-dangle
                    return hit._source;
                }),
                message: '',
            };

            return new SearchServiceResponse(true, result);
        } catch (error) {
            console.error(error);
            const result: SearchResult = {
                hasPreviousResult: false,
                hasNextResult: false,
                timeInMs: 0,
                numberOfResults: 0,
                resources: {},
                message: error.message,
            };
            return new SearchServiceResponse(false, result);
        }
    }
};

export default ElasticSearchService;
