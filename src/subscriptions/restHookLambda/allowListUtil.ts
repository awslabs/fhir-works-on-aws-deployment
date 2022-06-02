import { SubscriptionEndpoint } from 'fhir-works-on-aws-routing/lib/router/validation/subscriptionValidator';
import { groupBy } from 'lodash';
import getAllowListedSubscriptionEndpoints from '../allowList';

const SINGLE_TENANT_ALLOW_LIST_KEY = 'SINGLE_TENANT_ALLOW_LIST_KEY';

export interface AllowListInfo {
    allowList: (string | RegExp)[];
    headerMap: { [key: string]: string[] };
}

const extractAllowListInfo = (subscriptionEndpoints: SubscriptionEndpoint[]): AllowListInfo => {
    const allowList: (string | RegExp)[] = [];
    const headerMap: { [key: string]: string[] } = {};
    subscriptionEndpoints.forEach((allowEndpoint: SubscriptionEndpoint) => {
        allowList.push(allowEndpoint.endpoint);
        headerMap[allowEndpoint.endpoint.toString()] = allowEndpoint.headers || [];
    });
    return { allowList, headerMap };
};

export async function getAllowListInfo({
    enableMultitenancy = false,
}: {
    enableMultitenancy: boolean;
}): Promise<{ [key: string]: AllowListInfo }> {
    const originalAllowList = await getAllowListedSubscriptionEndpoints();
    if (!enableMultitenancy) {
        return { [SINGLE_TENANT_ALLOW_LIST_KEY]: extractAllowListInfo(originalAllowList) };
    }
    const allowListInfo: { [key: string]: AllowListInfo } = {};
    const endpointsGroupByTenant: { [key: string]: SubscriptionEndpoint[] } = groupBy(
        originalAllowList,
        (allowEndpoint: SubscriptionEndpoint) => allowEndpoint.tenantId,
    );
    Object.entries(endpointsGroupByTenant).forEach(([key, value]) => {
        allowListInfo[key] = extractAllowListInfo(value);
    });
    return allowListInfo;
}

/**
 * Verify endpoint is allow listed
 * Return allow list headers if endpoint is allow listed
 * Throw error if endpoint is not allow listed
 * @param allowListInfoMap
 * @param endpoint
 * @param tenantId
 * @param enableMultitenancy
 */
export const getAllowListHeaders = (
    allowListInfoMap: { [key: string]: AllowListInfo },
    endpoint: string,
    { enableMultitenancy = false, tenantId }: { enableMultitenancy: boolean; tenantId: string | undefined },
): string[] => {
    const getHeaders = (allowListInfo: AllowListInfo): string[] => {
        if (allowListInfo) {
            const { allowList, headerMap } = allowListInfo;
            // eslint-disable-next-line no-restricted-syntax
            for (const allowedEndpoint of allowList) {
                if (allowedEndpoint instanceof RegExp && allowedEndpoint.test(endpoint)) {
                    return headerMap[allowedEndpoint.toString()];
                }
                if (allowedEndpoint === endpoint) {
                    return headerMap[allowedEndpoint];
                }
            }
        }
        throw new Error(`Endpoint ${endpoint} is not allow listed.`);
    };

    if (enableMultitenancy) {
        if (tenantId) {
            return getHeaders(allowListInfoMap[tenantId]);
        }
        throw new Error('This instance has multi-tenancy enabled, but the incoming request is missing tenantId');
    }
    if (!tenantId) {
        return getHeaders(allowListInfoMap[SINGLE_TENANT_ALLOW_LIST_KEY]);
    }
    throw new Error('This instance has multi-tenancy disabled, but the incoming request has a tenantId');
};
