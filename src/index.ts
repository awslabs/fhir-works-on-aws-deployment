/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import serverless from 'serverless-http';
import { partial } from 'lodash';
import { generateServerlessRouter } from 'fhir-works-on-aws-routing';
import { makeLogger } from 'fhir-works-on-aws-interface';
import { getFhirConfig, genericResources } from './config';

// setup logging for process start and stops
const logger = makeLogger({ pid: process.pid, ppid: process.ppid });
const logProcessEvent = async (eventName: string, codeOrSignal: any) => {
    logger.info('process event raised', { eventName, codeOrSignal });

    if (eventName === 'SIGTERM') {
        // console.* methods are async when the process is piped
        // so sleep 200ms out of the 300ms allocated to SIGTERM
        // https://nodejs.org/api/process.html#a-note-on-process-io
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
};
logProcessEvent('start', undefined);
process.on('beforeExit', partial(logProcessEvent, 'beforeExit'));
process.on('exit', partial(logProcessEvent, 'exit'));
process.on('SIGTERM', partial(logProcessEvent, 'SIGTERM'));
process.on('SIGINT', partial(logProcessEvent, 'SIGINT'));

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
    return serverless(generateServerlessRouter(await getFhirConfig(), genericResources), {
        request(request: any, event: any) {
            request.user = event.user;
        },
    });
}

const serverlessHandler: Promise<any> = asyncServerless();

exports.handler = async (event: any = {}, context: any = {}): Promise<any> => {
    await ensureAsyncInit(serverlessHandler);
    return (await serverlessHandler)(event, context);
};

export default ensureAsyncInit;
