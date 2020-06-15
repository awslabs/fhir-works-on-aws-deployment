import BatchReadWriteRequest from '../dataServices/ddb/batchReadWriteRequest';

export default interface AuthorizationInterface {
    /**
     * Validates if the requestor is authorized to perform the action requested
     * @param accessToken The identity of the user. This can be the access_token from OAuth
     * @param httpVerb What is the requestor trying to do
     * @param urlPath What is the url path the user is trying to access/change (ie. Patient/1234)
     */
    isAuthorized(accessToken: string, httpVerb: string, urlPath: string): boolean;

    /**
     * Used to authorize Bundle transactions
     * @param accessToken The identity of the user. This can be the access_token from OAuth
     * @param batchRequests All of the requests within the Bundle to authorize
     */
    isBatchRequestAuthorized(accessToken: string, batchRequests: BatchReadWriteRequest[]): Promise<boolean>;
}
