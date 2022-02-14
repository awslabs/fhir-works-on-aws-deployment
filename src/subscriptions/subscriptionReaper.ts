/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */
import { DynamoDbDataService, DynamoDb } from 'fhir-works-on-aws-persistence-ddb';

const enableMultiTenancy = process.env.ENABLE_MULTI_TENANCY === 'true';
const dbServiceWithTenancy = new DynamoDbDataService(DynamoDb, false, {
    enableMultiTenancy,
});
const dbService = new DynamoDbDataService(DynamoDb);

const reaperHandler = async (event: any) => {
    console.log('subscriptionReaper event', event);
    const subscriptions = await dbService.getActiveSubscriptions({});
    const currentTime = new Date();
    // filter out subscriptions without a defined end time.
    // check if subscription is past its end date (ISO format)
    // example format of subscriptions: https://www.hl7.org/fhir/subscription-example.json.html
    return Promise.all(
        subscriptions
            .filter((s: Record<string, any>) => {
                const date = new Date(s.end);
                if (date.toString() === 'Invalid Date') {
                    console.log(`Skipping subscription ${s.id} since the end date is not in a valid format: ${s.end}`);
                    return false;
                }
                return currentTime >= date;
            })
            .map(async (subscription) => {
                // delete the subscription as it has reached its end time
                return dbServiceWithTenancy.deleteResource({
                    resourceType: subscription.resourceType,
                    // eslint-disable-next-line no-underscore-dangle
                    id: subscription._id,
                    // _tenantId is an internal field, and getActiveSubscriptions returns the raw Record<string, any>
                    // eslint-disable-next-line no-underscore-dangle
                    tenantId: subscription._tenantId,
                });
            }),
    );
};

export default reaperHandler;
