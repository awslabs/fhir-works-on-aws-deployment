/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-underscore-dangle */
import URL from 'url';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
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

// eslint-disable-next-line import/prefer-default-export
export class ElasticSearchService implements Search {
    private readonly filterRulesForActiveResources: any[];

    private readonly cleanUpFunction: (resource: any) => any;

    /**
     * @param filterRulesForActiveResources - If you are storing both History and Search resources
     * in your elastic search you can filter out your History elements by supplying a filter argument like:
     * [{ match: { documentStatus: 'AVAILABLE' }}]
     * @param cleanUpFunction - If you are storing non-fhir related parameters pass this function to clean
     * the return ES objects
     */
    constructor(
        filterRulesForActiveResources: any[] = [],
        cleanUpFunction: (resource: any) => any = function passThrough(resource: any) {
            return resource;
        },
    ) {
        this.filterRulesForActiveResources = filterRulesForActiveResources;
        this.cleanUpFunction = cleanUpFunction;
    }

    /*
    searchParams => {field: value}
     */
    async typeSearch(request: TypeSearchRequest): Promise<SearchResponse> {
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
                // Don't send _format param to ES
                if (field === '_format') {
                    return;
                }
                const query = {
                    query_string: {
                        fields: [fieldParam],
                        query: queryParams[field],
                        default_operator: 'AND',
                    },
                };
                must.push(query);
            });

            const filter = this.filterRulesForActiveResources;

            const params = {
                index: resourceType.toLowerCase(),
                from,
                size,
                body: {
                    query: {
                        bool: {
                            must,
                            filter,
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
                        // Modify to return resource with FHIR id not Dynamo ID
                        const resource = this.cleanUpFunction(hit._source);
                        return {
                            search: {
                                mode: 'match',
                            },
                            fullUrl: URL.format({
                                host: request.baseUrl,
                                pathname: `/${resourceType}/${resource.id}`,
                            }),
                            resource,
                        };
                    },
                ),
                message: '',
            };

            if (from !== 0) {
                result.previousResultUrl = this.createURL(
                    request.baseUrl,
                    {
                        ...searchFieldToValue,
                        [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: from - size,
                        [SEARCH_PAGINATION_PARAMS.COUNT]: size,
                    },
                    resourceType,
                );
            }
            if (from + size < total) {
                result.nextResultUrl = this.createURL(
                    request.baseUrl,
                    {
                        ...searchFieldToValue,
                        [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: from + size,
                        [SEARCH_PAGINATION_PARAMS.COUNT]: size,
                    },
                    resourceType,
                );
            }

            return { success: true, result };
        } catch (error) {
            // Indexes are created the first time a resource of a given type is written to DDB.
            if (error instanceof ResponseError && error.message === 'index_not_found_exception') {
                console.log(`Search index for ${resourceType} does not exist. Returning an empty search result`);
                return {
                    success: true,
                    result: {
                        numberOfResults: 0,
                        entries: [],
                        message: '',
                    },
                };
            }
            console.error(error);
            throw error;
        }
    }

    // eslint-disable-next-line class-methods-use-this
    private createURL(host: string, query: any, resourceType?: string) {
        return URL.format({
            host,
            pathname: `/${resourceType}`,
            query,
        });
    }

    // eslint-disable-next-line class-methods-use-this
    async globalSearch(request: GlobalSearchRequest): Promise<SearchResponse> {
        console.log(request);
        throw new Error('Method not implemented.');
    }
}
