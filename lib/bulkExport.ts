import { CfnParameter, Duration } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { CfnJob, CfnSecurityConfiguration } from 'aws-cdk-lib/aws-glue';
import {
    AccountRootPrincipal,
    Effect,
    ManagedPolicy,
    PolicyDocument,
    PolicyStatement,
    Role,
    ServicePrincipal,
    StarPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Bucket, BucketEncryption, BucketPolicy } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export default class BulkExportResources {
    glueJobRelatedLambdaRole: Role;

    glueScriptsBucket: Bucket;

    glueScriptsBucketHttpsOnlyPolicy: BucketPolicy;

    bulkExportResultsBucket: Bucket;

    bulkExportResultsBucketHttpsOnlyPolicy: BucketPolicy;

    glueJobRole: Role;

    glueJobSecurityConfig: CfnSecurityConfiguration;

    exportGlueJob: CfnJob;

    exportResultsSignerRole: Role;

    updateStatusLambdaRole: Role;

    uploadGlueScriptsLambdaRole: Role;

    constructor(
        scope: Construct,
        resourceDynamoDbTable: Table,
        exportRequestDynamoDBTable: Table,
        fhirLogsBucket: Bucket,
        dynamoDbKMSKey: Key,
        s3KMSKey: Key,
        logKMSKey: Key,
        stage: string,
        region: string,
        exportGlueWorkerType: CfnParameter,
        exportGlueNumberWorkers: CfnParameter,
        multiTenancyEnabled: boolean,
    ) {
        const AllowSSLRequestsOnlyStatement = {
            sid: 'AllowSSLRequestsOnly',
            effect: Effect.DENY,
            principals: [new StarPrincipal()],
            actions: ['s3:*'],
            conditions: {
                Bool: {
                    'aws:SecureTransport': 'false',
                },
            },
        };

        const blockPublicAccess = {
            blockPublicAcls: true,
            blockPublicPolicy: true,
            ignorePublicAcls: true,
            restrictPublicBuckets: true,
        };

        this.glueJobRelatedLambdaRole = new Role(scope, 'glueJobRelatedLambdaRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
                ManagedPolicy.fromAwsManagedPolicyName('AWSXrayWriteOnlyAccess'),
            ],
            inlinePolicies: {
                glueAccess: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['glue:StartJobRun', 'glue:GetJobRun', 'glue:BatchStopJobRun'],
                            resources: ['*'],
                        }),
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['dynamodb:Query', 'dynamodb:GetItem'],
                            resources: [exportRequestDynamoDBTable.tableArn],
                        }),
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['kms:Decrypt'],
                            resources: [dynamoDbKMSKey.keyArn],
                        }),
                    ],
                }),
            },
        });

        this.glueScriptsBucket = new Bucket(scope, 'glueScriptsBucket', {
            encryption: BucketEncryption.S3_MANAGED,
            serverAccessLogsBucket: fhirLogsBucket,
            serverAccessLogsPrefix: 'GlueScriptsBucket',
            blockPublicAccess,
        });

        this.glueScriptsBucketHttpsOnlyPolicy = new BucketPolicy(scope, 'glueScriptsBucketHttpsOnlyPolicy', {
            bucket: this.glueScriptsBucket,
        });
        this.glueScriptsBucketHttpsOnlyPolicy.document.addStatements(
            new PolicyStatement({
                ...AllowSSLRequestsOnlyStatement,
                resources: [this.glueScriptsBucket.bucketArn, `${this.glueScriptsBucket.bucketArn}/*`],
            }),
        );

        this.bulkExportResultsBucket = new Bucket(scope, 'bulkExportResultsBucket', {
            encryption: BucketEncryption.S3_MANAGED,
            serverAccessLogsBucket: fhirLogsBucket,
            lifecycleRules: [
                {
                    id: 'ExpirationRule',
                    enabled: true,
                    expiration: Duration.days(3),
                },
            ],
            serverAccessLogsPrefix: 'BulkExportResultsBucket',
            blockPublicAccess,
        });

        this.bulkExportResultsBucketHttpsOnlyPolicy = new BucketPolicy(
            scope,
            'bulkExportResultsBucketHttpsOnlyPolicy',
            {
                bucket: this.bulkExportResultsBucket,
            },
        );
        this.bulkExportResultsBucketHttpsOnlyPolicy.document.addStatements(
            new PolicyStatement({
                ...AllowSSLRequestsOnlyStatement,
                resources: [this.bulkExportResultsBucket.bucketArn, `${this.bulkExportResultsBucket.bucketArn}/*`],
            }),
        );

        this.glueJobRole = new Role(scope, 'glueJobRole', {
            assumedBy: new ServicePrincipal('glue.amazonaws.com'),
            managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole')],
            inlinePolicies: {
                ddbAccess: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['dynamodb:DescribeTable', 'dynamodb:Scan'],
                            resources: [resourceDynamoDbTable.tableArn],
                        }),
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['kms:Decrypt'],
                            resources: [dynamoDbKMSKey.keyArn],
                        }),
                    ],
                }),
                s3Access: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
                            resources: [`${this.bulkExportResultsBucket.bucketArn}/*`],
                        }),
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['s3:GetObject'],
                            resources: [`${this.glueScriptsBucket.bucketArn}/*`],
                        }),
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['kms:Decrypt', 'kms:GenerateDataKey', 'kms:Encrypt'],
                            resources: [s3KMSKey.keyArn],
                        }),
                    ],
                }),
                logAccess: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: [
                                'logs:CreateLogGroup',
                                'logs:CreateLogStream',
                                'logs:PutLogEvents',
                                'logs:AssociateKmsKey',
                            ],
                            resources: ['arn:aws:logs:*:*:/aws-glue/*'],
                        }),
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['kms:Decrypt', 'kms:GenerateDataKey', 'kms:Encrypt'],
                            resources: [logKMSKey.keyArn],
                        }),
                    ],
                }),
            },
        });

        this.glueJobSecurityConfig = new CfnSecurityConfiguration(scope, 'glueJobSecurityConfig', {
            encryptionConfiguration: {
                cloudWatchEncryption: {
                    kmsKeyArn: logKMSKey.keyArn,
                    cloudWatchEncryptionMode: 'SSE-KMS',
                },
                s3Encryptions: [
                    {
                        kmsKeyArn: s3KMSKey.keyArn,
                        s3EncryptionMode: 'SSE-KMS',
                    },
                ],
                jobBookmarksEncryption: {
                    kmsKeyArn: logKMSKey.keyArn,
                    jobBookmarksEncryptionMode: 'CSE-KMS',
                },
            },
            name: `fhir-works-export-security-config-${stage}-${region}`,
        });
        this.glueJobSecurityConfig.node.addDependency(logKMSKey);

        this.exportGlueJob = new CfnJob(scope, 'exportGlueJob', {
            role: this.glueJobRole.roleArn,
            glueVersion: '2.0',
            workerType: exportGlueWorkerType.valueAsString,
            numberOfWorkers: exportGlueNumberWorkers.valueAsNumber,
            securityConfiguration: this.glueJobSecurityConfig.name,
            command: {
                scriptLocation: this.glueScriptsBucket.s3UrlForObject('export-script.py'),
                name: 'glueetl',
                pythonVersion: '3',
            },
            executionProperty: {
                maxConcurrentRuns: multiTenancyEnabled ? 30 : 2,
            },
            defaultArguments: {
                '--TempDir': this.bulkExportResultsBucket.s3UrlForObject('/temp'),
                '--ddbTableName': resourceDynamoDbTable.tableName,
                '--workerType': exportGlueWorkerType.valueAsString,
                '--numberWorkers': exportGlueNumberWorkers.valueAsNumber,
                '--s3OutputBucket': this.bulkExportResultsBucket.bucketName,
                '--s3ScriptBucket': this.glueScriptsBucket.bucketName,
                '--enable-metrics': true,
                '--enable-continuous-cloudwatch-log': true,
                '--enable-continuous-log-filter': true,
            },
        });

        this.exportResultsSignerRole = new Role(scope, 'exportResultsSignerRole', {
            assumedBy: new AccountRootPrincipal(),
            inlinePolicies: {
                s3Access: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['s3:GetObject'],
                            resources: [`${this.bulkExportResultsBucket.bucketArn}/*`],
                        }),
                    ],
                }),
            },
        });

        this.updateStatusLambdaRole = new Role(scope, 'updateStatusLambdaRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
                ManagedPolicy.fromAwsManagedPolicyName('AWSXrayWriteOnlyAccess'),
            ],
            inlinePolicies: {
                ddbAccess: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['dynamodb:UpdateItem'],
                            resources: [exportRequestDynamoDBTable.tableArn],
                        }),
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['kms:Decrypt'],
                            resources: [dynamoDbKMSKey.keyArn],
                        }),
                    ],
                }),
            },
        });

        this.uploadGlueScriptsLambdaRole = new Role(scope, 'uploadGlueScriptsLambdaRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
                ManagedPolicy.fromAwsManagedPolicyName('AWSXrayWriteOnlyAccess'),
            ],
            inlinePolicies: {
                s3Access: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['s3:PutObject', 's3:DeleteObject'],
                            resources: [`${this.glueScriptsBucket.bucketArn}/*`],
                        }),
                    ],
                }),
            },
        });
    }
}
