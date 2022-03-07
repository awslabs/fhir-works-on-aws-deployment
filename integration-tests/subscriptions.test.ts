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
import { getFhirClient, randomSubscription, sleep } from './utils';

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
    if (SUBSCRIPTIONS_NOTIFICATIONS_TABLE === undefined) {
        throw new Error('SUBSCRIPTIONS_NOTIFICATIONS_TABLE environment variable is not defined');
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
            subscriptionsHelper = new SubscriptionsHelper(SUBSCRIPTIONS_NOTIFICATIONS_TABLE);
            client = await getFhirClient('fhirUser user/*.*', true);
        });

        if (MULTI_TENANCY_ENABLED === 'true') {
            test('tenant isolation', async () => {
                const clientAnotherTenant = await getFhirClient('fhirUser user/*.*', true, { tenant: 'tenant2' });
                // tenant 1 creates a subscription
                const uuid = v4();
                const subResource = randomSubscription(uuid);
                const postResult = await client.post('Subscription', subResource);
                expect(postResult.status).toEqual(201);
                // post matching resource on another tenant, waiting 1 minute for subscription to enable
                await sleep(60_000);
                const postPatientResult = await clientAnotherTenant.post('Patient', resourceThatMatchesSubscription);
                expect(postPatientResult.status).toEqual(201);
                // give 1 minute for notification to be placed in ddb table
                await sleep(60_000);
                // make sure no notification was receieved for first tenant
                const notifications = await subscriptionsHelper.getNotifications(
                    `${uuid}/Patient/${postPatientResult.data.id}`,
                );
                expect(notifications).toEqual([]);
            });
        }

        test('invalid subscriptions', async () => {
            // test for endpoints that aren't allow listed
            let subResource = randomSubscription(v4());
            subResource.channel.endpoint = 'https://non_allow_listed_endpoint.com';
            await expect(client.post('Subscription', subResource)).rejects.toMatchObject({
                response: { status: 400 },
            });

            // test for unsupported channel types (email, sms, and websocket)
            subResource = randomSubscription(v4());
            subResource.channel.type = 'email';
            await expect(client.post('Subscription', subResource)).rejects.toMatchObject({
                response: { status: 400 },
            });
            subResource.channel.type = 'sms';
            await expect(client.post('Subscription', subResource)).rejects.toMatchObject({
                response: { status: 400 },
            });
            subResource.channel.type = 'websocket';
            await expect(client.post('Subscription', subResource)).rejects.toMatchObject({
                response: { status: 400 },
            });

            // test for invalid criteria
            subResource = randomSubscription(v4());
            subResource.criteria = 'Patient?managing-organization=Organization/123';
            await expect(client.post('Subscription', subResource)).rejects.toMatchObject({
                response: { status: 400 },
            });
        });

        test('end to end test with id notifications', async () => {
            const uuid = v4();
            const subResource = randomSubscription(uuid);
            // 1. Create a Subscription.
            const postSubscriptionResult = await client.post('Subscription', subResource);
            expect(postSubscriptionResult.status).toBe(201);

            // 2. Create/Update a resource that matches the subscription.
            // wait for subscription to be enabled
            await sleep(60_000);
            const postPatientResult = await client.post('Patient', resourceThatMatchesSubscription);
            expect(postPatientResult.status).toEqual(201);
            let updatePatientResult = await client.put(`Patient/${postPatientResult.data.id}`, {
                ...resourceThatMatchesSubscription,
                id: postPatientResult.data.id,
            });
            expect(updatePatientResult.status).toEqual(200);

            // 3. Verify that notifications are received
            await waitForExpect(
                async () => {
                    const notifications = await subscriptionsHelper.getNotifications(
                        `/${uuid}/Patient/${postPatientResult.data.id}`,
                    );
                    expect(notifications.length).toEqual(2); // one for create, one for update
                    expect(notifications[0].httpMethod).toEqual('PUT');
                    expect(notifications[0].body).toBeNull();
                    expect(notifications[0].headers).toHaveProperty('x-api-key', SUBSCRIPTIONS_API_KEY);
                    expect(notifications[1].httpMethod).toEqual('PUT');
                    expect(notifications[1].body).toBeNull();
                    expect(notifications[1].headers).toHaveProperty('x-api-key', SUBSCRIPTIONS_API_KEY);
                },
                60_000,
                5_000,
            );

            // 4. Delete the Subscription
            const deleteSubscriptionResult = await client.delete(`Subscription/${postSubscriptionResult.data.id}`);
            expect(deleteSubscriptionResult.status).toEqual(200);
            await sleep(60_000);

            // 5. Create/Update a resource that matches the subscription.
            // test update:
            updatePatientResult = await client.put(`Patient/${postPatientResult.data.id}`, {
                ...resourceThatMatchesSubscription,
                id: postPatientResult.data.id,
            });
            expect(updatePatientResult.status).toEqual(200);
            // test create:
            const postAnotherPatientResult = await client.post('Patient', resourceThatMatchesSubscription);
            expect(postAnotherPatientResult.status).toEqual(201);

            // 6. Verify that notifications are no longer being sent
            await sleep(60_000);
            let notifications = await subscriptionsHelper.getNotifications(
                `/${uuid}/Patient/${postPatientResult.data.id}`,
            );
            // we still have the two notifications from earlier in the test, but no more
            expect(notifications.length).toEqual(2);
            // we don't have any notifications for the newly created patient
            notifications = await subscriptionsHelper.getNotifications(
                `/${uuid}/Patient/${postAnotherPatientResult.data.id}`,
            );
            expect(notifications).toEqual([]);
        });

        test('end to end test with empty notifications', async () => {
            const uuid = v4();
            const subResource = randomSubscription(uuid, true);
            // 1. Create a Subscription.
            const postSubscriptionResult = await client.post('Subscription', subResource);
            expect(postSubscriptionResult.status).toBe(201);

            // 2. Create/Update a resource that matches the subscription.
            // wait 1 min to let subscription enable
            await sleep(60_000);
            const postPatientResult = await client.post('Patient', resourceThatMatchesSubscription);
            expect(postPatientResult.status).toEqual(201);
            const updatePatientResult = await client.put(`Patient/${postPatientResult.data.id}`, {
                ...resourceThatMatchesSubscription,
                id: postPatientResult.data.id,
            });
            expect(updatePatientResult.status).toEqual(200);

            // 3. Verify that notifications are received
            await waitForExpect(
                async () => {
                    const notifications = await subscriptionsHelper.getNotifications(`/${uuid}`);
                    expect(notifications.length).toEqual(2);
                    expect(notifications[0].httpMethod).toEqual('POST');
                    expect(notifications[0].body).toBeNull();
                    expect(notifications[0].headers).toHaveProperty('x-api-key', SUBSCRIPTIONS_API_KEY);
                    expect(notifications[1].httpMethod).toEqual('POST');
                    expect(notifications[1].body).toBeNull();
                    expect(notifications[1].headers).toHaveProperty('x-api-key', SUBSCRIPTIONS_API_KEY);
                },
                60_000,
                5_000,
            );
        });
    });

    describe('test subscription creation and deletion', () => {
        beforeAll(async () => {
            client = await getFhirClient('fhirUser user/*.*', true);
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
