/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import serverless from 'serverless-http';
import { generateServerlessRouter } from 'fhir-works-on-aws-routing';
import { getFhirConfig, genericResources } from './config';

async function asyncServerless() {
    return serverless(generateServerlessRouter(await getFhirConfig(), genericResources), {
        request(request: any, event: any) {
            request.user = event.user;
        },
    });
}

const serverlessHandler = asyncServerless();

export default async (event: any = {}, context: any = {}): Promise<any> => {
    return (await serverlessHandler)(event, context);
};
