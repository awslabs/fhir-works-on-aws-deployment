/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pre-req:
 * - Deploy the new deployment release: https://github.com/awslabs/fhir-works-on-aws-deployment/tree/v1.2.0
 * - Install node version 12+: https://nodejs.org/en/download/
 * - Ensure your user has SCAN access to OLD_TABLE and WRITE access to NEW_TABLE
 * Required path params for this script:
 * - REGION - AWS Region both DBs are in
 * - ACCESS_KEY - AWS Access Key
 * - SECRET_KEY - AWS Secret Key
 * - OLD_TABLE - The old table's name. It should be: ('resource-<stage>')
 * - NEW_TABLE - The new table's name. It should be: ('resource-db-<stage>')
 * Usage:
 * - Command: node -e 'require("./sort-key-migration").handler()'
 * - Cmd with path variables:
 * OLD_TABLE=resource-dev NEW_TABLE=resource-db-dev REGION=us-west-2 ACCESS_KEY=<> SECRET_KEY=<> node -e 'require("./sort-key-migration").handler()'
 */

const AWS = require('aws-sdk');

AWS.config.update({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
});

const DynamoDb = new AWS.DynamoDB();

const DynamoDBConverter = AWS.DynamoDB.Converter;

const OLD_RESOURCE_TABLE = process.env.OLD_TABLE || '';
const NEW_RESOURCE_TABLE = process.env.NEW_TABLE || '';

function createPutRequest(resource) {
    return { PutRequest: { Item: DynamoDBConverter.marshall(resource) } };
}
function createBatchWriteRequest(writeRequests) {
    return { RequestItems: { [NEW_RESOURCE_TABLE]: writeRequests } };
}

exports.handler = async () => {
    if (!OLD_RESOURCE_TABLE || !NEW_RESOURCE_TABLE) {
        throw new Error('Enviroment vars for new and old table not set properly');
    }
    const scanParam = {
        TableName: OLD_RESOURCE_TABLE,
    };

    let batchWrites = [];
    const batchPromises = [];

    let scanResult;
    console.log(`Starting scanning of old table: ${OLD_RESOURCE_TABLE}`);
    do {
        // eslint-disable-next-line no-await-in-loop
        scanResult = await DynamoDb.scan(scanParam).promise();
        if (scanResult.Items === undefined || scanResult.Items.length === 0) {
            throw new Error(`No elements found in ${OLD_RESOURCE_TABLE}`);
        }

        for (let i = 0; i < scanResult.Items.length; i += 1) {
            const resourceJson = scanResult.Items[i];
            const resource = DynamoDBConverter.unmarshall(resourceJson);
            resource.vid = parseInt(resource.vid, 10);
            batchWrites.push(createPutRequest(resource));
            if (batchWrites.length === 25) {
                console.log(`Batch write size: ${batchWrites.length}`);
                batchPromises.push(DynamoDb.batchWriteItem(createBatchWriteRequest(batchWrites)).promise());
                batchWrites = [];
            }
        }
        // continue scanning if we have more items
        if (scanResult.LastEvaluatedKey) {
            console.log('End of current scan; starting another');
            scanParam.ExclusiveStartKey = scanResult.LastEvaluatedKey;
        }
    } while (scanResult.LastEvaluatedKey);
    if (batchWrites.length > 0) {
        console.log(`Batch write size: ${batchWrites.length}`);
        batchPromises.push(DynamoDb.batchWriteItem(createBatchWriteRequest(batchWrites)).promise());
        batchWrites = [];
    }
    console.log(`Writing to new table: ${NEW_RESOURCE_TABLE}`);

    const writeResults = await Promise.all(batchPromises);

    console.log('Looking for BatchWrite Errors');
    for (let i = 0; i < writeResults.length; i += 1) {
        const result = writeResults.UnprocessedItems;
        if (result && result[NEW_RESOURCE_TABLE]) {
            console.error('Unprocessed Entry:');
            console.error(result[NEW_RESOURCE_TABLE]);
        }
    }

    console.log('DONE!');
};
