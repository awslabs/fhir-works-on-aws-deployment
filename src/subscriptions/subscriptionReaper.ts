/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */
import { DynamoDbDataService, DynamoDb } from 'fhir-works-on-aws-persistence-ddb';

const enableMultiTenancy = process.env.ENABLE_MULTI_TENANCY === 'true';
const dbService = new DynamoDbDataService(DynamoDb, false, {
    enableMultiTenancy,
});

const reaperHandler = async (event: any) => {
    console.log('subscriptionReaper event', event);
    try {
        const subscriptions = await dbService.getActiveSubscriptions({});
        const currentTime = new Date();
        // filter out subscriptions without a defined end time.
        // check if subscription is past its end date (ISO format)
        // example format of subscriptions: https://www.hl7.org/fhir/subscription-example.json.html
        return await Promise.all(
            subscriptions
                .filter((s: Record<string, any>) => s.end && currentTime >= new Date(s.end))
                .map(async (subscription) => {
                    // delete the subscription as it has reached its end time
                    return dbService.deleteResource({
                        resourceType: subscription.resourceType,
                        id: subscription.id,
                    });
                }),
        );
    } catch (e: any) {
        throw new Error(`Subscription Reaper failed! Error: ${e}`);
    }
};

export default reaperHandler;
