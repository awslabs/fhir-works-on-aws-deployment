/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

/**
 * This file will overwrite the default src/subscriptions/allowList.ts when deploying to integ test environments.
 */

import { SubscriptionEndpoint } from 'fhir-works-on-aws-routing/lib/router/validation/subscriptionValidator';

const getAllowListedSubscriptionEndpoints = async (): Promise<SubscriptionEndpoint[]> => {
    const testEndpoint: RegExp = new RegExp(`^${process.env.SUBSCRIPTIONS_ENDPOINT!}`);
    return [
        {
            tenantId: 'tenant1',
            endpoint: testEndpoint,
        },
        {
            tenantId: 'tenant2',
            endpoint: testEndpoint,
        },
        {
            endpoint: testEndpoint,
        },
    ];
};

export default getAllowListedSubscriptionEndpoints;
