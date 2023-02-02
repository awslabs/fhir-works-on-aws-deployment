import { Duration, Size, Stack, StackProps } from 'aws-cdk-lib';
import { Alias, Code, Function, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import { Bucket, BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Key } from 'aws-cdk-lib/aws-kms';

export interface JavaHapiValidatorProps extends StackProps {
    stage: string;
    fhirVersion: string;
    region: string;
    fhirLogsBucket: Bucket;
    s3KMSKey: Key;
    igMemoryLimit: number;
    igMemorySize: number;
    igStorageSize: number;
}

export default class JavaHapiValidator extends Stack {
    hapiValidatorLambda: Function;

    alias: Alias;

    constructor(scope: Construct, id: string, props: JavaHapiValidatorProps) {
        super(scope, id, props);

        const igBucket = new Bucket(scope, `ImplementationGuidesBucket-${props.stage}`, {
            accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
            encryption: BucketEncryption.KMS,
            publicReadAccess: false,
            blockPublicAccess: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true,
            },
            serverAccessLogsBucket: props.fhirLogsBucket,
            enforceSSL: true,
            versioned: true,
            encryptionKey: props.s3KMSKey,
        });
        const igDeployment = new BucketDeployment(scope, `IGDeployment-${props.stage}`, {
            sources: [Source.asset(path.resolve(__dirname, '../implementationGuides'))],
            destinationBucket: igBucket,
            memoryLimit: props.igMemoryLimit, // can be updated to increase the size of files being uploaded to S3
        });

        this.hapiValidatorLambda = new Function(scope, `validator-${props.stage}`, {
            handler: 'software.amazon.fwoa.Handler',
            timeout: Duration.seconds(300),
            memorySize: props.igMemorySize, // can be updated to increase the capacity of the lambda memory
            ephemeralStorageSize: Size.mebibytes(props.igStorageSize), // can be updated to increase the storage size of the lambda
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
        props.s3KMSKey.grantDecrypt(this.hapiValidatorLambda);
        igDeployment.deployedBucket.grantRead(this.hapiValidatorLambda);
        this.alias = this.hapiValidatorLambda.currentVersion.addAlias(`fhir-service-validator-lambda-${props.stage}`);
    }
}
