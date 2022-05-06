import {
    CfnCondition,
    CfnCustomResource,
    CfnOutput,
    CfnParameter,
    CustomResource,
    Duration,
    Fn,
    Stack,
    StackProps,
} from 'aws-cdk-lib';
import { ApiKeySourceType, AuthorizationType, CognitoUserPoolsAuthorizer, RestApi, EndpointType, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, BillingMode, StreamViewType, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal, StarPrincipal } from 'aws-cdk-lib/aws-iam';
import { Alias } from 'aws-cdk-lib/aws-kms';
import { Code, Function, Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { ApiEventSource, DynamoEventSource, SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Bucket, BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as path from 'path';
import { Queue, QueuePolicy } from 'aws-cdk-lib/aws-sqs';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import KMSResources from './kms';
import ElasticSearchResources from './elasticsearch';
import SubscriptionsResources from './subscriptions';
import AlarmsResource from './alarms';
import CognitoResources from './cognito';
import BulkExportResources from './bulkExport';
import BulkExportStateMachine from './bulkExportStateMachine';

export interface FhirWorksStackProps extends StackProps {
    stage: string,
    region: string,
    enableMultiTenancy: boolean,
    enableSubscriptions: boolean,
    useHapiValidator: boolean,
    enableESHardDelete: boolean,
    logLevel: string,
    oauthRedirect: string,
}

export default class FhirWorksStack extends Stack {
    constructor(scope: Construct, id: string, props?: FhirWorksStackProps) {
        super(scope, id, props);

        // Define parameters
        const exportGlueWorkerType = new CfnParameter(this, 'exportGlueWorkerType', {
            type: 'String',
            default: 'G.2X',
            allowedValues: ['G.2X', 'G.1X'],
            description: 'Select the Glue worker type to run export jobs. Default is "G.2X"',
        });

        const exportGlueNumberWorkers = new CfnParameter(this, 'exportGlueNumberWorkers', {
            type: 'Number',
            default: 5,
            description: 'Number of Glue woekres to use during an Export job.',
        });

        // define conditions here:
        const isDev = props?.stage === 'dev';
        const isDevCondition = new CfnCondition(this, 'isDev', {
            expression: Fn.conditionEquals(props!.stage, 'dev'),
        });
        const isUsingHapiValidator = props!.useHapiValidator;
        const isMultiTenancyEnabled = props!.enableMultiTenancy;
        const isSubscriptionsEnabled = props!.enableSubscriptions;

        // define other custom variables here
        const resourceTableName = `resource-db-${props?.stage}`;
        const exportRequestTableName = `export-request-${props?.stage}`;
        const exportRequestTableJobStatusIndex = `jobStatus-index`;

        // Create KMS Resources
        const kmsResources = new KMSResources(this, props!.region, props!.stage, this.account);

        // Define ElasticSearch resources here:
        const elasticSearchResources = new ElasticSearchResources(
            this,
            isDevCondition,
            this.stackName,
            props!.stage,
            this.account,
            this.partition,
            props!.region,
            isDev,
            kmsResources.elasticSearchKMSKey,
        );

        // Start defining necessary resources
        const fhirLogsBucket = new Bucket(this, 'fhirLogsBucket', {
            accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
            encryption: BucketEncryption.S3_MANAGED,
            publicReadAccess: false,
            blockPublicAccess: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true,
            },
        });

        const resourceDynamoDbTable = new Table(this, resourceTableName, {
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING,
            },
            sortKey: {
                type: AttributeType.NUMBER,
                name: 'vid',
            },
            tableName: resourceTableName,
            billingMode: BillingMode.PAY_PER_REQUEST,
            stream: StreamViewType.NEW_AND_OLD_IMAGES,
            pointInTimeRecovery: true,
            encryption: TableEncryption.CUSTOMER_MANAGED,
            encryptionKey: kmsResources.dynamoDbKMSKey,
        });
        resourceDynamoDbTable.addGlobalSecondaryIndex({
            indexName: 'activeSubscriptions',
            partitionKey: {
                name: '_subscriptionStatus',
                type: AttributeType.STRING,
            },
            sortKey: {
                name: 'id',
                type: AttributeType.STRING,
            },
        });

        const exportRequestDynamoDbTable = new Table(this, exportRequestTableName, {
            tableName: exportRequestTableName,
            partitionKey: {
                name: 'jobId',
                type: AttributeType.STRING,
            },
            encryption: TableEncryption.CUSTOMER_MANAGED,
            encryptionKey: kmsResources.dynamoDbKMSKey,
            billingMode: BillingMode.PAY_PER_REQUEST,
        });
        exportRequestDynamoDbTable.addGlobalSecondaryIndex({
            indexName: exportRequestTableJobStatusIndex,
            partitionKey: {
                name: 'jobStatus',
                type: AttributeType.STRING,
            },
            sortKey: {
                name: 'jobOwnerId',
                type: AttributeType.STRING,
            },
        });

        // Create bulkExport Resources here:
        const bulkExportResources = new BulkExportResources(
            this,
            resourceDynamoDbTable,
            exportRequestDynamoDbTable,
            fhirLogsBucket,
            kmsResources.dynamoDbKMSKey,
            kmsResources.s3KMSKey,
            kmsResources.logKMSKey,
            props!.stage,
            props!.region,
            exportGlueWorkerType,
            exportGlueNumberWorkers,
            isMultiTenancyEnabled,
        );

        const startExportJobLambdaFunction = new Function(this, 'startExportJobLambdaFunction', {
            timeout: Duration.seconds(30),
            memorySize: 192,
            runtime: Runtime.NODEJS_14_X,
            description: 'Start the Glue job for bulk export',
            role: bulkExportResources.glueJobRelatedLambdaRole,
            handler: 'startExportJobHandler',
            code: Code.fromAsset(path.join(__dirname, '../../bulkExport')),
        });

        const stopExportJobLambdaFunction = new Function(this, 'stopExportJobLambdaFunction', {
            timeout: Duration.seconds(30),
            memorySize: 192,
            runtime: Runtime.NODEJS_14_X,
            description: 'Stop the Glue job for bulk export',
            role: bulkExportResources.glueJobRelatedLambdaRole,
            handler: 'stopExportJobHandler',
            code: Code.fromAsset(path.join(__dirname, '../../bulkExport')),
        });

        const getJobStatusLambdaFunction = new Function(this, 'getJobStatusLambdaFunction', {
            timeout: Duration.seconds(30),
            memorySize: 192,
            runtime: Runtime.NODEJS_14_X,
            description: 'Get the status of a Glue job run for bulk export',
            role: bulkExportResources.glueJobRelatedLambdaRole,
            handler: 'getJobStatusHandler',
            code: Code.fromAsset(path.join(__dirname, '../../bulkExport')),
        });

        const updateStatusLambdaFunction = new Function(this, 'updateStatusLambdaFunction', {
            timeout: Duration.seconds(30),
            memorySize: 192,
            runtime: Runtime.NODEJS_14_X,
            description: 'Update the status of a bulk export job',
            role: bulkExportResources.updateStatusLambdaRole,
            handler: 'updateStatusStatusHandler',
            code: Code.fromAsset(path.join(__dirname, '../../bulkExport')),
        });

        const uploadGlueScriptsLambdaFunction = new Function(this, 'uploadGlueScriptsLambdaFunction', {
            timeout: Duration.seconds(30),
            memorySize: 192,
            runtime: Runtime.NODEJS_14_X,
            role: bulkExportResources.uploadGlueScriptsLambdaRole,
            description: 'Upload glue scripts to s3',
            handler: 'handler',
            code: Code.fromAsset(path.join(__dirname, '../../bulkExport')),
            environment: {
                GLUE_SCRIPTS_BUCKET: bulkExportResources.glueScriptsBucket.bucketArn,
            },
        });

        const updateSearchMappingsLambdaFunction = new Function(this, 'updateSearchMappingsLambdaFunction', {
            timeout: Duration.seconds(300),
            memorySize: 512,
            runtime: Runtime.NODEJS_14_X,
            description: 'Custom resource Lambda to update the search mappings',
            role: new Role(this, 'updateSearchMappingsLambdaRole', {
                assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
                inlinePolicies: {
                    DdbToEsLambdaPolicy: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['logs:CreateLogStream', 'logs:CreateLogGroup', 'logs:PutLogEvents'],
                                resources: [`arn:${this.partition}:logs:${props!.region}:*:*`],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
                                resources: ['*'],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['es:ESHttpPost', 'es:ESHttpPut', 'es:ESHttpHead'],
                                resources: [`${elasticSearchResources.elasticSearchDomain.attrArn}/*`],
                            }),
                        ],
                    }),
                    KMSPolicy: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: [
                                    'kms:Describe*',
                                    'kms:Get*',
                                    'kms:List*',
                                    'kms:Encrypt',
                                    'kms:Decrypt',
                                    'kms:ReEncrypt*',
                                    'kms:GenerateDataKey',
                                    'kms:GenerateDataKeyWithoutPlaintext',
                                ],
                                resources: [kmsResources.elasticSearchKMSKey.keyArn],
                            }),
                        ],
                    }),
                },
            }),
            handler: 'handler',
            code: Code.fromAsset(path.join(__dirname, '../../updateSearchMappings')),
            environment: {
                ELASTICSEARCH_DOMAIN_ENDPOINT: `https://${elasticSearchResources.elasticSearchDomain.attrDomainEndpoint}`,
                NUMBER_OF_SHARDS: `${isDev ? 1 : 3}`, // 133 indices, one per resource type
            },
        });

        const bulkExportStateMachine = new BulkExportStateMachine(
            this,
            updateStatusLambdaFunction,
            startExportJobLambdaFunction,
            getJobStatusLambdaFunction,
            stopExportJobLambdaFunction,
        );

        // Define Backup Resources here:
        // NOTE: this is an extra Cloudformation stack; not linked to FHIR Server stack
        // This is not deployed by default, but can be added to cdk-infra.ts under /bin/ to do so:
        // const backupResources = new Backup(this, 'backup', { backupKMSKey: kmsResources.backupKMSKey });

        // Create Subscriptions resources here:
        const subscriptionsResources = new SubscriptionsResources(this, props!.region, this.partition);

        // Create Cognito Resources here:
        const cognitoResources = new CognitoResources(this, this.stackName, props!.oauthRedirect);

        const uploadGlueScriptsCustomResource = new CfnCustomResource(this, 'uploadGlueScriptsCustomResource', {
            serviceToken: uploadGlueScriptsLambdaFunction.functionArn,
        });

        const updateSearchMappingsCustomResource = new CustomResource(this, 'updateSearchMappingsCustomResource', {
            serviceToken: updateSearchMappingsLambdaFunction.functionArn,
        });
        updateSearchMappingsCustomResource.node.addDependency(elasticSearchResources.elasticSearchDomain);

        // Define main resources here:
        const apiGatewayAuthorizer = new CognitoUserPoolsAuthorizer(this, 'apiGatewayAuthorizer', {
            authorizerName: `fhir-works-authorizer-${props!.stage}-${props!.region}`,
            identitySource: 'method.request.header.Authorization',
            cognitoUserPools: [cognitoResources.userPool],
        });

        const subscriptionsMatcherDLQ = new Queue(this, 'subscriptionsMatcherDLQ', {
            retentionPeriod: Duration.days(14),
            encryptionMasterKey: Alias.fromAliasName(this, 'kmsMasterKeyId', 'alias/aws/sqs'),
        });

        const subscriptionsMatcherDLQHttpsOnlyPolicy = new QueuePolicy(this, 'subscriptionsMatcherDLQHttpsOnlyPolicy', {
            queues: [subscriptionsMatcherDLQ],
        });
        subscriptionsMatcherDLQHttpsOnlyPolicy.document.addStatements(
            new PolicyStatement({
                effect: Effect.DENY,
                actions: ['SQS:*'],
                resources: [subscriptionsMatcherDLQ.queueArn],
                principals: [new StarPrincipal()],
                conditions: {
                    Bool: {
                        'aws:SecureTransport': 'false',
                    },
                },
            }),
        );

        fhirLogsBucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'AllowSSLRequestsOnly',
                effect: Effect.DENY,
                principals: [new StarPrincipal()],
                actions: ['s3:*'],
                resources: [fhirLogsBucket.bucketArn, fhirLogsBucket.arnForObjects('*')],
                conditions: {
                    Bool: {
                        'aws:SecureTransport': 'false',
                    },
                },
            }),
        );

        const fhirBinaryBucket = new Bucket(this, 'fhirBinaryBucket', {
            serverAccessLogsBucket: fhirLogsBucket,
            serverAccessLogsPrefix: 'binary-acl',
            versioned: true,
            encryption: BucketEncryption.KMS,
            encryptionKey: kmsResources.s3KMSKey,
            blockPublicAccess: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true,
            },
        });

        fhirBinaryBucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'AllowSSLRequestsOnly',
                effect: Effect.DENY,
                actions: ['s3:*'],
                principals: [new StarPrincipal()],
                resources: [fhirBinaryBucket.bucketArn, fhirBinaryBucket.arnForObjects('*')],
                conditions: {
                    Bool: {
                        'aws:SecureTransport': 'false',
                    },
                },
            }),
        );

        const fhirServerLambda = new Function(this, 'fhirServer', {
            timeout: Duration.seconds(40),
            description: 'FHIR API Server',
            handler: 'handler',
            runtime: Runtime.NODEJS_14_X,
            reservedConcurrentExecutions: 5,
            environment: {
                // pending port of bulk Export
                EXPORT_STATE_MACHINE_ARN: '',
                PATIENT_COMPARTMENT_V3: '',
                PATIENT_COMPARTMENT_V4: '',
            },
            code: Code.fromAsset(path.join(__dirname, '../../src')),
            role: new Role(this, 'fhirServerLambdaRole', {
                assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
                inlinePolicies: {
                    FhirServerLambdaPolicy: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['logs:CreateLogStream', 'logs:CreateLogGroup', 'logs:PutLogEvents'],
                                resources: [`arn:${this.partition}:logs:${props!.region}:*:*`],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: [
                                    'kms:Describe*',
                                    'kms:Get*',
                                    'kms:List*',
                                    'kms:Encrypt',
                                    'kms:Decrypt',
                                    'kms:ReEncrypt*',
                                    'kms:GenerateDataKey',
                                    'kms:GenerateDataKeyWithoutPlaintext',
                                ],
                                resources: [
                                    kmsResources.s3KMSKey.keyArn,
                                    kmsResources.dynamoDbKMSKey.keyArn,
                                    kmsResources.elasticSearchKMSKey.keyArn,
                                ],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: [
                                    'dynamodb:Query',
                                    'dynamodb:Scan',
                                    'dynamodb:GetItem',
                                    'dynamodb:PutItem',
                                    'dynamodb:UpdateItem',
                                    'dynamodb:DeleteItem',
                                    'dynamodb:BatchWriteItem',
                                    'dynamodb:PartiQLInsert',
                                    'dynamodb:PartiQLUpdate',
                                ],
                                resources: [
                                    resourceDynamoDbTable.tableArn,
                                    `${resourceDynamoDbTable.tableArn}/index/*`,
                                    exportRequestDynamoDbTable.tableArn,
                                ],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['dynamodb:Query'],
                                resources: [`${resourceDynamoDbTable.tableArn}/index/*`],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['s3:*Object', 's3:ListBucket', 's3:DeleteObjectVersion'],
                                resources: [fhirBinaryBucket.bucketArn, fhirBinaryBucket.arnForObjects('*')],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['s3:ListBucket', 's3:GetObject'],
                                resources: [
                                    bulkExportResources.bulkExportResultsBucket.bucketArn,
                                    `${bulkExportResources.bulkExportResultsBucket.bucketArn}/*`,
                                ],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['xray:PutTraceSegments', 'xray:PutTelemtryRecords'],
                                resources: ['*'],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['sts:AssumeRole'],
                                resources: [bulkExportResources.exportResultsSignerRole.roleArn],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['states:StartExecution'],
                                resources: [bulkExportStateMachine.bulkExportStateMachine.stateMachineArn],
                            }),
                        ],
                    }),
                },
            }),
        });
        // pending port of hapi validator stack
        // if (useHapiValidator) {
        //   fhirServerLambda.role?.addToPrincipalPolicy(new PolicyStatement({
        //     effect: Effect.ALLOW,
        //     actions: [
        //       'lambda:InvokeFunction',
        //     ],
        //     resources: [
        //       Fn.importValue(`fhir-service-validator-lambda-${stage}`),
        //     ]
        //   }));
        // }

        const apiGatewayRestApi = new RestApi(this, 'apiGatewayRestApi', {
            apiKeySourceType: ApiKeySourceType.HEADER,
            restApiName: `${props!.stage}-fhir-service`,
            endpointConfiguration: {
                types: [EndpointType.EDGE]
            },
        });
        apiGatewayRestApi.addApiKey('developerApiKey', {
            description: 'Key for developer access to the FHIR Api',
            apiKeyName: `developer-key-${scope}`,
        });
        apiGatewayRestApi.root.addMethod('ANY', new LambdaIntegration(fhirServerLambda), {
            authorizer: apiGatewayAuthorizer,
            authorizationType: AuthorizationType.COGNITO,
        });
        apiGatewayRestApi.root.addResource('{proxy+}').addMethod('ANY', new LambdaIntegration(fhirServerLambda), {
            authorizer: apiGatewayAuthorizer,
            authorizationType: AuthorizationType.COGNITO,
        });
        apiGatewayRestApi.root.addResource('metadata').addMethod('GET', new LambdaIntegration(fhirServerLambda));
        apiGatewayRestApi.root.addResource('tenant').addResource('{tenantId}').addResource('metadata').addMethod('GET', new LambdaIntegration(fhirServerLambda));

        const ddbToEsLambda = new Function(this, 'ddbToEs', {
            timeout: Duration.seconds(300),
            runtime: Runtime.NODEJS_14_X,
            description: 'Write DDB changes from `resource` table to ElasticSearch service',
            handler: 'handler',
            code: Code.fromAsset(path.join(__dirname, '../../ddbToEsLambda')),
            environment: {
                ENABLE_ES_HARD_DELETE: `${props!.enableESHardDelete}`,
            },
            role: new Role(this, 'DdbToEsLambdaRole', {
                assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
                inlinePolicies: {
                    DdbToEsLambdaPolicy: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['logs:CreateLogStream', 'logs:CreateLogGroup', 'logs:PutLogEvents'],
                                resources: [`arn:${this.partition}:logs:${props!.region}:*:*`],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: [
                                    'dynamoDb:GetShardIterator',
                                    'dynamoDb:DescribeStream',
                                    'dynamoDb:ListStreams',
                                    'dynamoDb:GetRecords',
                                ],
                                resources: [resourceDynamoDbTable.tableStreamArn!],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
                                resources: ['*'],
                            }),
                        ],
                    }),
                    KMSPolicy: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: [
                                    'kms:Describe*',
                                    'kms:Get*',
                                    'kms:List*',
                                    'kms:Encrypt',
                                    'kms:Decrypt',
                                    'kms:ReEncrypt*',
                                    'kms:GenerateDataKey',
                                    'kms:GenerateDataKeyWithoutPlaintext',
                                ],
                                resources: [
                                    kmsResources.dynamoDbKMSKey.keyArn,
                                    kmsResources.elasticSearchKMSKey.keyArn,
                                ],
                            }),
                        ],
                    }),
                },
            }),
        });
        ddbToEsLambda.addEventSource(
            new DynamoEventSource(resourceDynamoDbTable, {
                batchSize: 15,
                retryAttempts: 3,
                startingPosition: StartingPosition.LATEST,
            }),
        );

        const subscriptionsMatcher = new Function(this, 'subscriptionsMatcher', {
            timeout: Duration.seconds(20),
            memorySize: isDev ? 512 : 1024,
            reservedConcurrentExecutions: isDev ? 10 : 200,
            runtime: Runtime.NODEJS_14_X,
            description: 'Match ddb events against active Subscriptions and emit notifications',
            role: new Role(this, 'subscriptionsMatcherLambdaRole', {
                assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
                inlinePolicies: {
                    SubscriptionsMatcherLambdaPolicy: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['logs:CreateLogStream', 'logs:CreateLogGroup', 'logs:PutLogEvents'],
                                resources: [`arn:${this.partition}:logs:${props!.region}:*:*`],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: [
                                    'dynamodb:GetShardIterator',
                                    'dynamodb:DescribeStream',
                                    'dynamodb:ListStreams',
                                    'dynamodb:GetRecords',
                                ],
                                resources: [resourceDynamoDbTable.tableArn],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['dynamodb:Query', 'dynamodb:Scan', 'dynamodb:GetItem'],
                                resources: [resourceDynamoDbTable.tableArn],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['dynamodb:Query'],
                                resources: [`${resourceDynamoDbTable.tableArn}/index/*`],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
                                resources: ['*'],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['sqs:SendMessage'],
                                resources: [subscriptionsMatcherDLQ.queueArn],
                            }),
                        ],
                    }),
                    KMSPolicy: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: [
                                    'kms:Describe*',
                                    'kms:Get*',
                                    'kms:List*',
                                    'kms:Encrypt',
                                    'kms:Decrypt',
                                    'kms:ReEncrypt*',
                                    'kms:GenerateDataKey',
                                    'kms:GenerateDataKeyWithoutPlaintext',
                                ],
                                resources: [kmsResources.dynamoDbKMSKey.keyArn],
                            }),
                        ],
                    }),
                    PublishToSNSPolicy: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['kms:GenerateDataKey', 'kms:Decrypt'],
                                resources: [subscriptionsResources.subscriptionsKey.keyArn],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['sns:Publish'],
                                resources: [subscriptionsResources.subscriptionsTopic.ref],
                            }),
                        ],
                    }),
                },
            }),
            handler: 'handler',
            code: Code.fromAsset(path.join(__dirname, '../../src/subscriptions/matcherLambda')),
            environment: {
                SUBSCRIPTIONS_TOPIC: subscriptionsResources.subscriptionsTopic.ref,
            },
            events: [
                new DynamoEventSource(resourceDynamoDbTable, {
                    batchSize: 15,
                    retryAttempts: 3,
                    startingPosition: StartingPosition.LATEST,
                    enabled: props!.enableSubscriptions, // will only run if opted into subscriptions feature
                }),
            ],
        });

        const subscriptionReaper = new Function(this, 'subscriptionReaper', {
            timeout: Duration.seconds(30),
            runtime: Runtime.NODEJS_14_X,
            description: 'Scheduled Lambda to remove expired Subscriptions',
            role: new Role(this, 'subscriptionReaperRole', {
                assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
                inlinePolicies: {
                    SubscriptionReaperPolicy: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['dynamodb:UpdateItem', 'dynamodb:Query'],
                                resources: [
                                    `${resourceDynamoDbTable.tableArn}/index/*`,
                                    resourceDynamoDbTable.tableArn,
                                ],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['logs:CreateLogStream', 'logs:CreateLogGroup', 'logs:PutLogEvents'],
                                resources: [`arn:${this.partition}:logs:${props!.region}:*:*`],
                            }),
                        ],
                    }),
                    KMSPolicy: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: [
                                    'kms:Describe*',
                                    'kms:Get*',
                                    'kms:List*',
                                    'kms:Encrypt',
                                    'kms:Decrypt',
                                    'kms:ReEncrypt*',
                                    'kms:GenerateDataKey',
                                    'kms:GenerateDataKeyWithoutPlaintext',
                                ],
                                resources: [kmsResources.dynamoDbKMSKey.keyArn],
                            }),
                        ],
                    }),
                },
            }),
            handler: 'handler',
            code: Code.fromAsset(path.join(__dirname, '../../src/subscriptions/reaperLambda')),
        });
        new Rule(this, 'subscriptionReaperScheduleEvent', {
            schedule: Schedule.cron({ minute: '5' }),
            enabled: isSubscriptionsEnabled,
        }).addTarget(new LambdaFunction(subscriptionReaper));

        const subscriptionsRestHook = new Function(this, 'subscriptionsRestHook', {
            timeout: Duration.seconds(10),
            runtime: Runtime.NODEJS_14_X,
            description: 'Send rest-hook notification for subscription',
            role: subscriptionsResources.restHookLambdaRole,
            handler: 'handler',
            code: Code.fromAsset(path.join(__dirname, '../../src/subscriptions/restHookLambda')),
            events: [
                new SqsEventSource(subscriptionsResources.restHookQueue, {
                    batchSize: 50,
                    maxBatchingWindow: Duration.seconds(10),
                    reportBatchItemFailures: true,
                }),
            ],
        });

        const ddbToEsDLQ = new Queue(this, 'ddbToEsDLQ', {
            retentionPeriod: Duration.days(14),
            encryptionMasterKey: Alias.fromAliasName(this, 'ddbToEsDLQMasterKeyId', 'alias/aws/sqs'),
        });
        const ddbToEsDLQHttpsOnlyPolicy = new QueuePolicy(this, 'ddbToEsDLQHttpsOnlyPolicy', {
            queues: [ddbToEsDLQ],
        });
        ddbToEsDLQHttpsOnlyPolicy.document.addStatements(
            new PolicyStatement({
                effect: Effect.DENY,
                actions: ['SQS:*'],
                resources: [ddbToEsDLQ.queueArn],
                principals: [new StarPrincipal()],
                conditions: {
                    Bool: {
                        'aws:SecureTransport': 'false',
                    },
                },
            }),
        );

        // Create alarms resources here:
        const alarmsResources = new AlarmsResource(
            this,
            props!.stage,
            ddbToEsLambda,
            kmsResources.snsKMSKey,
            ddbToEsDLQ,
            fhirServerLambda,
            apiGatewayRestApi,
            this.stackName,
            this.account,
            elasticSearchResources.elasticSearchDomain,
            isDev,
        );

    }
}
