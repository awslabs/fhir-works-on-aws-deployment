import { BatchReadWriteRequest } from './bundle';

export interface AuthorizationRequest {
    accessToken: string;
    httpVerb: string;
    urlPath: string;
}
export interface AuthorizationBundleRequest {
    requests: BatchReadWriteRequest[];
    accessToken: string;
}
export default interface Authorization {
    /**
     * Validates if the requestor is authorized to perform the action requested
     */
    isAuthorized(request: AuthorizationRequest): boolean;
    /**
     * Used to authorize Bundle transactions
     */
    isBundleRequestAuthorized(request: AuthorizationBundleRequest): Promise<boolean>;
}
