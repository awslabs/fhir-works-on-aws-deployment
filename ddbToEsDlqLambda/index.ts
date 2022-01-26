/* eslint-disable no-await-in-loop */
import AWS from 'aws-sdk';
import getComponentLogger from './loggerBuilder';

const logger = getComponentLogger();
const { QUEUE_URL, DDB_TO_ES_LAMBDA_NAME } = process.env;

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

const invokeDdbToEsLambda = async (records) => {
    await lambda
        .invoke({
            FunctionName: DDB_TO_ES_LAMBDA_NAME,
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
    let messages;
    try {
        messages = await getMessages(QUEUE_URL);
        logger.debug('Recevied messages', JSON.stringify(messages));
    } catch (e) {
        logger.error('Failed to receive messages', JSON.stringify(e));
    }

    while (messages && messages.length > 0) {
        const messagesToDelete = [];

        /* eslint-disable no-restricted-syntax */
        for (const message of messages) {
            try {
                const records = await getRecordsFromDbStream(JSON.parse(message.Body));
                logger.debug('Fetched records', JSON.stringify(records));
                await invokeDdbToEsLambda(records);
                messagesToDelete.push({
                    Id: message.MessageId,
                    ReceiptHandle: message.ReceiptHandle,
                });
            } catch (e) {
                logger.error('Failed to re-sync', JSON.stringify(e));
            }
        }

        // only delete successfully re-synced messages
        try {
            await deleteMessages(QUEUE_URL, messagesToDelete);
            logger.debug('Deleted messages', JSON.stringify(messagesToDelete));
        } catch (e) {
            logger.error('Failed to delete message', JSON.stringify(e));
        }
        try {
            messages = await getMessages(QUEUE_URL);
        } catch (e) {
            logger.error('Failed to receive messages', JSON.stringify(e));
            messages = undefined;
        }
    }
};
