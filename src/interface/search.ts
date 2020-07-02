export interface TypeSearchRequest extends GlobalSearchRequest {
    resourceType: string;
}

export interface GlobalSearchRequest {
    queryParams?: any;
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
