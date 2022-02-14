import axios from 'axios';
import { makeLogger } from 'fhir-works-on-aws-interface';
import { SQSEvent } from 'aws-lambda';
import { SubscriptionMatchMessage } from './types';
import ensureAsyncInit from '../index';
import { AllowListInfo, getAllowListHeaders } from './allowListUtil';

const logger = makeLogger({ component: 'subscriptions' });

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

export default class RestHookHandler {
    readonly enableMultitenancy: boolean;

    constructor({ enableMultitenancy = false }: { enableMultitenancy: boolean }) {
        this.enableMultitenancy = enableMultitenancy;
    }

    async sendRestHookNotification(
        event: SQSEvent,
        allowListPromise: Promise<{ [key: string]: AllowListInfo }>,
    ): Promise<any> {
        await ensureAsyncInit(allowListPromise);
        const allowList = await allowListPromise;
        const notificationPromises = event.Records.map((record: any) => {
            const body = JSON.parse(record.body);
            logger.debug(body);
            const message: SubscriptionMatchMessage = JSON.parse(body.Message);
            const { endpoint, channelHeader, channelPayload, matchedResource, tenantId } = message;
            const allowListHeaders = getAllowListHeaders(allowList, endpoint, {
                enableMultitenancy: this.enableMultitenancy,
                tenantId,
            });
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
    }
}
