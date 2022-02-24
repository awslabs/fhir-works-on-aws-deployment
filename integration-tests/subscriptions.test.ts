/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import * as AWS from 'aws-sdk';
import { AxiosInstance } from 'axios';
import { clone } from 'lodash';
import waitForExpect from 'wait-for-expect';
import { SubscriptionsHelper } from './SubscriptionsHelper';
import { getFhirClient } from './utils';

jest.setTimeout(700_000);

const { SUBSCRIPTIONS_ENABLED, SUBSCRIPTIONS_NOTIFICATIONS_TABLE, SUBSCRIPTIONS_ENDPOINT, API_AWS_REGION } =
    process.env;

if (API_AWS_REGION === undefined) {
    throw new Error('API_AWS_REGION environment variable is not defined');
}

AWS.config.update({ region: API_AWS_REGION });

test('empty test placeholder', () => {
    // empty test to avoid the "Your test suite must contain at least one test." error
});

if (SUBSCRIPTIONS_ENABLED === 'true') {
    if (!SUBSCRIPTIONS_ENDPOINT) {
        throw new Error('SUBSCRIPTIONS_ENDPOINT environment variable is not defined');
    }
    let client: AxiosInstance;
    let clientAnotherTenant: AxiosInstance;

    const subscriptionResource = {
        resourceType: 'Subscription',
        status: 'requested',
        // get a time 10 seconds (10000 ms) in the future
        end: new Date(new Date().getTime() + 10000).toISOString(),
        reason: 'Monitor Patients with name Smith',
        criteria: 'Patient?name=Smith',
        channel: {
            type: 'rest-hook',
            endpoint: SUBSCRIPTIONS_ENDPOINT!,
            payload: 'application/fhir+json',
            header: [`x-api-key: 9tosTPsmDC9pGQdcwjdwp2tsT4s620uFa38pYc9U`],
        },
    };

    describe('FHIR Subscriptions', () => {
        let subscriptionsHelper: SubscriptionsHelper;

        beforeAll(async () => {
            if (SUBSCRIPTIONS_NOTIFICATIONS_TABLE === undefined) {
                throw new Error('SUBSCRIPTIONS_NOTIFICATIONS_TABLE environment variable is not defined');
            }
            subscriptionsHelper = new SubscriptionsHelper(SUBSCRIPTIONS_NOTIFICATIONS_TABLE);
            client = await getFhirClient();
            clientAnotherTenant = await getFhirClient({ tenant: 'tenant2' });
        });

        test('test', async () => {
            const x = await subscriptionsHelper.getNotifications('/lala');
            console.log(x);
        });

        if (process.env.MULTI_TENANCY_ENABLED === 'true') {
            test('tenant isolation', async () => {
                // tenant 1 creates a subscription
                const subResource = clone(subscriptionResource);
                // make sure the end date isn't caught by the reaper before the test completes
                subResource.end = new Date(new Date().getTime() + 100000).toISOString();
                const postResult = await client.post('Subscription', subscriptionResource);
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
                // give SLA of 20 seconds for notification to be placed in ddb table
                await new Promise((r) => setTimeout(r, 20000));
                // make sure no notification was receieved for first tenant
                const notifications = await subscriptionsHelper.getNotifications(`/Patient/${postPatientResult.data.id}`);
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
