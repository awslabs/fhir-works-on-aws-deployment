/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { DynamoDbDataService, DynamoDb } from 'fhir-works-on-aws-persistence-ddb';
import reaperHandler from './subscriptionReaper';
import RestHookHandler from './restHook';
import { AllowListInfo, getAllowListInfo } from './allowListUtil';

const enableMultitenancy = process.env.ENABLE_MULTI_TENANCY === 'true';
const dbServiceWithTenancy = new DynamoDbDataService(DynamoDb, false, {
    enableMultiTenancy: enableMultitenancy,
});
const dbService = new DynamoDbDataService(DynamoDb);

const allowListPromise: Promise<{ [key: string]: AllowListInfo }> = getAllowListInfo({
    enableMultitenancy,
});

const restHookHandler = new RestHookHandler({ enableMultitenancy });

exports.handler = async (event: any) => {
    return restHookHandler.sendRestHookNotification(event, allowListPromise);
};

/**
 * Custom lambda handler that handles deleting expired subscriptions.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
exports.reaperHandler = async (event: any) => {
    return reaperHandler(dbService, dbServiceWithTenancy);
};
