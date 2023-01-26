import * as cdk from 'aws-cdk-lib';
import * as cdknag from 'cdk-nag';
import * as assertions from 'aws-cdk-lib/assertions';
import FhirWorksStack from '../../lib/cdk-infra-stack';

describe('cdk-nag AwsSolutions Pack', () => {
    let stack: cdk.Stack;
    const app = new cdk.App();

    const region: string = 'us-west-2';
    const stage: string = 'dev';
    const enableMultiTenancy: boolean = false;
    const enableSubscriptions: boolean = false;
    const useHapiValidator: boolean = false;
    const enableESHardDelete: boolean = false;
    const enableBackup: boolean = false;
    const logLevel: string = 'error';
    const fhirVersion: string = '4.0.1';
    const issuerEndpoint: string = 'test';
    const oAuth2ApiEndpoint: string = 'test';
    const patientPickerEndpoint: string = 'test';
    const validateXHTML: boolean = false;

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
            validateXHTML,
            description:
                'Test - Primary Template - This template creates all the necessary resources to deploy FHIR Works on AWS; a framework to deploy a FHIR server on AWS. It will be used to run cdk-nag.',
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
