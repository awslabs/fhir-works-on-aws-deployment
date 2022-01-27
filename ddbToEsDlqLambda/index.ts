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

    // when there are no messages, resp.Messages is undefined
    const messages = resp.Messages === undefined ? [] : resp.Messages;
    logger.debug('Received messages', JSON.stringify(messages));
    return messages;
};

const deleteMessages = async (queueUrl, messagesToDelete) => {
    const resp = await sqs
        .deleteMessageBatch({
            QueueUrl: queueUrl,
            Entries: messagesToDelete,
        })
        .promise()
        .catch((e) => {
            throw new Error(`Failed to delete message: ${JSON.stringify(e)}`);
        });

    // resp.Successful contains successfully deleted messages.
    if (resp.Successful) {
        logger.debug('Deleted messages', JSON.stringify(resp.Successful));
    }

    // resp.Failed contains messages that were failed to delete
    if (resp.Failed && resp.Failed.length) {
        throw new Error(`Failed to delete messages: ${JSON.stringify(resp.Failed)}`);
    }
};

/**
 * This is asynchronous invocation, the successful invocation doesn't mean
 * successful function execution.
 */
const invokeDdbToEsLambda = async (records) => {
    const resp = await lambda
        .invoke({
            FunctionName: DDB_TO_ES_LAMBDA_NAME,
            InvocationType: 'Event',
            Payload: JSON.stringify(records),
        })
        .promise()
        .catch((e) => {
            throw new Error(`Failed to invoke DdbToEsLambda: ${JSON.stringify(e)}`);
        });

    if (resp.StatusCode >= 400) {
        throw new Error(`Failed to invoke DdbToEsLambda: ${JSON.stringify(resp.Payload)}`);
    }

    logger.debug('Invoked DdbToEsLambda with records', JSON.stringify(records));
};

const getRecordsFromDdbStream = async (message) => {
    const resp = await dynamodbstreams
        .getShardIterator({
            ShardId: message.DDBStreamBatchInfo.shardId,
            ShardIteratorType: 'AT_SEQUENCE_NUMBER',
            StreamArn: message.DDBStreamBatchInfo.streamArn,
            SequenceNumber: message.DDBStreamBatchInfo.startSequenceNumber,
        })
        .promise()
        .catch((e) => {
            throw new Error(`Failed to get shard iterator: ${JSON.stringify(e)}`);
        });

    const records = await dynamodbstreams
        .getRecords({
            ShardIterator: resp.ShardIterator,
        })
        .promise()
        .catch((e) => {
            throw new Error(`Failed to get records: ${JSON.stringify(e)}`);
        });

    logger.debug('Fetched records', JSON.stringify(records));
    return records;
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
 *      successful function execution. In that case, a new message would be sent to DLQ.
 *   4. Message visibility timeout must be greater than the total time of processing the message,
 *      otherwise the message would be received by this Lambda function again. Too long timeout would
 *      make the messages invisible for long time, and it appears there are no messages in DLQ.
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
        if (messages.length <= 0) {
            // No further messages to process, stop here.
            break;
        }

        numMessagesToProcess -= messages.length;
        const messagesToDelete = [];
        /* eslint-disable no-restricted-syntax */
        for (const message of messages) {
            try {
                const records = await getRecordsFromDdbStream(JSON.parse(message.Body));
                await invokeDdbToEsLambda(records);
                messagesToDelete.push({
                    Id: message.MessageId,
                    ReceiptHandle: message.ReceiptHandle,
                });
            } catch (e) {
                // DDBStream or Lambda error. Ignore for now, and continue processing messages.
                logger.error(e);
            }
        }

        if (messagesToDelete.length > 0) {
            // only delete successfully re-synced messages
            await deleteMessages(QUEUE_URL, messagesToDelete);
        }
    }
};
