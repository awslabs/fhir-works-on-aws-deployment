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

export interface SearchResult {
    hasPreviousResult: boolean;
    hasNextResult: boolean;
    timeInMs: number;
    numberOfResults: number;
    resources: any;
    message: string;
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
