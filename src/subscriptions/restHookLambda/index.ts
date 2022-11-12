/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import RestHookHandler from './restHook';
import { getAllowListInfo } from './allowListUtil';
import { SubscriptionEndpoint } from '../subscriptionEndpoint';

const enableMultitenancy = process.env.ENABLE_MULTI_TENANCY === 'true';

const allowListPromise: Promise<{ [key: string]: SubscriptionEndpoint[] }> = getAllowListInfo({
    enableMultitenancy,
});

const restHookHandler = new RestHookHandler({ enableMultitenancy });

exports.handler = async (event: any) => {
    return restHookHandler.sendRestHookNotification(event, allowListPromise);
};
