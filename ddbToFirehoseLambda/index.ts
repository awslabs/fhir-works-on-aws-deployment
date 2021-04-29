/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import AWS from 'aws-sdk';
import _ from 'lodash';
import allSettled from 'promise.allsettled';

const REMOVE = 'REMOVE';
const USER_IDENTITY_TYPE = 'Service';
const USER_IDENTITY_PRINCIPAL_ID = 'dynamodb.amazonaws.com';
const DEFAULT_ARCHIVE_DELIVERY_STREAM_NAME = 'resource-db-dev-archive-stream';
// pessimistic default of ~32KiB/Record here so we shouldn't exceed putRecordBatch max batch size or storage size
const DEFAULT_BATCH_SIZE = 128;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || DEFAULT_BATCH_SIZE.toString(), 10);
const NEW_LINE = '\n';
const FULFILLED = 'fulfilled';

// lambda function that listens for DynamoDB stream REMOVE events caused by TTL expiration
// Writes the records to the AWS Kinesis Firehose for archiving in s3
exports.handler = async function handler(event: any) {
    try {
        const deliveryStreamName = process.env.ARCHIVE_DELIVERY_STREAM_NAME || DEFAULT_ARCHIVE_DELIVERY_STREAM_NAME;
        const firehose = new AWS.Firehose();
        console.log(JSON.stringify(event));

        // make sure we have any records
        if (!_.isUndefined(event) && _.has(event, 'Records') && !_.isEmpty(event.Records)) {
            // we're off to the races
            console.log(`DynamoDB stream published ${event.Records.length} records to process.`);

            // filter down to just the REMOVE records from TTL elaspsed
            const ttlRecords: any[] = _.filter(event.Records, record => {
                return (
                    record.eventName === REMOVE &&
                    _.has(record, 'userIdentity') &&
                    !_.isUndefined(record.userIdentity) &&
                    record.userIdentity.type === USER_IDENTITY_TYPE &&
                    record.userIdentity.principalId === USER_IDENTITY_PRINCIPAL_ID
                );
            });

            console.log(`DynamoDB TTL Remove records ${ttlRecords.length} published.`);

            // batch these bad boys up and push to AWS Kinesis Delivery Stream
            if (!_.isEmpty(ttlRecords)) {
                const projectedRecords = _.map(ttlRecords, ttlRecord => {
                    return {
                        Data: JSON.stringify(ttlRecord) + NEW_LINE,
                    };
                });
                const chunks = _.chunk(projectedRecords, BATCH_SIZE);

                // TODO: better retry logic
                const promises = _.map(chunks, chunk => {
                    const fx = firehose.putRecordBatch({
                        Records: chunk,
                        DeliveryStreamName: deliveryStreamName,
                    });
                    return fx.promise();
                });

                // We're using allSettled-shim because as of 7/21/2020 'serverless-plugin-typescript' does not support
                // Promise.allSettled.
                allSettled.shim();

                // @ts-ignore
                const results = await Promise.allSettled(promises);
                const failedResults = _.filter(results, result => {
                    return (
                        result.status !== FULFILLED || (result.status === FULFILLED && result.value.FailedPutCount > 0)
                    );
                });
                if (failedResults.length > 0) {
                    const errors = _.flatMap(failedResults, failedResult => {
                        if (failedResult.status !== FULFILLED) {
                            return [failedResult];
                        }
                        return _.filter(failedResult.value.RequestResponses, requestResponse => {
                            return _.has(requestResponse, 'ErrorCode');
                        });
                    });
                    console.log(`sing sad songs, ${errors.length} records failed. ${JSON.stringify(errors)}`);
                } else {
                    console.log(`sing happy songs, ${ttlRecords.length} records pushed to delivery stream`);
                }
            } else {
                console.log('Nothing to see here, carry on.');
            }
        } else {
            console.log('No records published by Dynamodb stream...');
        }
    } catch (ex) {
        console.log('error processing dynamodb stream records to AWS Firehose', ex);
        console.log(JSON.stringify(event));
        throw ex;
    }
};
