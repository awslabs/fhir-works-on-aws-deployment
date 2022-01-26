/* eslint-disable no-await-in-loop */
import AWS from 'aws-sdk';
import getComponentLogger from './loggerBuilder';

const logger = getComponentLogger();
const { QUEUE_URL, SYNC_LAMBDA } = process.env;

const sqs = new AWS.SQS();
const lambda = new AWS.Lambda();
const dynamodbstreams = new AWS.DynamoDBStreams();

const getMessages = async (queueUrl) => {
    const resp = await sqs
        .receiveMessage({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: 10,
            VisibilityTimeout: 300,
            WaitTimeSeconds: 0,
        })
        .promise();

    return resp.Messages;
};

const deleteMessages = async (queueUrl, messagesToDelete) => {
    await sqs
        .deleteMessageBatch({
            QueueUrl: queueUrl,
            Entries: messagesToDelete,
        })
        .promise();
};

const invokeSyncLambda = async (records) => {
    await lambda
        .invoke({
            FunctionName: SYNC_LAMBDA,
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(records),
        })
        .promise();
};

const getRecordsFromDbStream = async (message) => {
    const resp = await dynamodbstreams
        .getShardIterator({
            ShardId: message.DDBStreamBatchInfo.shardId,
            ShardIteratorType: 'AT_SEQUENCE_NUMBER',
            StreamArn: message.DDBStreamBatchInfo.streamArn,
            SequenceNumber: message.DDBStreamBatchInfo.startSequenceNumber,
        })
        .promise();

    return dynamodbstreams
        .getRecords({
            ShardIterator: resp.ShardIterator,
        })
        .promise();
};

exports.handler = async () => {
    let messages = await getMessages(QUEUE_URL);

    while (messages && messages.length > 0) {
        const messagesToDelete = [];

        /* eslint-disable no-restricted-syntax */
        for (const message of messages) {
            try {
                const records = await getRecordsFromDbStream(JSON.parse(message.Body));
                await invokeSyncLambda(records);
                messagesToDelete.push({
                    Id: message.MessageId,
                    ReceiptHandle: message.ReceiptHandle,
                });
            } catch (e) {
                logger.error('Failed to re-sync', JSON.stringify(e));
            }
        }

        // only delete successfully re-synced messages
        await deleteMessages(QUEUE_URL, messagesToDelete);
        messages = await getMessages(QUEUE_URL);
    }
};
