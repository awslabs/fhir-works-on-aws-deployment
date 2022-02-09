/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { reaperHandler } from './subscriptionReaper';

/**
 * Custom lambda handler that handles deleting expired subscriptions.
 */
exports.handler = reaperHandler;
