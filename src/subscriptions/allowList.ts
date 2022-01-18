/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

const getAllowListedSubscriptionEndpoints = async () => {
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
