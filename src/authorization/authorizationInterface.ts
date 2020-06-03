import { INTERACTION } from '../constants';

export default interface AuthorizationInterface {
    /**
     * Validates if the requestor is authorized to perform the action requested
     * @param operation What is the requestor trying to do
     * @param requestedPath What is the path coming in with the request (ie. api.com/Patient/1234)
     * @param userIdentity The identity of the user. This can be the access_token from OAuth
     * @param intent What is the intent of the request (useful in 'break the glass' scenarios)
     */
    isAuthorized(operation: INTERACTION, requestedPath: string, userIdentity: string, intent: string): boolean;

    /**
     * This is a post-operation check that can be used to strip away any parameters the request is not supossed to see
     * @param resource The expected returned result
     * @param userIdentity The identity of the user. This can be the access_token from OAuth
     */
    cleanResourceResult(resource: any, userIdentity: string): any;
}
