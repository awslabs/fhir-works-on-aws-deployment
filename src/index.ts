/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import serverless from 'serverless-http';
import { generateServerlessRouter } from 'fhir-works-on-aws-routing';
import { getConfig, genericResources } from './config';
import SecretsManager from './secretsManager';

const generateHandler = async () => {
    const url = await SecretsManager.getIntegrationTransformUrl();
    const config = getConfig(url);
    return serverless(generateServerlessRouter(config, genericResources), {
        request(request: any, event2: any) {
            request.user = event2.user;
        },
    });
};

const serverlessHandler: Promise<serverless.Handler> = generateHandler();

export default async (event: any = {}, context: any = {}): Promise<any> => {
    return (await serverlessHandler)(event, context);
};
