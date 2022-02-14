/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { StreamSubscriptionMatcher } from 'fhir-works-on-aws-search-es';

import { DynamoDb, DynamoDbDataService } from 'fhir-works-on-aws-persistence-ddb';
import { fhirVersion } from '../src/config';
import { loadImplementationGuides } from '../src/implementationGuides/loadCompiledIGs';
import publishToSNS from './snsPublish';

const dynamoDbDataService = new DynamoDbDataService(DynamoDb);

const topicArn = process.env.SUBSCRIPTIONS_TOPIC as string;

const streamSubscriptionMatcher = new StreamSubscriptionMatcher(dynamoDbDataService, {
    fhirVersion,
    compiledImplementationGuides: loadImplementationGuides('fhir-works-on-aws-search-es'),
});

exports.handler = async (event: any) => {
    await publishToSNS(await streamSubscriptionMatcher.match(event), topicArn);
};
