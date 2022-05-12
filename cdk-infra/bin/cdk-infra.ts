#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CfnParameter } from 'aws-cdk-lib';
import FhirWorksStack, { FhirWorksStackProps } from '../lib/cdk-infra-stack';

// initialize with defaults
const app = new cdk.App();

const allowedLogLevels = ['error', 'info', 'debug', 'warn'];

const region: string = app.node.tryGetContext('region') || 'us-west-2';
const stage: string = app.node.tryGetContext('stage') || 'dev';
const enableMultiTenancy: boolean = app.node.tryGetContext('enableMultiTenancy') || false;
const enableSubscriptions: boolean = app.node.tryGetContext('enableSubscriptions') || false;
const oauthRedirect: string = app.node.tryGetContext('oauthRedirect') || 'http://localhost';
const useHapiValidator: boolean = app.node.tryGetContext('useHapiValidator') || false;
let logLevel: string = app.node.tryGetContext('logLevel') || 'error';
const enableESHardDelete: boolean = app.node.tryGetContext('enableESHardDelete') || false;

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
        FHIR_SERVICE: `fhir-service-${region}-${stage}`,
    },
    stage,
    region,
    enableMultiTenancy,
    enableSubscriptions,
    useHapiValidator,
    enableESHardDelete,
    logLevel,
    oauthRedirect,
    description: '(SO0128) - Solution - Primary Template - This template creates all the necessary resources to deploy FHIR Works on AWS; a framework to deploy a FHIR server on AWS.',
});
