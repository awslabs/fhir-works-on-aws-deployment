/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import AWS from 'aws-sdk';

const { IS_OFFLINE } = process.env;

if (IS_OFFLINE === 'true') {
    AWS.config.update({
        region: 'us-west-2',
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_KEY,
    });
}
export const DynamoDb = new AWS.DynamoDB();

export const DynamoDBConverter = AWS.DynamoDB.Converter;

export const RESOURCE_TABLE = process.env.RESOURCE_TABLE || '';
