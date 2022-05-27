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
 * - Command: node scripts/sort-key-migration.js
 * - Cmd with path variables:
 * OLD_TABLE=resource-dev NEW_TABLE=resource-db-dev REGION=us-west-2 ACCESS_KEY=<> SECRET_KEY=<> node scripts/sort-key-migration.js
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

(async () => {
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
            console.error(`\nNo elements found in ${OLD_RESOURCE_TABLE}. You probably do not need to run this script`);
            return;
        }

        for (let i = 0; i < scanResult.Items.length; i += 1) {
            const resourceJson = scanResult.Items[i];
            const resource = DynamoDBConverter.unmarshall(resourceJson);
            resource.vid = parseInt(resource.vid, 10) || resource.vid;
            batchWrites.push(createPutRequest(resource));
            if (batchWrites.length === 25) {
                console.log(`Writing a batch of resources of size: ${batchWrites.length}`);
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
        console.log(`Writing a batch of resources of size: ${batchWrites.length}`);
        batchPromises.push(DynamoDb.batchWriteItem(createBatchWriteRequest(batchWrites)).promise());
        batchWrites = [];
    }
    console.log(`Finished writing updates to new table: ${NEW_RESOURCE_TABLE}`);
    let hasError = false;

    try {
        const writeResults = await Promise.all(batchPromises);

        console.log('Looking for BatchWrite Errors');
        for (let i = 0; i < writeResults.length; i += 1) {
            const result = writeResults.UnprocessedItems;
            if (result && result[NEW_RESOURCE_TABLE]) {
                hasError = true;
                console.error('\nUnprocessed Entry:');
                console.error(result[NEW_RESOURCE_TABLE]);
            }
        }
    } catch (e) {
        hasError = true;
        console.error('\nThere has been errors batch writing to DyanamoDB. Stack trace:');
        console.error(e);
    }

    if (hasError) {
        console.error('\nIf you run into this issue our advice is to re-run the script as it is safe to do so');
        console.error('If that does not help please examine the DDB entries closely and determine if you could either');
        console.error(`\t1) Manually fix the entry in the old "${OLD_RESOURCE_TABLE}" and re-run this script`);
        console.error(`\t2) Manually migrate data from old "${OLD_RESOURCE_TABLE}" to new "${NEW_RESOURCE_TABLE}"`);
    }

    console.log('\nScript has finished running!');
})();
