/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import serverless from 'serverless-http';
import { generateServerlessRouter } from 'fhir-works-on-aws-routing';
import { getConfig, genericResources } from './config';

export default async (event: any = {}, context: any = {}): Promise<any> => {
    const config = await getConfig();
    const serverlessHandler = serverless(generateServerlessRouter(config, genericResources), {
        request(request: any, event2: any) {
            request.user = event2.user;
        },
    });
    return serverlessHandler(event, context);
};
