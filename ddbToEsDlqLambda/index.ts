import AWS from 'aws-sdk';
import { makeLogger } from 'fhir-works-on-aws-interface';

let logger;
const { QUEUE_URL, DDB_TO_ES_LAMBDA_NAME, MAX_NUMBER_OF_MESSAGES_TO_PROCESS } = process.env;
const MESSAGE_BATCH_SIZE = 10;
const MESSAGE_VISIBILITY_TIMEOUT = 30; // seconds
const INVOCATION_TYPE = 'RequestResponse'; // synchronous invocation
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
            throw new Error(`Failed to delete messages: ${JSON.stringify(e)}`);
        });

    // resp.Successful contains successfully deleted messages.
    if (resp.Successful) {
        logger.debug('Deleted messages', JSON.stringify(resp.Successful));
    }

    // resp.Failed contains messages that were failed to be deleted
    if (resp.Failed && resp.Failed.length) {
        throw new Error(`Failed to delete messages: ${JSON.stringify(resp.Failed)}`);
    }
};

const invokeDdbToEsLambda = async (records) => {
    const resp = await lambda
        .invoke({
            FunctionName: DDB_TO_ES_LAMBDA_NAME,
            InvocationType: INVOCATION_TYPE,
            Payload: JSON.stringify(records),
        })
        .promise()
        .catch((e) => {
            throw new Error(`Failed to invoke DdbToEsLambda: ${JSON.stringify(e)}`);
        });

    // StatusCode 200 only means successful invocation.
    if (resp.StatusCode >= 400) {
        throw new Error(`Failed to invoke DdbToEsLambda: ${JSON.stringify(resp.Payload)}`);
    }

    // When errors occur during execution, StatusCode is 200, but FunctionError is present.
    if (resp.FunctionError) {
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
 * This Lambda function will read message from the DDbToEs DLQ, fetch records from the DynamoDB stream
 * referenced in the queued message, and invoke the DDBToEs Lambda function providing the records as input.
 *
 * Note:
 *   1. Message retention period is 14 days. After retention period, messages would be deleted automatically.
 *   2. Record retention period is 24 hours. After retention period, records would be deleted automatically.
 *   3. Message visibility timeout must be greater than the total time of processing the message,
 *      otherwise the message would be received by this Lambda function again. Too long timeout would
 *      make the messages invisible for long time, and it appears there are no messages in DLQ.
 */
exports.handler = async (event) => {
    // Initializing the logger inside the handler would prevent logger from caching.
    // This ensures log level changes would take effect immediately.
    logger = makeLogger(
        {
            component: 'DdbToEsDlqLambda',
        },
        process.env.LOG_LEVEL,
    );

    let numMessagesToProcess = event.maxNumberOfMessages
        ? event.maxNumberOfMessages
        : Number(MAX_NUMBER_OF_MESSAGES_TO_PROCESS);

    if (typeof numMessagesToProcess !== 'number' || numMessagesToProcess < 1) {
        throw new Error(`invalid maxNumberOfMessages: ${numMessagesToProcess}`);
    }

    while (numMessagesToProcess > 0) {
        // If any error is thrown, then stop processing messages.
        /* eslint-disable no-await-in-loop */
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
            const records = await getRecordsFromDdbStream(JSON.parse(message.Body));
            await invokeDdbToEsLambda(records);
            messagesToDelete.push({
                Id: message.MessageId,
                ReceiptHandle: message.ReceiptHandle,
            });
        }

        await deleteMessages(QUEUE_URL, messagesToDelete);
    }
};
