export interface SubscriptionMatchMessage {
    subscriptionId: string;
    tenantId?: string;
    channelType: string;
    endpoint: string;
    channelPayload?: string;
    channelHeader: string[];
    matchedResource: {
        id: string;
        resourceType: string;
        versionId: string;
        lastUpdated: string;
    };
}
