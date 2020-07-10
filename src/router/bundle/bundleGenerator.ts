// eslint-disable-next-line import/extensions
import uuidv4 from 'uuid/v4';
import URL from 'url';
import { SearchResult } from '../../interface/search';
import { BatchReadWriteResponse } from '../../interface/bundle';

type LinkType = 'self' | 'previous' | 'next' | 'first' | 'last';

export default class BundleGenerator {
    // https://www.hl7.org/fhir/search.html
    static generateBundle(
        baseUrl: string,
        queryParams: any,
        searchResult: SearchResult,
        bundleType: 'searchset' | 'history',
        resourceType?: string,
        id?: string,
    ) {
        const currentDateTime = new Date();

        const bundle = {
            resourceType: 'Bundle',
            id: uuidv4(),
            meta: {
                lastUpdated: currentDateTime.toISOString(),
            },
            type: bundleType,
            total: searchResult.numberOfResults, // Total number of search results, not total of results on page
            link: [this.createLinkWithQuery('self', baseUrl, bundleType === 'history', resourceType, id, queryParams)],
            entry: searchResult.entries,
        };

        if (searchResult.previousResultUrl) {
            bundle.link.push(this.createLink('previous', searchResult.previousResultUrl));
        }
        if (searchResult.nextResultUrl) {
            bundle.link.push(this.createLink('next', searchResult.nextResultUrl));
        }
        if (searchResult.firstResultUrl) {
            bundle.link.push(this.createLink('first', searchResult.firstResultUrl));
        }
        if (searchResult.lastResultUrl) {
            bundle.link.push(this.createLink('last', searchResult.lastResultUrl));
        }

        return bundle;
    }

    static createLinkWithQuery(
        linkType: LinkType,
        host: string,
        isHistory: boolean,
        resourceType?: string,
        id?: string,
        query?: any,
    ) {
        let pathname = '';
        if (resourceType) {
            pathname += `/${resourceType}`;
        }
        if (id) {
            pathname += `/${id}`;
        }
        if (isHistory) {
            pathname += '/_history';
        }
        return {
            relation: linkType,
            url: URL.format({
                host,
                pathname,
                query,
            }),
        };
    }

    static createLink(linkType: LinkType, url: string) {
        return {
            relation: linkType,
            url,
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
            const status = bundleEntryResponse.operation === 'create' ? '201 Created' : '200 OK';
            const entry: any = {
                response: {
                    status,
                    location: `${bundleEntryResponse.resourceType}/${bundleEntryResponse.id}`,
                    etag: bundleEntryResponse.vid,
                    lastModified: bundleEntryResponse.lastModified,
                },
            };
            if (bundleEntryResponse.operation === 'read') {
                entry.resource = bundleEntryResponse.resource;
            }

            entries.push(entry);
        });

        response.entry = entries;
        return response;
    }
}
