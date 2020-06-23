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
            console.log(searchFieldToValue);
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
                        query: searchParams[field],
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

            // eslint-disable-next-line no-underscore-dangle
            if (searchParams._id) {
                const result: SearchResult = {
                    hasPreviousResult: false,
                    hasNextResult: false,
                    timeInMs: 10,
                    numberOfResults: 1,
                    resources: [
                        {
                            active: true,
                            resourceType: 'Patient',
                            birthDate: '1996-09-24',
                            meta: {
                                lastUpdated: '2020-06-22T16:49:59.419Z',
                                versionId: '3',
                            },
                            managingOrganization: {
                                reference: 'Organization/2.16.840.1.113883.19.5',
                                display: 'Good Health Clinic',
                            },
                            text: {
                                div: '<div xmlns="http://www.w3.org/1999/xhtml"><p></p></div>',
                                status: 'generated',
                            },
                            id: '8cafa46d-08b4-4ee4-b51b-803e20ae8126',
                            name: [
                                {
                                    family: 'Wang',
                                    given: ['Matt'],
                                },
                            ],
                            gender: 'male',
                        },
                    ],
                    message: '',
                };

                return new SearchServiceResponse(true, result);
            }
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
