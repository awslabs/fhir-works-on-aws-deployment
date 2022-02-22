/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import * as AWS from 'aws-sdk';
import { AxiosInstance } from 'axios';
import { SubscriptionsHelper } from './SubscriptionsHelper';
import { getFhirClient, waitForMs } from './utils';

jest.setTimeout(300_000);

const {
    SUBSCRIPTIONS_ENABLED,
    SUBSCRIPTIONS_NOTIFICATIONS_TABLE,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    SUBSCRIPTIONS_ENDPOINT,
    API_AWS_REGION,
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
    describe('FHIR Subscriptions', () => {
        let subscriptionsHelper: SubscriptionsHelper;

        beforeAll(() => {
            if (SUBSCRIPTIONS_NOTIFICATIONS_TABLE === undefined) {
                throw new Error('SUBSCRIPTIONS_NOTIFICATIONS_TABLE environment variable is not defined');
            }
            subscriptionsHelper = new SubscriptionsHelper(SUBSCRIPTIONS_NOTIFICATIONS_TABLE);
        });

        test('test', async () => {
            const x = await subscriptionsHelper.getNotifications('/lala');
            console.log(x);
        });
    });

    let client: AxiosInstance;
    describe('test subscription creation and deletion', () => {
        beforeAll(async () => {
            client = await getFhirClient({ tenant: MULTI_TENANCY_ENABLED ? 'tenant1' : undefined });
        });

        test('creation of almost expiring subscription should be deleted by reaper', async () => {
            // OPERATE
            const subscriptionResource = {
                resourceType: 'Subscription',
                status: 'requested',
                // get a time 10 seconds (10000 ms) in the future
                end: new Date(new Date().getTime() + 10000).toISOString(),
                reason: 'Monitor Patients for Organization 123',
                criteria: 'Patient?name=Smith',
                channel: {
                    type: 'rest-hook',
                    endpoint: 'https://customer-endpoint.com',
                    payload: 'application/fhir+json',
                    header: ['Authorization: Bearer secret-token-abc-123'],
                },
            };
            const postSubResult = await client.post('Subscription', subscriptionResource);
            expect(postSubResult.status).toEqual(201); // ensure that the sub resource is created
            const subResourceId = postSubResult.data.id;
            // wait 4 min until reaper has had a chance to run
            // (waiting 5 min would hit the timeout value above)
            // it may be better to do a loop checking every minute or so or increasing the timeout
            await waitForMs(4 * 60 * 1000);
            await expect(client.get(`Subscription/${subResourceId}`)).rejects.toMatchObject({
                response: { status: 404 },
            });
        });
    });
}
