// eslint-disable-next-line no-unused-vars
import ServiceResponse from '../common/serviceResponse';

export interface InstanceHistoryRequest extends TypeHistoryRequest {
    id: string;
}
export interface TypeHistoryRequest extends GlobalHistoryRequest {
    resourceType: string;
}
export interface GlobalHistoryRequest {
    queryParams?: any;
}
export interface History {
    /**
     * History interaction retrieves the history of a particular resource
     * Should be thought of as a 'search' of older versioned resources
     */
    instanceHistory(request: InstanceHistoryRequest): Promise<ServiceResponse>;
    /**
     * History interaction retrieves the history of all resources of a given type
     * Should be thought of as a 'search' of older versioned resources
     */
    typeHistory(request: TypeHistoryRequest): Promise<ServiceResponse>;
    /**
     * History interaction retrieves the history of all resources supported by the system.
     * Should be thought of as a 'search' of older versioned resources
     */
    globalHistory(request: GlobalHistoryRequest): Promise<ServiceResponse>;
}
