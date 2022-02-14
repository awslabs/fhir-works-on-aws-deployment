import axios from 'axios';
import { SubscriptionEndpoint } from 'fhir-works-on-aws-routing/lib/router/validation/subscriptionValidator';
import { groupBy } from 'lodash';
import { makeLogger } from 'fhir-works-on-aws-interface';
import { SubscriptionNotification } from 'fhir-works-on-aws-search-es';
import getAllowListedSubscriptionEndpoints from './allowList';
import ensureAsyncInit from '../src/index';

const logger = makeLogger();

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

async function getAllowListInfo(): Promise<{ [key: string]: AllowListInfo }> {
    const originalAllowList = await getAllowListedSubscriptionEndpoints();
    logger.debug(originalAllowList);
    if (process.env.ENABLE_MULTI_TENANCY !== 'true') {
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
 * @param allowListInfo
 * @param endpoint
 * @param tenantId
 */
const getAllowListHeaders = (
    allowListInfo: { [key: string]: AllowListInfo },
    endpoint: string,
    tenantId?: string,
): string[] => {
    const getHeaders = ({ allowList, headerMap }: AllowListInfo): string[] => {
        // eslint-disable-next-line no-restricted-syntax
        for (const allowedEndpoint of allowList) {
            if (allowedEndpoint instanceof RegExp && allowedEndpoint.test(endpoint)) {
                return headerMap[allowedEndpoint.toString()];
            }
            if (allowedEndpoint === endpoint) {
                return headerMap[allowedEndpoint];
            }
        }
        throw new Error(`Endpoint ${endpoint} is not allow listed.`);
    };

    if (process.env.ENABLE_MULTI_TENANCY === 'true') {
        if (tenantId) {
            return getHeaders(allowListInfo[tenantId]);
        }
        throw new Error('This instance has multi-tenancy enabled, but the incoming request is missing tenantId');
    }
    if (!tenantId) {
        return getHeaders(allowListInfo[SINGLE_TENANT_ALLOW_LIST_KEY]);
    }
    throw new Error('This instance has multi-tenancy disabled, but the incoming request has a tenantId');
};

/**
 * Merge headers from allow list and subscription resource
 * If same header name is present from both sources, header value in subscription resource will be used
 * If a header string does not have ':', the header will be sent with no value
 * @param allowListHeader
 * @param channelHeader
 */
const mergeRequestHeaders = (allowListHeader: string[], channelHeader: string[]): any => {
    const mergedHeader: any = {};
    const mergeHeader = (header: string) => {
        const colonIndex = header.indexOf(':') === -1 ? header.length : header.indexOf(':');
        const headerKey = header.substring(0, colonIndex);
        const headerValue = header.substring(colonIndex + 1);
        mergedHeader[headerKey] = headerValue;
    };

    allowListHeader.forEach((header) => mergeHeader(header));
    channelHeader.forEach((header) => mergeHeader(header));
    return mergedHeader;
};

const allowListPromise: Promise<{ [key: string]: AllowListInfo }> = getAllowListInfo();

export const sendRestHookNotification = async (event: any): Promise<any> => {
    await ensureAsyncInit(allowListPromise);
    const allowList = await allowListPromise;
    const notificationPromises = event.Records.map((record: any) => {
        const body = JSON.parse(record.body);
        logger.debug(body);
        const message: SubscriptionNotification = JSON.parse(body.Message);
        const { endpoint, channelHeader, channelPayload, matchedResource, tenantId } = message;
        const allowListHeaders = getAllowListHeaders(allowList, endpoint, tenantId);
        const headers = mergeRequestHeaders(allowListHeaders, channelHeader);
        if (channelPayload === 'application/fhir+json') {
            return axios.put(`${endpoint}/${matchedResource.resourceType}/${matchedResource.id}`, null, {
                headers,
            });
        }
        return axios.post(endpoint, null, { headers });
    });
    const responses = (await Promise.all(notificationPromises)).map((response: any) => response.data);
    logger.info('Subscription notifications sent.');
    logger.debug(responses);
    return responses;
};
