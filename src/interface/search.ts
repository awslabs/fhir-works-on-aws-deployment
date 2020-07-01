// eslint-disable-next-line no-unused-vars
import ServiceResponse from '../common/serviceResponse';

export interface TypeSearchRequest extends GlobalSearchRequest {
    resourceType: string;
}

export interface GlobalSearchRequest {
    queryParams?: any;
}

export interface Search {
    /**
     * Searches a specific Resource Type based on some filter criteria
     */
    typeSearch(request: TypeSearchRequest): Promise<ServiceResponse>;
    /**
     * Searches all Resource Types based on some filter criteria
     */
    globalSearch(request: GlobalSearchRequest): Promise<ServiceResponse>;
}
