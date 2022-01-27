/* eslint-disable no-await-in-loop */
import AWS from 'aws-sdk';
import getComponentLogger from './loggerBuilder';

const logger = getComponentLogger();
const { QUEUE_URL, DDB_TO_ES_LAMBDA_NAME, MAX_NUMBER_OF_MESSAGES_TO_PROCESS } = process.env;
const MESSAGE_BATCH_SIZE = 10;
const MESSAGE_VISIBILITY_TIMEOUT = 30; // seconds

const sqs = new AWS.SQS();
const lambda = new AWS.Lambda();
const dynamodbstreams = new AWS.DynamoDBStreams();

const getMessages = async (queueUrl, batchSize) => {
    const resp = await sqs
        .receiveMessage({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: batchSize,
            VisibilityTimeout: MESSAGE_VISIBILITY_TIMEOUT,
            WaitTimeSeconds: 0,
        })
        .promise()
        .catch((e) => {
            throw new Error(`Failed to receive messages: ${JSON.stringify(e)}`);
        });

    logger.debug('Received messages', JSON.stringify(resp.Messages));
    return resp.Messages;
};

const deleteMessages = async (queueUrl, messagesToDelete) => {
    if (messagesToDelete.length === 0) {
        logger.debug('messagesToDelete is an empty array');
        return;
    }

    const resp = await sqs
        .deleteMessageBatch({
            QueueUrl: queueUrl,
            Entries: messagesToDelete,
        })
        .promise()
        .catch((e) => {
            throw new Error(`Failed to delete message: ${JSON.stringify(e)}`);
        });

    if (resp.Successful) {
        logger.debug('Deleted messages', JSON.stringify(resp.Successful));
    }

    if (resp.Failed && resp.Failed.length) {
        logger.error('Failed to deleted messages', JSON.stringify(resp.Failed));
    }
};

const invokeDdbToEsLambda = async (records) => {
    const resp = await lambda
        .invoke({
            FunctionName: DDB_TO_ES_LAMBDA_NAME,
            InvocationType: 'Event',
            Payload: JSON.stringify(records),
        })
        .promise()
        .catch((e) => logger.error('Failed to invoke DdbToEsLambda', JSON.stringify(e)));

    if (resp && resp.StatusCode < 300) {
        logger.debug('Invoked DdbToEsLambda with records', JSON.stringify(records));
        return true;
    }

    if (resp && resp.StatusCode >= 400) {
        logger.error('Failed to invoke DdbToEsLambda', JSON.stringify(resp.Payload));
    }

    return false;
};

const getRecordsFromDbStream = async (message) => {
    try {
        const resp = await dynamodbstreams
            .getShardIterator({
                ShardId: message.DDBStreamBatchInfo.shardId,
                ShardIteratorType: 'AT_SEQUENCE_NUMBER',
                StreamArn: message.DDBStreamBatchInfo.streamArn,
                SequenceNumber: message.DDBStreamBatchInfo.startSequenceNumber,
            })
            .promise();

        const records = await dynamodbstreams
            .getRecords({
                ShardIterator: resp.ShardIterator,
            })
            .promise();
        logger.debug('Fetched records', JSON.stringify(records));
        return records;
    } catch (e) {
        logger.error('Failed to re-sync', JSON.stringify(e));
        return undefined;
    }
};

/**
 * This lambda function would read messages form DbToEs DLQ, fetch records
 * from DynamoDB stream based on the message, and invoke DbToEs Lambda function
 * with the record as inputs.
 *
 * Note:
 *   1. Messages retention period is 14 days. After retention period, SQS would delete messages.
 *   2. Records retention period is 24 hours. After retention period, DynamoDB stream would delete records.
 *   3. Invocation of DbToEs Lambda function is asynchronous, which means successful invocation doesn't mean
 *      DbToEs Lambda successfully synced the data. In that case, a new message would be sent to DLQ.
 *   4. Message visibility timeout must be greater than the total time of processing the message,
 *      otherwise the message would be received by this Lambda function again.
 *      Recommended visibility timeout = 3 seconds * batch size
 */
exports.handler = async (event) => {
    let numMessagesToProcess = event.maxNumberOfMessages;
    if (numMessagesToProcess === undefined) {
        numMessagesToProcess = Number(MAX_NUMBER_OF_MESSAGES_TO_PROCESS);
    }

    if (typeof numMessagesToProcess !== 'number' || numMessagesToProcess < 1) {
        throw new Error(`invalid maxNumberOfMessages: ${numMessagesToProcess}`);
    }

    while (numMessagesToProcess > 0) {
        // If SQS error is thrown, then stop processing messages.
        const messages = await getMessages(
            QUEUE_URL,
            MESSAGE_BATCH_SIZE > numMessagesToProcess ? numMessagesToProcess : MESSAGE_BATCH_SIZE,
        );
        if (messages === undefined || messages.length <= 0) {
            // No further messages to process, stop here.
            break;
        }

        numMessagesToProcess -= messages.length;
        const messagesToDelete = [];
        /* eslint-disable no-restricted-syntax */
        for (const message of messages) {
            const records = await getRecordsFromDbStream(JSON.parse(message.Body));
            if (records) {
                // Ignore DDBStream error, and continue processing messages.
                if (await invokeDdbToEsLambda(records)) {
                    // Ignore Lambda error, and continue processing messages.
                    messagesToDelete.push({
                        Id: message.MessageId,
                        ReceiptHandle: message.ReceiptHandle,
                    });
                }
            }
        }

        // only delete successfully re-synced messages
        await deleteMessages(QUEUE_URL, messagesToDelete);
    }
};
