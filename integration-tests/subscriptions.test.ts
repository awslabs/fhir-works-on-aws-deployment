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
    const resourceThatMatchesSubscription = {
        resourceType: 'Patient',
        name: [
            {
                given: ['Smith'],
                family: 'Smith',
            },
        ],
    };

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

        test('end to end test with id notifications', async () => {
            const uuid = v4();
            const subResource = randomSubscription(uuid);
            // 1. Create a Subscription.
            const postSubscriptionResult = await client.post('Subscription', subResource);
            expect(postSubscriptionResult.status).toBe(201);
            // 2. Create/Update a resource that matches the subscription.
            const postPatientResult = await client.post('Patient', resourceThatMatchesSubscription);
            expect(postPatientResult.status).toEqual(201);
            // 3. Verify that notifications are received
            // give 2 minutes for notification to be placed in ddb table
            await new Promise((r) => setTimeout(r, 120_000));
            // make sure notification was receieved
            let notifications = await subscriptionsHelper.getNotifications(
                `/${uuid}/Patient/${postPatientResult.data.id}`,
            );
            expect(notifications).not.toEqual([]);
            expect(notifications[0].httpMethod).toEqual('PUT');
            expect(notifications[0].body).toBeNull();
            // 4. Delete the Subscription
            const deleteSubscriptionResult = await client.delete(`Subscription/${postSubscriptionResult.data.id}`);
            expect(deleteSubscriptionResult.status).toEqual(200);
            await new Promise((r) => setTimeout(r, 120_000));
            // 5. Create/Update a resource that matches the subscription.
            // test update:
            const updatePatientResult = await client.put(`Patient/${postPatientResult.data.id}`, {
                ...resourceThatMatchesSubscription,
                id: postPatientResult.data.id,
            });
            expect(updatePatientResult.status).toEqual(200);
            // test create:
            const postAnotherPatientResult = await client.post('Patient', resourceThatMatchesSubscription);
            expect(postAnotherPatientResult.status).toEqual(201);
            // 6. Verify that notifications are no longer being sent
            await new Promise((r) => setTimeout(r, 120_000));
            notifications = await subscriptionsHelper.getNotifications(`/${uuid}/Patient/${postPatientResult.data.id}`);
            // we still have the one notification from earlier in the test, but no more
            expect(notifications.length).toEqual(1);
        });

        test('end to end test with empty notifications', async () => {
            const uuid = v4();
            const subResource = randomSubscription(uuid, true);
            // 1. Create a Subscription.
            const postSubscriptionResult = await client.post('Subscription', subResource);
            expect(postSubscriptionResult.status).toBe(201);
            // 2. Create/Update a resource that matches the subscription.
            const postPatientResult = await client.post('Patient', resourceThatMatchesSubscription);
            expect(postPatientResult.status).toEqual(201);
            // 3. Verify that notifications are received
            // give 2 minutes for notification to be placed in ddb table
            await new Promise((r) => setTimeout(r, 120_000));
            // make sure notification was receieved
            let notifications = await subscriptionsHelper.getNotifications(`/${uuid}`);
            expect(notifications).not.toEqual([]);
            expect(notifications[0].httpMethod).toEqual('POST');
            expect(notifications[0].body).toBeNull();
            // get resources updated within three minutes ago
            // now we search for our patient to make sure it was updated correctly
            const searchResult = await client.get(
                `${subResource.criteria}&_lastUpdated=gt${new Date(new Date().getTime() - 180_000).toISOString()}`,
            );
            expect(searchResult.data.total).toEqual(1);
            expect(searchResult.data.entry[0].resource.id).toEqual(postPatientResult.data.id);
            // 4. Delete the Subscription
            const deleteSubscriptionResult = await client.delete(`Subscription/${postSubscriptionResult.data.id}`);
            expect(deleteSubscriptionResult.status).toEqual(200);
            // 5. Create/Update a resource that matches the subscription.
            // test update:
            const updatePatientResult = await client.put(`Patient/${postPatientResult.data.id}`, {
                ...resourceThatMatchesSubscription,
                id: postPatientResult.data.id,
            });
            expect(updatePatientResult.status).toEqual(200);
            // test create:
            const postAnotherPatientResult = await client.post('Patient', resourceThatMatchesSubscription);
            expect(postAnotherPatientResult.status).toEqual(201);
            // 6. Verify that notifications are no longer being sent
            await new Promise((r) => setTimeout(r, 120_000));
            notifications = await subscriptionsHelper.getNotifications(`/${uuid}`);
            // we have the one notification from earlier in the test, but no more
            expect(notifications.length).toEqual(1);
        });
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
