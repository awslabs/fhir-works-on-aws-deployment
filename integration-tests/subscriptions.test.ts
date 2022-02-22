/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import * as AWS from 'aws-sdk';
import { AxiosInstance } from 'axios';
import waitForExpect from 'wait-for-expect';
import { SubscriptionsHelper } from './SubscriptionsHelper';
import { getFhirClient } from './utils';

jest.setTimeout(700_000);

const {
    SUBSCRIPTIONS_ENABLED,
    SUBSCRIPTIONS_NOTIFICATIONS_TABLE,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    SUBSCRIPTIONS_ENDPOINT,
    API_AWS_REGION,
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
            client = await getFhirClient();
        });

        test('creation of almost expiring subscription should be deleted by reaper', async () => {
            // OPERATE
            const subscriptionResource = {
                resourceType: 'Subscription',
                status: 'requested',
                // get a time 10 seconds (10000 ms) in the future
                end: new Date(new Date().getTime() + 10000).toISOString(),
                reason: 'Monitor Patients with name Smith',
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
            // wait until reaper has had a chance to run
            await waitForExpect(
                async () => {
                    try {
                        console.log(`Checking if Subscription/${subResourceId} has already been deleted`);
                        const result = await client.get(`Subscription/${subResourceId}`);
                        expect(result.status).toEqual(404);
                    } catch (e) {
                        expect(e).toMatchObject({
                            response: { status: 404 },
                        });
                    }
                },
                360_000, // check for 6 minutes
                30_000, // every 30 seconds
            );
        });
    });
}
