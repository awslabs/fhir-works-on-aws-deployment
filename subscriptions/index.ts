/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import axios from 'axios';
import { DynamoDbDataService } from 'fhir-works-on-aws-persistence-ddb/src/dataServices/dynamoDbDataService';

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
    console.log(event);
    try {
        
    } catch (e) {
        await sendCfnResponse(event, 'FAILED', e);
    }
};
