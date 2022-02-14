import { SubscriptionNotification } from 'fhir-works-on-aws-search-es';
import { v4 } from 'uuid';
import { SNSClient, PublishBatchCommand } from '@aws-sdk/client-sns';

const publishToSNS = async (subscriptionNotificationBatches: SubscriptionNotification[][], topicArn: string) => {
    const snsClient = new SNSClient({
        region: process.env.AWS_REGION || 'us-west-2',
    });
    await Promise.all(
        subscriptionNotificationBatches.map((subscriptionNotificationBatch) => {
            const command = new PublishBatchCommand({
                PublishBatchRequestEntries: subscriptionNotificationBatch.map((subscriptionNotification) => ({
                    Id: v4(), // The ID only needs to be unique within a batch. A UUID works well here
                    Message: JSON.stringify(subscriptionNotification),
                    MessageAttributes: {
                        channelType: { DataType: 'String', StringValue: subscriptionNotification.channelType },
                    },
                })),
                TopicArn: topicArn,
            });
            return snsClient.send(command);
        }),
    );
};

export default publishToSNS;
