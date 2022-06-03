#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag/lib/packs/aws-solutions';
import { NagSuppressions } from 'cdk-nag';
import FhirWorksStack from '../lib/cdk-infra-stack';

// initialize with defaults
const app = new cdk.App();

const allowedLogLevels = ['error', 'info', 'debug', 'warn'];
const allowedFHIRVersions = ['4.0.1', '3.0.1'];

const region: string = app.node.tryGetContext('region') || 'us-west-2';
const stage: string = app.node.tryGetContext('stage') || 'dev';
const enableMultiTenancy: boolean = app.node.tryGetContext('enableMultiTenancy') || false;
const enableSubscriptions: boolean = app.node.tryGetContext('enableSubscriptions') || false;
const oauthRedirect: string = app.node.tryGetContext('oauthRedirect') || 'http://localhost';
const useHapiValidator: boolean = app.node.tryGetContext('useHapiValidator') || false;
const enableESHardDelete: boolean = app.node.tryGetContext('enableESHardDelete') || false;
const enableBackup: boolean = app.node.tryGetContext('enableBackup') || false;
let logLevel: string = app.node.tryGetContext('logLevel') || 'error';
const fhirVersion: string = app.node.tryGetContext('fhirVersion') || '4.0.1';

if (useHapiValidator) {
    if (!allowedFHIRVersions.includes(fhirVersion)) {
        throw new Error(`invalid FHIR Version specified: ${fhirVersion}`);
    }
}

if (!allowedLogLevels.includes(logLevel)) {
    console.log(`invalid log level specified: ${logLevel}`);
    logLevel = 'error';
}

const stack = new FhirWorksStack(app, `fhir-service-${stage}`, {
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
    enableBackup,
    fhirVersion,
    description:
        '(SO0128) - Solution - Primary Template - This template creates all the necessary resources to deploy FHIR Works on AWS; a framework to deploy a FHIR server on AWS.',
});
// run cdk nag
Aspects.of(app).add(new AwsSolutionsChecks());
NagSuppressions.addStackSuppressions(stack, [
    {
        id: 'AwsSolutions-IAM5',
        reason: 'We only enable wildcard permissions with those resources managed by the service directly',
    },
    {
        id: 'AwsSolutions-IAM4',
        reason: 'Managed Policies are used on service-managed resources only',
    },
    {
        id: 'AwsSolutions-L1',
        reason: 'Runtime is set to NodeJs 14.x for EC2 compatibility',
    },
]);
