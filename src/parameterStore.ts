/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import AWS from 'aws-sdk';

const { IS_OFFLINE, AWS_REGION, STAGE } = process.env;

export const getSSM = () => {
    if (IS_OFFLINE === 'true') {
        return new AWS.SSM({
            region: 'us-west-2',
            accessKeyId: process.env.ACCESS_KEY,
            secretAccessKey: process.env.SECRET_KEY,
        });
    }

    return new AWS.SSM();
};

export const getIntegrationTransformUrl = async (): Promise<string> => {
    const ssm = getSSM();
    let path = process.env.INTEGRATION_TRANSFORM_PATH;
    if (path === undefined) {
        throw new Error('INTEGRATION_TRANSFORM_PATH is not defined in environment variables');
    }
    if (IS_OFFLINE === 'true') {
        path = `fhir-service.integration-transform.${AWS_REGION}.${STAGE}.url`;
    }

    const data = await ssm
        .getParameter({
            Name: path,
            WithDecryption: true,
        })
        .promise();

    // @ts-ignore
    return data.Parameter.Value;
};
