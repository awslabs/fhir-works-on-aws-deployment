#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import FhirWorksStack, { FhirWorksStackProps } from '../lib/cdk-infra-stack';
import { CfnParameter } from 'aws-cdk-lib';

// initialize with defaults
const app = new cdk.App();

const allowedLogLevels = ['error', 'info', 'debug', 'warn']

let region: string = app.node.tryGetContext('region') || 'us-west-2';
let stage: string = app.node.tryGetContext('stage') || 'dev';
let enableMultiTenancy: boolean = app.node.tryGetContext('enableMultiTenancy') || false;
let enableSubscriptions: boolean = app.node.tryGetContext('enableSubscriptions') || false;
let oauthRedirect: string = app.node.tryGetContext('oauthRedirect') || 'http://localhost';
let useHapiValidator: boolean = app.node.tryGetContext('useHapiValidator') || false;
let logLevel: string = app.node.tryGetContext('logLevel') || 'error';
let enableESHardDelete: boolean = app.node.tryGetContext('enableESHardDelete') || false;

if (!allowedLogLevels.includes(logLevel)) {
    console.log(`invalid log level specified: ${logLevel}`);
    logLevel = 'error';
}

new FhirWorksStack(app, `fhir-service-${stage}`, {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region,
    },
    tags: {
        'FHIR_SERVICE': `fhir-service-${region}-${stage}`
    },
    stage,
    region,
    enableMultiTenancy,
    enableSubscriptions,
    useHapiValidator,
    enableESHardDelete,
    logLevel,
    oauthRedirect,
});
