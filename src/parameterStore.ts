/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import AWS from 'aws-sdk';

const { IS_OFFLINE, STAGE } = process.env;

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

function getParamPath(paramEnvVarPath: string, defaultPath: string): string {
    const path = process.env[paramEnvVarPath];
    if (path === undefined) {
        throw new Error(`${paramEnvVarPath} is not defined in environment variables`);
    }
    if (IS_OFFLINE === 'true') {
        return defaultPath;
    }

    return path;
}

async function getParams(paramStorePaths: string[]): Promise<Record<string, string>> {
    const ssm = getSSM();

    const data = await ssm
        .getParameters({
            Names: paramStorePaths,
            WithDecryption: true,
        })
        .promise();

    if (data.InvalidParameters === undefined || data.InvalidParameters.length > 0) {
        throw new Error(`Unable to find these paths in AWS Param Store: ${data.InvalidParameters}`);
    }

    const pathToValue: any = {};
    data.Parameters!.forEach(parameter => {
        pathToValue[parameter.Name!] = parameter.Value;
    });

    return pathToValue;
}

export default async function getIntegrationTransformConfig(): Promise<{
    integrationTransformUrl: string;
    integrationTransformAwsRegion: string;
}> {
    const integrationTransformUrlPath = getParamPath(
        'INTEGRATION_TRANSFORM_PATH',
        `/fhir-service/integration-transform/${STAGE}/url`,
    );
    const integrationTransformAwsRegionPath = getParamPath(
        'INTEGRATION_TRANSFORM_AWS_REGION_PATH',
        `/fhir-service/integration-transform/${STAGE}/awsRegion`,
    );

    const pathToValue = await getParams([integrationTransformUrlPath, integrationTransformAwsRegionPath]);
    return {
        integrationTransformUrl: pathToValue[integrationTransformUrlPath],
        integrationTransformAwsRegion: pathToValue[integrationTransformAwsRegionPath],
    };
}
