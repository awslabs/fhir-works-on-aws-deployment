/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import * as AWS from 'aws-sdk';
import { AxiosInstance } from 'axios';
import { v4 } from 'uuid';
import waitForExpect from 'wait-for-expect';
import { SubscriptionsHelper } from './SubscriptionsHelper';
import { getFhirClient, randomSubscription } from './utils';

jest.setTimeout(700_000);

const {
    SUBSCRIPTIONS_ENABLED,
    SUBSCRIPTIONS_NOTIFICATIONS_TABLE,
    SUBSCRIPTIONS_ENDPOINT,
    API_AWS_REGION,
    SUBSCRIPTIONS_API_KEY,
    MULTI_TENANCY_ENABLED,
} = process.env;

if (API_AWS_REGION === undefined) {
    throw new Error('API_AWS_REGION environment variable is not defined');
}

AWS.config.update({ region: API_AWS_REGION });

test('empty test placeholder', () => {
    // empty test to avoid the "Your test suite must contain at least one test." error
});

if (SUBSCRIPTIONS_ENABLED === 'true') {
    if (SUBSCRIPTIONS_ENDPOINT === undefined) {
        throw new Error('SUBSCRIPTIONS_ENDPOINT environment variable is not defined');
    }
    if (SUBSCRIPTIONS_API_KEY === undefined) {
        throw new Error('SUBSCRIPTIONS_API_KEY environment variable is not defined');
    }
    let client: AxiosInstance;

    describe('FHIR Subscriptions', () => {
        let subscriptionsHelper: SubscriptionsHelper;

        beforeAll(async () => {
            if (SUBSCRIPTIONS_NOTIFICATIONS_TABLE === undefined) {
                throw new Error('SUBSCRIPTIONS_NOTIFICATIONS_TABLE environment variable is not defined');
            }
            subscriptionsHelper = new SubscriptionsHelper(SUBSCRIPTIONS_NOTIFICATIONS_TABLE);
            client = await getFhirClient();
        });

        test('test', async () => {
            const x = await subscriptionsHelper.getNotifications('/lala');
            console.log(x);
        });

        if (MULTI_TENANCY_ENABLED === 'true') {
            test('tenant isolation', async () => {
                const clientAnotherTenant = await getFhirClient({ tenant: 'tenant2' });
                // tenant 1 creates a subscription
                const uuid = v4();
                const subResource = randomSubscription(uuid);
                const postResult = await client.post('Subscription', subResource);
                expect(postResult.status).toEqual(201);
                const resourceThatMatchesSubscription = {
                    resourceType: 'Patient',
                    name: [
                        {
                            given: ['Smith'],
                            family: 'Smith',
                        },
                    ],
                };
                // post matching resource on another tenant
                const postPatientResult = await clientAnotherTenant.post('Patient', resourceThatMatchesSubscription);
                expect(postPatientResult.status).toEqual(201);
                // give 2 minutes for notification to be placed in ddb table
                await new Promise((r) => setTimeout(r, 120_000));
                // make sure no notification was receieved for first tenant
                const notifications = await subscriptionsHelper.getNotifications(
                    `${uuid}/Patient/${postPatientResult.data.id}`,
                );
                expect(notifications).toEqual([]);
            });
        }
    });

    describe('test subscription creation and deletion', () => {
        beforeAll(async () => {
            client = await getFhirClient();
        });

        test('creation of almost expiring subscription should be deleted by reaper', async () => {
            // OPERATE
            const subscriptionResource = randomSubscription(v4());
            // make end date 10 seconds in the future so it is caught by the reaper
            subscriptionResource.end = new Date(new Date().getTime() + 10000).toISOString();
            const postSubResult = await client.post('Subscription', subscriptionResource);
            expect(postSubResult.status).toEqual(201); // ensure that the sub resource is created
            const subResourceId = postSubResult.data.id;
            // wait until reaper has had a chance to run
            await waitForExpect(
                async () => {
                    console.log(`Checking if Subscription/${subResourceId} has already been deleted`);
                    await expect(client.get(`Subscription/${subResourceId}`)).rejects.toMatchObject({
                        response: { status: 404 },
                    });
                },
                360_000, // check for 6 minutes
                30_000, // every 30 seconds
            );
        });
    });
}
