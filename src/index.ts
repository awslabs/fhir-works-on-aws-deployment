/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import serverless from 'serverless-http';
import { generateServerlessRouter } from 'fhir-works-on-aws-routing';
import { fhirConfig, genericResources } from './config';

const defaultCorsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
};

const serverlessHandler = serverless(generateServerlessRouter(fhirConfig, genericResources, {}), {
    request(request: any, event: any) {
        request.user = event.user;
    },
});

export default async (event: any = {}, context: any = {}): Promise<any> => {
    return serverlessHandler(event, context);
};
