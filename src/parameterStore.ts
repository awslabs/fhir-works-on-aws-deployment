/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import AWS from 'aws-sdk';

const { IS_OFFLINE, AWS_REGION, STAGE } = process.env;

function getSSM() {
    if (IS_OFFLINE === 'true') {
        return new AWS.SSM({
            region: 'us-west-2',
            accessKeyId: process.env.ACCESS_KEY,
            secretAccessKey: process.env.SECRET_KEY,
        });
    }

    return new AWS.SSM();
}

async function getParam(paramEnvVarPath: string, pathSuffix: string): Promise<string> {
    const ssm = getSSM();
    let path = process.env[paramEnvVarPath];
    if (path === undefined) {
        throw new Error(`${paramEnvVarPath} is not defined in environment variables`);
    }
    if (IS_OFFLINE === 'true') {
        path = `fhir-service.integration-transform.${AWS_REGION}.${STAGE}.${pathSuffix}`;
    }

    const data = await ssm
        .getParameter({
            Name: path,
            WithDecryption: true,
        })
        .promise();

    return data.Parameter!.Value!;
}

export default async function getIntegrationTransformData(): Promise<{
    integrationTransformUrl: string;
    integrationTransformAwsRegion: string;
}> {
    const promises = [
        getParam('INTEGRATION_TRANSFORM_PATH', 'url'),
        getParam('INTEGRATION_TRANSFORM_AWS_REGION_PATH', 'awsRegion'),
    ];

    const [integrationTransformUrl, integrationTransformAwsRegion] = await Promise.all(promises);
    return { integrationTransformUrl, integrationTransformAwsRegion };
}
