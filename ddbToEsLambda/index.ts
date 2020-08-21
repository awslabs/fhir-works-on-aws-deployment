/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { handleDdbToEsEvent } from '@awslabs/aws-fhir-persistence-ddb';

exports.handler = async (event: any) => {
    await handleDdbToEsEvent(event);
};
