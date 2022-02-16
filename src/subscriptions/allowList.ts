/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { SubscriptionEndpoint } from 'fhir-works-on-aws-routing/lib/router/validation/subscriptionValidator';

const getAllowListedSubscriptionEndpoints = async (): Promise<SubscriptionEndpoint[]> => {
    return [];
    // Add here the endpoints that are allowed in Subscriptions
    // [
    //     {
    //         endpoint: string | RegExp;
    //         headers?: string[];
    //         tenantId? string;
    //     }
    //     ...
    // ]
};

export default getAllowListedSubscriptionEndpoints;
