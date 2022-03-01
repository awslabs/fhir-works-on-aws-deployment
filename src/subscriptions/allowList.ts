/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { SubscriptionEndpoint } from 'fhir-works-on-aws-routing/lib/router/validation/subscriptionValidator';

/**
 * Return the list of endpoints that are allowed in Subscriptions.
 * When multi-tenancy is enabled you must specify the tenantId associated with each endpoint.
 */
const getAllowListedSubscriptionEndpoints = async (): Promise<SubscriptionEndpoint[]> => {
    return [];
    // [
    // Schema:
    //     {
    //         endpoint: string | RegExp;
    //         headers?: string[];
    //         tenantId? string;
    //     }
    //
    // Simple example:
    //     {
    //         endpoint: 'https://my-endpoint.com/some-path',
    //         headers: ['some-header: some-value']
    //         tenantId: 'tenant-1',
    //     }
    //
    // RegExp example:
    //     {
    //         endpoint: /^https:\/\/my-endpoint.com\/.*/,
    //     }
    //
    // When using Authorization headers, it is recommended to store them securely in an external system such as AWS Secrets Manager.
    // Example:
    //     {
    //         endpoint: 'https://my-endpoint.com',
    //         headers: [
    //              `Authorization: ${(await secretsManagerClient.getSecretValue({ SecretId: 'YOUR_SECRET_ID' })).data.SecretString}`;
    //         ],
    //     }
    //     ...
    // ]
};

export default getAllowListedSubscriptionEndpoints;
