/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { CorsOptions } from 'cors';
import serverless from 'serverless-http';
import { generateServerlessRouter } from 'fhir-works-on-aws-routing';
import { getFhirConfig, genericResources } from './config';
import jwt_decode from "jwt-decode";

const corsOptions: CorsOptions = {
    origin: [
        'http://localhost:8000',
        'http://localhost:9000',
        'https://fhir.fhir-zone-dev.dht.live',
        'https://fhir.atom-sbx.dht.live',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['x-api-key', 'authorization'],
    credentials: true,
    maxAge: 3600,
};

const ensureAsyncInit = async (initPromise: Promise<any>): Promise<void> => {
    try {
        await initPromise;
    } catch (e) {
        console.error('Async initialization failed', e);
        // Explicitly exit the process so that next invocation re-runs the init code.
        // This prevents Lambda containers from caching a rejected init promise
        process.exit(1);
    }
};

async function asyncServerless() {
    return serverless(generateServerlessRouter(await getFhirConfig(), genericResources, corsOptions), {
        request(request: any, event: any) {
            request.user = event.user;
        },
    });
}

async function check_patientOrgs_claim(events:any){
    var decoded_token: any = jwt_decode(events.headers.Authorization.replace('Bearer ', ''));
    if (events.path == '/DetectedIssue' && events.httpMethod === 'GET' && decoded_token.patientOrgs && decoded_token.fhirUser && decoded_token.scp.some((scope:any) => scope.startsWith('user/'))) {
        events.queryStringParameters = {'patient:Patient.organization': decoded_token.patientOrgs};
        events.multiValueQueryStringParameters = {'patient:Patient.organization': [decoded_token.patientOrgs]};
    };
    return events
};

const serverlessHandler: Promise<any> = asyncServerless();

exports.handler = async (event: any = {}, context: any = {}): Promise<any> => {
    console.log('Entry point of the FHIR server lambda.');
    console.log('This is new log in the handler.');
    console.log('event: ', event);
    console.log('context: ', context);
    event = await check_patientOrgs_claim(event);
    await ensureAsyncInit(serverlessHandler);
    return (await serverlessHandler)(event, context);
};
