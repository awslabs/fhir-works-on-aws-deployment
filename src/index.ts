/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import serverless from 'serverless-http';
import { CorsOptions } from 'cors'
import { generateServerlessRouter } from 'fhir-works-on-aws-routing';
import { fhirConfig, genericResources } from './config';

const corsOptions: CorsOptions = {
    origin: ['http://localhost:8000', 'http://localhost:9000', 'https://fhir.fhir-zone-dev.dht.live'],
    methods: ['GET', 'POST', 'PUT', "DELETE"],
    allowedHeaders: ['x-api-key'],
    credentials: true
  };

const serverlessHandler = serverless(generateServerlessRouter(fhirConfig, genericResources, corsOptions), {
    request(request: any, event: any) {
        request.user = event.user;
    },
});

export default async (event: any = {}, context: any = {}): Promise<any> => {
    return serverlessHandler(event, context);
};
