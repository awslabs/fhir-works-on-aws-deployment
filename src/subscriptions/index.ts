/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import axios from 'axios';
import AWS from 'aws-sdk';
import { DynamoDbDataService } from 'fhir-works-on-aws-persistence-ddb/src/dataServices/dynamoDbDataService';

const enableMultiTenancy = process.env.ENABLE_MULTI_TENANCY === 'true';
const dbService = new DynamoDbDataService(new AWS.DynamoDB(), false, {
    enableMultiTenancy: enableMultiTenancy,
});

const sendCfnResponse = async (event: any, status: 'SUCCESS' | 'FAILED', error?: Error) => {
    if (error !== undefined) {
        console.log(error);
    }
    const responseBody = JSON.stringify({
        Status: status,
        Reason: error?.message,
        // The value of PhysicalResourceId doesn't really matter in this case.
        // It just needs to be the same string on all responses to indicate that it is the same resource.
        PhysicalResourceId: 'subscriptionReaper',
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
    });
    console.log(`Sending response to CFN: ${responseBody}`);
    await axios.put(event.ResponseURL, responseBody);
};

/**
 * Custom lambda handler that handles deleting expired subscriptions.
 */
exports.handler = async (event: any) => {
    try {
        const subscriptions = await dbService.getActiveSubscriptions({});
        const currentTime = new Date();
        let subTime;
        const deletions: Promise<{
            success: boolean,
            message: string,
        }>[] = [];
        // filter out subscriptions without a defined end time.
        subscriptions.filter(s => s.end).forEach(subscription => {
            // check if subscription is past its end date (ISO format)
            // example format of subscriptions: https://www.hl7.org/fhir/subscription-example.json.html
            subTime = new Date(subscription.end);
            if (currentTime >= subTime) {
                // delete the subscription as it has reached its end time
                deletions.push(dbService.deleteResource({ resourceType: subscription.resourceType, id: subscription.id }));
            }
        });
        await Promise.all(deletions);
        await sendCfnResponse(event, 'SUCCESS');
    } catch (e) {
        await sendCfnResponse(event, 'FAILED', e);
    }
};
