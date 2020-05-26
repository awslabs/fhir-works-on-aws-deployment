// eslint-disable-next-line import/extensions
import uuidv4 from 'uuid/v4';
import URL from 'url';
import SearchResult from '../searchService/searchResult';
import { DEFAULT_SEARCH_RESULTS_PER_PAGE, SEARCH_PAGINATION_PARAMS, SEPARATOR } from '../constants';
import { BatchReadWriteRequestType } from '../dataServices/ddb/batchReadWriteRequest';
import BatchReadWriteResponse from '../dataServices/ddb/batchReadWriteResponse';

enum LINK_TYPE {
    SELF = 'self',
    PREVIOUS = 'previous',
    NEXT = 'next',
}

export default class BundleGenerator {
    // https://www.hl7.org/fhir/search.html
    static generateSearchBundle(baseUrl: string, resourceType: string, searchParams: any, searchResult: SearchResult) {
        const currentDateTime = new Date();

        const pagesOffset = searchParams[SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]
            ? Number(searchParams[SEARCH_PAGINATION_PARAMS.PAGES_OFFSET])
            : 0;

        const count = searchParams[SEARCH_PAGINATION_PARAMS.COUNT]
            ? Number(searchParams[SEARCH_PAGINATION_PARAMS.COUNT])
            : DEFAULT_SEARCH_RESULTS_PER_PAGE;

        const entry: any = [];
        searchResult.resources.forEach((resource: any) => {
            // Modify to return resource with FHIR id not Dynamo ID
            const idComponents: string[] = resource.id.split(SEPARATOR);
            entry.push({
                search: {
                    mode: 'match',
                },
                fullUrl: URL.format({
                    host: baseUrl,
                    pathname: `/${resourceType}/${idComponents[0]}`,
                }),
                resource: Object.assign(resource, { id: idComponents[0] }),
            });
        });

        const bundle = {
            resourceType: 'Bundle',
            id: uuidv4(),
            meta: {
                lastUpdated: currentDateTime.toISOString(),
            },
            type: 'searchset',
            total: searchResult.numberOfResults, // Total number of search results, not total of results on page
            link: [this.createLink(LINK_TYPE.SELF, baseUrl, resourceType, searchParams)],
            entry,
        };

        if (searchResult.hasPreviousResult) {
            bundle.link.push(
                this.createLink(LINK_TYPE.PREVIOUS, baseUrl, resourceType, {
                    ...searchParams,
                    [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: pagesOffset - count,
                    [SEARCH_PAGINATION_PARAMS.COUNT]: count,
                }),
            );
        }
        if (searchResult.hasNextResult) {
            bundle.link.push(
                this.createLink(LINK_TYPE.NEXT, baseUrl, resourceType, {
                    ...searchParams,
                    [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: pagesOffset + count,
                    [SEARCH_PAGINATION_PARAMS.COUNT]: count,
                }),
            );
        }

        return bundle;
    }

    static createLink(linkType: LINK_TYPE, host: string, resourceType: string, query: any) {
        return {
            relation: linkType,
            url: URL.format({
                host,
                pathname: `/${resourceType}`,
                query,
            }),
        };
    }

    static generateTransactionBundle(baseUrl: string, bundleEntryResponses: BatchReadWriteResponse[]) {
        const id = uuidv4();
        const response = {
            resourceType: 'Bundle',
            id,
            type: 'transaction-response',
            link: [
                {
                    relation: 'self',
                    url: baseUrl,
                },
            ],
            entry: [],
        };

        const entries: any = [];
        bundleEntryResponses.forEach(bundleEntryResponse => {
            const status = bundleEntryResponse.type === BatchReadWriteRequestType.CREATE ? '201 Created' : '200 OK';
            const entry: any = {
                response: {
                    status,
                    location: `${bundleEntryResponse.resourceType}/${bundleEntryResponse.id}`,
                    etag: bundleEntryResponse.versionId,
                    lastModified: bundleEntryResponse.lastModified,
                },
            };
            if (bundleEntryResponse.type === BatchReadWriteRequestType.READ) {
                entry.resource = bundleEntryResponse.resource;
            }

            entries.push(entry);
        });

        response.entry = entries;
        return response;
    }
}
