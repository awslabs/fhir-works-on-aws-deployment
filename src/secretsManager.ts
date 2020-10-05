/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import AWS from 'aws-sdk';

const { IS_OFFLINE, AWS_REGION, STAGE } = process.env;
export default class SecretsManager {
    static initialize() {
        if (IS_OFFLINE === 'true') {
            AWS.config.update({
                region: 'us-west-2',
                accessKeyId: process.env.ACCESS_KEY,
                secretAccessKey: process.env.SECRET_KEY,
            });
        }
    }

    static async getIntegrationTransformUrl(): Promise<string> {
        const ssm = new AWS.SSM();
        let path = process.env.INTEGRATION_TRANSFORM_PATH ?? 'fake_path';
        if (IS_OFFLINE === 'true') {
            path = `fhir-service.integration-transform.${AWS_REGION}.${STAGE}.url`;
        }
        const data = await ssm
            .getParameter({
                Name: path,
                WithDecryption: true,
            })
            .promise();

        if (data.Parameter?.Value === undefined) {
            console.error(`Unable to get INTEGRATION_TRANSFORM_PATH. Path: ${path}`);
        }

        return data.Parameter?.Value ?? '';
    }
}

SecretsManager.initialize();
