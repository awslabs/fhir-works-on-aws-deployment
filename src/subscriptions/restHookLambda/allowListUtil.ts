// import { SubscriptionEndpoint } from 'fhir-works-on-aws-routing/lib/router/validation/subscriptionValidator';
import { groupBy } from 'lodash';
import { SubscriptionEndpoint } from '../subscriptionEndpoint';
import getAllowListedSubscriptionEndpoints from '../allowList';
import 'urlpattern-polyfill';

const SINGLE_TENANT_ALLOW_LIST_KEY = 'SINGLE_TENANT_ALLOW_LIST_KEY';

export async function getAllowListInfo({
    enableMultitenancy = false,
}: {
    enableMultitenancy: boolean;
}): Promise<{ [key: string]: SubscriptionEndpoint[] }> {
    const originalAllowList = await getAllowListedSubscriptionEndpoints();
    if (!enableMultitenancy) {
        return { [SINGLE_TENANT_ALLOW_LIST_KEY]: originalAllowList };
    }
    const endpointsGroupByTenant: { [key: string]: SubscriptionEndpoint[] } = groupBy(
        originalAllowList,
        (allowEndpoint: SubscriptionEndpoint) => allowEndpoint.tenantId,
    );
    return endpointsGroupByTenant;
}

/**
 * Verify endpoint is allow listed
 * Return allow list headers if endpoint is allow listed
 * Throw error if endpoint is not allow listed
 * @param subscriptionEndpointMap
 * @param endpoint
 * @param tenantId
 * @param enableMultitenancy
 */
export const getAllowListHeaders = (
    subscriptionEndpointMap: { [key: string]: SubscriptionEndpoint[] },
    endpoint: string,
    { enableMultitenancy = false, tenantId }: { enableMultitenancy: boolean; tenantId: string | undefined },
): string[] => {
    const getHeaders = (subscriptionEndpoints: SubscriptionEndpoint[]): string[] => {
        if (subscriptionEndpoints) {
            const found = subscriptionEndpoints.find((subscriptionEndpoint) =>
                subscriptionEndpoint.endpoint.test(endpoint),
            );
            if (found) {
                return found.headers || [];
            }
        }
        throw new Error(`Endpoint ${endpoint} is not allow listed.`);
    };

    if (enableMultitenancy) {
        if (tenantId) {
            return getHeaders(subscriptionEndpointMap[tenantId]);
        }
        throw new Error('This instance has multi-tenancy enabled, but the incoming request is missing tenantId');
    }
    if (!tenantId) {
        return getHeaders(subscriptionEndpointMap[SINGLE_TENANT_ALLOW_LIST_KEY]);
    }
    throw new Error('This instance has multi-tenancy disabled, but the incoming request has a tenantId');
};
