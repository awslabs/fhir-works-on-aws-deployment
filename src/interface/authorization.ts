import { BatchReadWriteRequest } from './bundle';
import { Operation } from './constants';

export interface AuthorizationRequest {
    accessToken: string;
    operation: Operation;
    resourceType?: string;
    id?: string;
    vid?: string;
}

export interface AuthorizationBundleRequest {
    accessToken: string;
    requests: BatchReadWriteRequest[];
}

export interface Authorization {
    /**
     * Validates if the requestor is authorized to perform the action requested
     */
    isAuthorized(request: AuthorizationRequest): boolean;
    /**
     * Used to authorize Bundle transactions
     */
    isBundleRequestAuthorized(request: AuthorizationBundleRequest): Promise<boolean>;
}
