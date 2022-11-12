import 'urlpattern-polyfill';

// Temporary, until associated PR in routing module is merged.
export interface SubscriptionEndpoint {
    endpoint: URLPattern;
    headers?: string[];
    tenantId?: string;
}
