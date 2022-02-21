/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import * as AWS from 'aws-sdk';
import { SubscriptionsHelper } from './SubscriptionsHelper';

jest.setTimeout(300_000);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
}
