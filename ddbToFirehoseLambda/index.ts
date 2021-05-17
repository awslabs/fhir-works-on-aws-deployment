/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { handleDdbToFirehoseEvent } from 'fhir-works-on-aws-persistence-ddb';

exports.handler = async (event: any) => {
    await handleDdbToFirehoseEvent(event);
};
