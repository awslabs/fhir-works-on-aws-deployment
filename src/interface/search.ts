/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export interface TypeSearchRequest extends GlobalSearchRequest {
    resourceType: string;
}

export interface GlobalSearchRequest {
    queryParams?: any;
    baseUrl: string; // server's URL
}

export interface SearchResponse {
    success: boolean;
    result: SearchResult;
}

export interface SearchEntry {
    fullUrl: string;
    resource: any;
    search: {
        mode: 'match' | 'include' | 'outcome';
        score?: number;
    };
}

export interface SearchResult {
    numberOfResults: number;
    entries: SearchEntry[];
    message: string;
    firstResultUrl?: string;
    previousResultUrl?: string;
    nextResultUrl?: string;
    lastResultUrl?: string;
}

export interface Search {
    /**
     * Searches a specific Resource Type based on some filter criteria
     */
    typeSearch(request: TypeSearchRequest): Promise<SearchResponse>;
    /**
     * Searches all Resource Types based on some filter criteria
     */
    globalSearch(request: GlobalSearchRequest): Promise<SearchResponse>;
}
