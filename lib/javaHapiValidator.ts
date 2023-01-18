import { Duration, Size, Stack, StackProps } from 'aws-cdk-lib';
import { Alias, Code, Function, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import { Bucket, BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3';

export interface JavaHapiValidatorProps extends StackProps {
    stage: string;
    fhirVersion: string;
    region: string;
    fhirLogsBucket: Bucket;
}

export default class JavaHapiValidator extends Stack {
    hapiValidatorLambda: Function;

    alias: Alias;

    constructor(scope: Construct, id: string, props: JavaHapiValidatorProps) {
        super(scope, id, props);

        const igBucket = new Bucket(scope, 'ImplementationGuidesBucket', {
            accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
            encryption: BucketEncryption.S3_MANAGED,
            publicReadAccess: false,
            blockPublicAccess: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true,
            },
            serverAccessLogsBucket: props.fhirLogsBucket,
            enforceSSL: true,
        });
        const igDeployment = new BucketDeployment(scope, 'IGFiles', {
            sources: [Source.asset(path.resolve(__dirname, '../implementationGuides'))],
            destinationBucket: igBucket,
            memoryLimit: 128, // can be updated to increase the size of files being uploaded to S3
        });

        this.hapiValidatorLambda = new Function(scope, 'validator', {
            handler: 'software.amazon.fwoa.Handler',
            timeout: Duration.seconds(300),
            memorySize: 2048, // can be updated to increase the capacity of the lambda memory
            ephemeralStorageSize: Size.mebibytes(512), // can be updated to increase the storage size of the lambda
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

        igDeployment.deployedBucket.grantReadWrite(this.hapiValidatorLambda);
        igDeployment.deployedBucket.grantDelete(this.hapiValidatorLambda);
    }
}
