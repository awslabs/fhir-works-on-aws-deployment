/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */


/**
 * Custom lambda handler that handles deleting expired subscriptions.
 */
import reaperHandler from './subscriptionReaper';
import RestHookHandler from './restHook';
import { AllowListInfo, getAllowListInfo } from './allowListUtil';

const enableMultitenancy = process.env.ENABLE_MULTI_TENANCY === 'true';

const allowListPromise: Promise<{ [key: string]: AllowListInfo }> = getAllowListInfo({
    enableMultitenancy,
});

const restHookHandler = new RestHookHandler({ enableMultitenancy });

exports.handler = async (event: any) => {
    return restHookHandler.sendRestHookNotification(event, allowListPromise);
};
exports.reaperHandler = reaperHandler;
