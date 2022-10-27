import * as cdk from 'aws-cdk-lib';
import * as cdknag from 'cdk-nag';
import * as assertions from 'aws-cdk-lib/assertions';
import FhirWorksStack from '../lib/cdk-infra-stack';

describe('cdk-nag AwsSolutions Pack', () => {
    let stack: cdk.Stack;
    const app = new cdk.App();

    const allowedLogLevels = ['error', 'info', 'debug', 'warn'];
    const allowedFHIRVersions = ['4.0.1', '3.0.1'];

    const region: string = app.node.tryGetContext('region') || 'us-west-2';
    const stage: string = app.node.tryGetContext('stage') || 'dev';
    const enableMultiTenancy: boolean = app.node.tryGetContext('enableMultiTenancy') || false;
    const enableSubscriptions: boolean = app.node.tryGetContext('enableSubscriptions') || false;
    const useHapiValidator: boolean = app.node.tryGetContext('useHapiValidator') || false;
    const enableESHardDelete: boolean = app.node.tryGetContext('enableESHardDelete') || false;
    const enableBackup: boolean = app.node.tryGetContext('enableBackup') || false;
    let logLevel: string = app.node.tryGetContext('logLevel') || 'error';
    const fhirVersion: string = app.node.tryGetContext('fhirVersion') || '4.0.1';
    const issuerEndpoint: string = app.node.tryGetContext('issuerEndpoint') || 'a';
    const oAuth2ApiEndpoint: string = app.node.tryGetContext('oAuth2ApiEndpoint') || 'a';
    const patientPickerEndpoint: string = app.node.tryGetContext('patientPickerEndpoint') || 'a';

    if (issuerEndpoint.length === 0) {
        throw new Error('Error: no Issuer Endpoint specified.');
    }
    if (oAuth2ApiEndpoint.length === 0) {
        throw new Error('Error: no OAuth2 API Endpoint specified.');
    }
    if (patientPickerEndpoint.length === 0) {
        throw new Error('Error: no Patient Picker Endpoint specified.');
    }

    if (useHapiValidator) {
        if (!allowedFHIRVersions.includes(fhirVersion)) {
            throw new Error(`invalid FHIR Version specified: ${fhirVersion}`);
        }
    }

    if (!allowedLogLevels.includes(logLevel)) {
        console.log(`invalid log level specified: ${logLevel}`);
        logLevel = 'error';
    }
    beforeAll(() => {
        // GIVEN

        stack = new FhirWorksStack(app, `smart-fhir-service-${stage}`, {
            env: {
                account: process.env.CDK_DEFAULT_ACCOUNT,
                region,
            },
            tags: {
                FHIR_SERVICE: `smart-fhir-service-${region}-${stage}`,
            },
            stage,
            region,
            enableMultiTenancy,
            enableSubscriptions,
            useHapiValidator,
            enableESHardDelete,
            logLevel,
            issuerEndpoint,
            oAuth2ApiEndpoint,
            patientPickerEndpoint,
            enableBackup,
            fhirVersion,
            description:
                '(SO0128) - Solution - Primary Template - This template creates all the necessary resources to deploy FHIR Works on AWS; a framework to deploy a FHIR server on AWS.',
        });

        cdk.Aspects.of(stack).add(new cdknag.AwsSolutionsChecks({ verbose: true }));

        cdknag.NagSuppressions.addStackSuppressions(stack, [
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
    });

    test('No unsuppressed Warnings', () => {
        const warnings = assertions.Annotations.fromStack(stack).findWarning(
            '*',
            assertions.Match.stringLikeRegexp('AwsSolutions-.*'),
        );
        expect(warnings).toHaveLength(0);
    });

    test('No unsuppressed Errors', () => {
        const errors = assertions.Annotations.fromStack(stack).findError(
            '*',
            assertions.Match.stringLikeRegexp('AwsSolutions-.*'),
        );
        errors.forEach((error) => {
            console.log(error.entry, error.level, error.id);
        });
        expect(errors).toHaveLength(0);
    });
});
