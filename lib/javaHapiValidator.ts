import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Alias, Code, Function, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import { Bucket } from 'aws-cdk-lib/aws-s3';

export interface JavaHapiValidatorProps extends StackProps {
    stage: string;
    fhirVersion: string;
    region: string;
}

export default class JavaHapiValidator extends Stack {
    hapiValidatorLambda: Function;

    alias: Alias;

    constructor(scope: Construct, id: string, props: JavaHapiValidatorProps) {
        super(scope, id, props);

        const igBucket = new Bucket(scope, 'ImplementationGuidesBucket');
        const igDeployment = new BucketDeployment(scope, 'IGFiles', {
            sources: [Source.asset(path.resolve(__dirname, '../implementationGuides'))],
            destinationBucket: igBucket,
        });

        this.hapiValidatorLambda = new Function(scope, 'validator', {
            handler: 'software.amazon.fwoa.Handler',
            timeout: Duration.seconds(300),
            memorySize: 2048,
            currentVersionOptions: {
                provisionedConcurrentExecutions: 5,
            },
            logRetention: RetentionDays.TEN_YEARS,
            code: Code.fromAsset(
                path.resolve(__dirname, `../javaHapiValidatorLambda/target/fwoa-hapi-validator-dev.jar`),
                {},
            ),
            runtime: Runtime.JAVA_11,
            tracing: Tracing.ACTIVE,
            environment: {
                FHIR_VERSION: props.fhirVersion,
                IMPLEMENTATION_GUIDES_BUCKET: igDeployment.deployedBucket.bucketName,
            },
        });
        this.alias = this.hapiValidatorLambda.currentVersion.addAlias(`fhir-service-validator-lambda-${props.stage}`);
    }
}
