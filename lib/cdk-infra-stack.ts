import {
    CfnCondition,
    CfnOutput,
    CfnParameter,
    CustomResource,
    Duration,
    Fn,
    RemovalPolicy,
    Stack,
    StackProps,
} from 'aws-cdk-lib';
import {
    ApiKeySourceType,
    AuthorizationType,
    CognitoUserPoolsAuthorizer,
    RestApi,
    EndpointType,
    LambdaIntegration,
    MethodLoggingLevel,
    AccessLogFormat,
    LogGroupLogDestination,
} from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, BillingMode, StreamViewType, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import {
    AnyPrincipal,
    Effect,
    PolicyDocument,
    PolicyStatement,
    Role,
    ServicePrincipal,
    StarPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Alias } from 'aws-cdk-lib/aws-kms';
import { Runtime, StartingPosition, Tracing } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource, SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Bucket, BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { Queue, QueuePolicy } from 'aws-cdk-lib/aws-sqs';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import path from 'path';
import { NagSuppressions } from 'cdk-nag';
import KMSResources from './kms';
import ElasticSearchResources from './elasticsearch';
import SubscriptionsResources from './subscriptions';
import CognitoResources from './cognito';
import BulkExportResources from './bulkExport';
import BulkExportStateMachine from './bulkExportStateMachine';
import Backup from './backup';
import AlarmsResource from './alarms';
import JavaHapiValidator from './javaHapiValidator';

export interface FhirWorksStackProps extends StackProps {
    stage: string;
    region: string;
    enableMultiTenancy: boolean;
    enableSubscriptions: boolean;
    enableBackup: boolean;
    useHapiValidator: boolean;
    enableESHardDelete: boolean;
    logLevel: string;
    oauthRedirect: string;
    fhirVersion: string;
}

export default class FhirWorksStack extends Stack {
    javaHapiValidator: JavaHapiValidator | undefined;

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
        const isMultiTenancyEnabled = props!.enableMultiTenancy;

        // define other custom variables here
        const resourceTableName = `resource-db-${props?.stage}`;
        const exportRequestTableName = `export-request-${props?.stage}`;
        const exportRequestTableJobStatusIndex = `jobStatus-index`;

        const PATIENT_COMPARTMENT_V3 = 'patientCompartmentSearchParams.3.0.2.json';
        const PATIENT_COMPARTMENT_V4 = 'patientCompartmentSearchParams.4.0.1.json';

        // Create KMS Resources
        const kmsResources = new KMSResources(this, props!.region, props!.stage, this.account);

        // Define ElasticSearch resources here:
        const elasticSearchResources = new ElasticSearchResources(
            this,
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
        NagSuppressions.addResourceSuppressions(fhirLogsBucket, [
            {
                id: 'AwsSolutions-S1',
                reason: 'This is the logs bucket for access logs',
            },
        ]);

        if (props!.useHapiValidator) {
            // deploy hapi validator stack
            // eslint-disable-next-line no-new
            this.javaHapiValidator = new JavaHapiValidator(this, 'javaHapiValidator', {
                region: props!.region,
                fhirVersion: props!.fhirVersion,
                stage: props!.stage,
            });
        }

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

        NagSuppressions.addResourceSuppressions(exportRequestDynamoDbTable, [
            {
                id: 'AwsSolutions-DDB3',
                reason: 'Backup not explicitly needed',
            },
        ]);

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
            removalPolicy: RemovalPolicy.RETAIN,
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
                        'aws:SecureTransport': false,
                    },
                },
            }),
        );

        // Create Subscriptions resources here:
        const subscriptionsResources = new SubscriptionsResources(this, props!.region, this.partition, props!.stage);

        // Create Cognito Resources here:
        const cognitoResources = new CognitoResources(this, this.stackName, props!.oauthRedirect);

        const apiGatewayLogGroup = new LogGroup(this, 'apiGatewayLogGroup', {
            encryptionKey: kmsResources.logKMSKey,
            logGroupName: `/aws/api-gateway/fhir-service-${props!.stage}`,
        });

        const apiGatewayRestApi = new RestApi(this, 'apiGatewayRestApi', {
            apiKeySourceType: ApiKeySourceType.HEADER,
            restApiName: `${props!.stage}-fhir-service`,
            endpointConfiguration: {
                types: [EndpointType.EDGE],
            },
            deployOptions: {
                stageName: props!.stage,
                tracingEnabled: true,
                loggingLevel:
                    props!.logLevel === MethodLoggingLevel.ERROR ? MethodLoggingLevel.ERROR : MethodLoggingLevel.INFO,
                accessLogFormat: AccessLogFormat.custom(
                    '{"authorizer.claims.sub":"$context.authorizer.claims.sub","error.message":"$context.error.message","extendedRequestId":"$context.extendedRequestId","httpMethod":"$context.httpMethod","identity.sourceIp":"$context.identity.sourceIp","integration.error":"$context.integration.error","integration.integrationStatus":"$context.integration.integrationStatus","integration.latency":"$context.integration.latency","integration.requestId":"$context.integration.requestId","integration.status":"$context.integration.status","path":"$context.path","requestId":"$context.requestId","responseLatency":"$context.responseLatency","responseLength":"$context.responseLength","stage":"$context.stage","status":"$context.status"}',
                ),
                accessLogDestination: new LogGroupLogDestination(apiGatewayLogGroup),
            },
        });
        NagSuppressions.addResourceSuppressions(apiGatewayRestApi, [
            {
                id: 'AwsSolutions-APIG2',
                reason: 'Requests to the API Gateway are validated by the Lambda',
            },
        ]);
        NagSuppressions.addResourceSuppressionsByPath(
            this,
            `/fhir-service-${props!.stage}/apiGatewayRestApi/DeploymentStage.${props!.stage}/Resource`,
            [
                {
                    id: 'AwsSolutions-APIG3',
                    reason: 'Access is configured to be limited by a Usage Plan and API Key',
                },
            ],
        );

        const lambdaDefaultEnvVars = {
            API_URL: `https://${apiGatewayRestApi.restApiId}.execute-api.${props!.region}.amazonaws.com/${
                props!.stage
            }`,
            S3_KMS_KEY: kmsResources.s3KMSKey.keyArn,
            RESOURCE_TABLE: resourceDynamoDbTable.tableName,
            EXPORT_REQUEST_TABLE: exportRequestDynamoDbTable.tableName,
            EXPORT_REQUEST_TABLE_JOB_STATUS_INDEX: exportRequestTableJobStatusIndex,
            FHIR_BINARY_BUCKET: fhirBinaryBucket.bucketName,
            ELASTICSEARCH_DOMAIN_ENDPOINT: `https://${elasticSearchResources.elasticSearchDomain.domainEndpoint}`,
            OAUTH2_DOMAIN_ENDPOINT: `https://${cognitoResources.userPoolDomain.ref}.auth.${
                props!.region
            }.amazoncognito.com/oauth2`,
            EXPORT_RESULTS_BUCKET: bulkExportResources.bulkExportResultsBucket.bucketName,
            EXPORT_RESULTS_SIGNER_ROLE_ARN: bulkExportResources.exportResultsSignerRole.roleArn,
            CUSTOM_USER_AGENT: 'AwsSolution/SO0128/GH-v4.3.0',
            ENABLE_MULTI_TENANCY: `${props!.enableMultiTenancy}`,
            ENABLE_SUBSCRIPTIONS: `${props!.enableSubscriptions}`,
            LOG_LEVEL: props!.logLevel,
        };

        const defaultLambdaBundlingOptions = {
            target: 'es2020',
        };
        const defaultBulkExportLambdaProps = {
            timeout: Duration.seconds(30),
            memorySize: 192,
            runtime: Runtime.NODEJS_14_X,
            description: 'Start the Glue job for bulk export',
            role: bulkExportResources.glueJobRelatedLambdaRole,
            entry: path.join(__dirname, '../bulkExport/index.ts'),
            bundling: defaultLambdaBundlingOptions,
            environment: {
                ...lambdaDefaultEnvVars,
                GLUE_JOB_NAME: bulkExportResources.exportGlueJob.ref,
            },
        };

        const startExportJobLambdaFunction = new NodejsFunction(this, 'startExportJobLambdaFunction', {
            ...defaultBulkExportLambdaProps,
            handler: 'startExportJobHandler',
        });

        const stopExportJobLambdaFunction = new NodejsFunction(this, 'stopExportJobLambdaFunction', {
            ...defaultBulkExportLambdaProps,
            handler: 'stopExportJobHandler',
        });

        const getJobStatusLambdaFunction = new NodejsFunction(this, 'getJobStatusLambdaFunction', {
            ...defaultBulkExportLambdaProps,
            handler: 'getJobStatusHandler',
        });

        const updateStatusLambdaFunction = new NodejsFunction(this, 'updateStatusLambdaFunction', {
            ...defaultBulkExportLambdaProps,
            handler: 'updateStatusStatusHandler',
            role: bulkExportResources.updateStatusLambdaRole,
        });

        const uploadGlueScriptsLambdaFunction = new NodejsFunction(this, 'uploadGlueScriptsLambdaFunction', {
            timeout: Duration.seconds(30),
            memorySize: 192,
            runtime: Runtime.NODEJS_14_X,
            role: bulkExportResources.uploadGlueScriptsLambdaRole,
            description: 'Upload glue scripts to s3',
            handler: 'handler',
            entry: path.join(__dirname, '../bulkExport/uploadGlueScriptsToS3.ts'),
            bundling: {
                ...defaultLambdaBundlingOptions,
                commandHooks: {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    beforeBundling(inputDir, outputDir) {
                        return [];
                    },
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    beforeInstall(inputDir, outputDir) {
                        return [];
                    },
                    afterBundling(inputDir, outputDir) {
                        // copy all the necessary files for the lambda into the bundle
                        // this allows the lambda functions for bulk export to have access to these files within the lambda instance
                        return [
                            `node scripts/build_lambda.js ${inputDir} ${outputDir} bulkExport/glueScripts/export-script.py`,
                            `node scripts/build_lambda.js ${inputDir} ${outputDir} bulkExport/schema/transitiveReferenceParams.json`,
                            `node scripts/build_lambda.js ${inputDir} ${outputDir} bulkExport/schema/${PATIENT_COMPARTMENT_V3}`,
                            `node scripts/build_lambda.js ${inputDir} ${outputDir} bulkExport/schema/${PATIENT_COMPARTMENT_V4}`,
                        ];
                    },
                },
            },
            environment: {
                ...lambdaDefaultEnvVars,
                GLUE_SCRIPTS_BUCKET: bulkExportResources.glueScriptsBucket.bucketName,
            },
        });

        const updateSearchMappingsLambdaFunction = new NodejsFunction(this, 'updateSearchMappingsLambdaFunction', {
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
                                resources: [`${elasticSearchResources.elasticSearchDomain.domainArn}/*`],
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
            entry: path.join(__dirname, '../updateSearchMappings/index.ts'),
            bundling: {
                target: 'es2020',
            },
            environment: {
                ...lambdaDefaultEnvVars,
                ELASTICSEARCH_DOMAIN_ENDPOINT: `https://${elasticSearchResources.elasticSearchDomain.domainEndpoint}`,
                NUMBER_OF_SHARDS: `${isDev ? 1 : 3}`, // 133 indices, one per resource type
            },
        });
        // eslint-disable-next-line no-new
        new CustomResource(this, 'updateSearchMappingsCustomResource', {
            serviceToken: updateSearchMappingsLambdaFunction.functionArn,
            properties: {
                RandomValue: Math.random(), // to force redeployment
            },
        });

        const bulkExportStateMachine = new BulkExportStateMachine(
            this,
            updateStatusLambdaFunction,
            startExportJobLambdaFunction,
            getJobStatusLambdaFunction,
            stopExportJobLambdaFunction,
            props!.stage,
        );

        // Define Backup Resources here:
        // NOTE: this is an extra Cloudformation stack; not linked to FHIR Server stack
        // This is not deployed by default, but can be added to cdk-infra.ts under /bin/ to do so,
        // pass enableBackup=true when running cdk deploy (e.g. cdk deploy -c enableBackup=true)
        if (props!.enableBackup) {
            // eslint-disable-next-line no-new
            new Backup(this, 'backup', { backupKMSKey: kmsResources.backupKMSKey });
        }

        // eslint-disable-next-line no-new
        new CustomResource(this, 'uploadGlueScriptsCustomResource', {
            serviceToken: uploadGlueScriptsLambdaFunction.functionArn,
            properties: {
                RandomValue: this.artifactId,
            },
        });

        // Define main resources here:
        const apiGatewayAuthorizer = new CognitoUserPoolsAuthorizer(this, 'apiGatewayAuthorizer', {
            authorizerName: `fhir-works-authorizer-${props!.stage}-${props!.region}`,
            identitySource: 'method.request.header.Authorization',
            cognitoUserPools: [cognitoResources.userPool],
            resultsCacheTtl: Duration.seconds(300),
        });

        const subscriptionsMatcherDLQ = new Queue(this, 'subscriptionsMatcherDLQ', {
            retentionPeriod: Duration.days(14),
            encryptionMasterKey: Alias.fromAliasName(this, 'kmsMasterKeyId', 'alias/aws/sqs'),
        });
        NagSuppressions.addResourceSuppressions(subscriptionsMatcherDLQ, [
            {
                id: 'AwsSolutions-SQS3',
                reason: 'This is a DLQ.',
            },
        ]);

        const subscriptionsMatcherDLQHttpsOnlyPolicy = new QueuePolicy(this, 'subscriptionsMatcherDLQHttpsOnlyPolicy', {
            queues: [subscriptionsMatcherDLQ],
        });
        subscriptionsMatcherDLQHttpsOnlyPolicy.document.addStatements(
            new PolicyStatement({
                effect: Effect.DENY,
                actions: ['SQS:*'],
                resources: [subscriptionsMatcherDLQ.queueArn],
                principals: [new AnyPrincipal()],
                conditions: {
                    Bool: {
                        'aws:SecureTransport': false,
                    },
                },
            }),
        );

        const fhirServerLambda = new NodejsFunction(this, 'fhirServer', {
            timeout: Duration.seconds(40),
            memorySize: 512,
            description: 'FHIR API Server',
            entry: path.join(__dirname, '../src/index.ts'),
            handler: 'handler',
            currentVersionOptions: {
                provisionedConcurrentExecutions: 5,
            },
            bundling: {
                ...defaultLambdaBundlingOptions,
                commandHooks: {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    beforeBundling(inputDir, outputDir) {
                        return [];
                    },
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    beforeInstall(inputDir, outputDir) {
                        return [];
                    },
                    afterBundling(inputDir, outputDir) {
                        // copy all the necessary files for the lambda into the bundle
                        // this allows the validators to be constructed with the compiled implementation guides
                        return [
                            `node scripts/build_lambda.js ${inputDir}/compiledImplementationGuides ${outputDir}/compiledImplementationGuides none true`,
                        ];
                    },
                },
            },
            runtime: Runtime.NODEJS_14_X,
            environment: {
                ...lambdaDefaultEnvVars,
                EXPORT_STATE_MACHINE_ARN: bulkExportStateMachine.bulkExportStateMachine.stateMachineArn,
                PATIENT_COMPARTMENT_V3,
                PATIENT_COMPARTMENT_V4,
                VALIDATOR_LAMBDA_ALIAS: props!.useHapiValidator ? this.javaHapiValidator!.alias.functionArn : '',
            },
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
                                resources: [`${exportRequestDynamoDbTable.tableArn}/index/*`],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['es:ESHttpGet', 'es:ESHttpHead', 'es:ESHttpPost'],
                                resources: [`${elasticSearchResources.elasticSearchDomain.domainArn}/*`],
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
            tracing: Tracing.ACTIVE,
        });
        if (props!.useHapiValidator) {
            fhirServerLambda.role?.addToPrincipalPolicy(
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ['lambda:InvokeFunction'],
                    resources: [this.javaHapiValidator!.alias.functionArn],
                }),
            );
        }
        fhirServerLambda.currentVersion.addAlias(`fhir-server-lambda-${props!.stage}`);

        const apiGatewayApiKey = apiGatewayRestApi.addApiKey('developerApiKey', {
            description: 'Key for developer access to the FHIR Api',
            apiKeyName: `developer-key-${props!.stage}`,
        });
        apiGatewayRestApi
            .addUsagePlan('apiUsagePlan', {
                throttle: {
                    burstLimit: 100, // maximum API request rate limit over a time ranging from one to a few seconds
                    rateLimit: 50, // average requests per second over an extended period of time
                },
                name: `fhir-service-${props!.stage}`,
                apiStages: [
                    {
                        api: apiGatewayRestApi,
                        stage: apiGatewayRestApi.deploymentStage,
                    },
                ],
            })
            .addApiKey(apiGatewayApiKey);
        apiGatewayRestApi.root.addMethod('ANY', new LambdaIntegration(fhirServerLambda), {
            authorizer: apiGatewayAuthorizer,
            authorizationType: AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });
        apiGatewayRestApi.root.addResource('{proxy+}').addMethod('ANY', new LambdaIntegration(fhirServerLambda), {
            authorizer: apiGatewayAuthorizer,
            authorizationType: AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });
        apiGatewayRestApi.root.addResource('metadata').addMethod('GET', new LambdaIntegration(fhirServerLambda), {
            authorizationType: AuthorizationType.NONE,
            apiKeyRequired: false,
        });
        apiGatewayRestApi.root
            .addResource('tenant')
            .addResource('{tenantId}')
            .addResource('metadata')
            .addMethod('GET', new LambdaIntegration(fhirServerLambda), {
                authorizationType: AuthorizationType.NONE,
                apiKeyRequired: false,
            });
        NagSuppressions.addResourceSuppressionsByPath(
            this,
            `/fhir-service-${props!.stage}/apiGatewayRestApi/Default/metadata/GET/Resource`,
            [
                {
                    id: 'AwsSolutions-APIG4',
                    reason: 'The /metadata endpoints do not require Authorization',
                },
                {
                    id: 'AwsSolutions-COG4',
                    reason: 'The /metadata endpoints do not require an Authorizer',
                },
            ],
        );
        NagSuppressions.addResourceSuppressionsByPath(
            this,
            `/fhir-service-${props!.stage}/apiGatewayRestApi/Default/tenant/{tenantId}/metadata/GET/Resource`,
            [
                {
                    id: 'AwsSolutions-APIG4',
                    reason: 'The /metadata endpoints do not require Authorization',
                },
                {
                    id: 'AwsSolutions-COG4',
                    reason: 'The /metadata endpoints do not require an Authorizer',
                },
            ],
        );

        const ddbToEsDLQ = new Queue(this, 'ddbToEsDLQ', {
            retentionPeriod: Duration.days(14),
            encryptionMasterKey: Alias.fromAliasName(this, 'ddbToEsDLQMasterKeyId', 'alias/aws/sqs'),
        });

        const ddbToEsLambda = new NodejsFunction(this, 'ddbToEs', {
            timeout: Duration.seconds(300),
            runtime: Runtime.NODEJS_14_X,
            description: 'Write DDB changes from `resource` table to ElasticSearch service',
            handler: 'handler',
            entry: path.join(__dirname, '../ddbToEsLambda/index.ts'),
            bundling: {
                target: 'es2020',
            },
            environment: {
                ENABLE_ES_HARD_DELETE: `${props!.enableESHardDelete}`,
                ...lambdaDefaultEnvVars,
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
                                    'dynamodb:GetShardIterator',
                                    'dynamodb:DescribeStream',
                                    'dynamodb:ListStreams',
                                    'dynamodb:GetRecords',
                                ],
                                resources: [resourceDynamoDbTable.tableStreamArn!],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
                                resources: ['*'],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['es:ESHttp*'],
                                resources: [`${elasticSearchResources.elasticSearchDomain.domainArn}/*`],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['sqs:SendMessage'],
                                resources: [ddbToEsDLQ.queueArn],
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

        const subscriptionReaper = new NodejsFunction(this, 'subscriptionReaper', {
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
            entry: path.join(__dirname, '../src/subscriptions/reaperLambda/index.ts'),
            bundling: {
                target: 'es2020',
            },
            environment: {
                ...lambdaDefaultEnvVars,
            },
        });
        new Rule(this, 'subscriptionReaperScheduleEvent', {
            schedule: Schedule.rate(Duration.minutes(5)),
            enabled: props!.enableSubscriptions,
        }).addTarget(new LambdaFunction(subscriptionReaper));

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
        NagSuppressions.addResourceSuppressions(ddbToEsDLQ, [
            {
                id: 'AwsSolutions-SQS3',
                reason: 'This is a DLQ.',
            },
        ]);

        // eslint-disable-next-line no-new
        const subscriptionsMatcher = new NodejsFunction(this, 'subscriptionsMatcher', {
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
                                resources: [resourceDynamoDbTable.tableStreamArn!],
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
            entry: path.join(__dirname, '../src/subscriptions/matcherLambda/index.ts'),
            bundling: {
                target: 'es2020',
            },
            environment: {
                SUBSCRIPTIONS_TOPIC: subscriptionsResources.subscriptionsTopic.ref,
                ...lambdaDefaultEnvVars,
            },
        });
        if (props!.enableSubscriptions) {
            subscriptionsMatcher.addEventSource(
                new DynamoEventSource(resourceDynamoDbTable, {
                    batchSize: 15,
                    retryAttempts: 3,
                    startingPosition: StartingPosition.LATEST,
                }),
            );
        }

        // eslint-disable-next-line no-new
        new NodejsFunction(this, 'subscriptionsRestHook', {
            timeout: Duration.seconds(10),
            runtime: Runtime.NODEJS_14_X,
            description: 'Send rest-hook notification for subscription',
            role: subscriptionsResources.restHookLambdaRole,
            handler: 'handler',
            entry: path.join(__dirname, '../src/subscriptions/restHookLambda/index.ts'),
            bundling: {
                target: 'es2020',
            },
            environment: {
                ...lambdaDefaultEnvVars,
            },
            events: [
                new SqsEventSource(subscriptionsResources.restHookQueue, {
                    batchSize: 50,
                    maxBatchingWindow: Duration.seconds(10),
                    reportBatchItemFailures: true,
                }),
            ],
        });

        // Create alarms resources here:
        // eslint-disable-next-line no-new
        new AlarmsResource(
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
        // create outputs for stack here:
        // eslint-disable-next-line no-new
        new CfnOutput(this, 'userPoolId', {
            description: 'User pool id for the provisioning users',
            value: `${cognitoResources.userPool.userPoolId}`,
            exportName: `UserPoolId-${props!.stage}`,
        });
        // eslint-disable-next-line no-new
        new CfnOutput(this, 'userPoolAppClientId', {
            description: 'App client id for the provisioning users.',
            value: `${cognitoResources.userPoolClient.ref}`,
            exportName: `UserPoolAppClientId-${props!.stage}`,
        });
        // eslint-disable-next-line no-new
        new CfnOutput(this, 'FHIRBinaryBucket', {
            description: 'S3 bucket for storing Binary objects',
            value: `${fhirBinaryBucket.bucketArn}`,
            exportName: `FHIRBinaryBucket-${props!.stage}`,
        });
        // eslint-disable-next-line no-new
        new CfnOutput(this, 'resourceDynamoDbTableArnOutput', {
            description: 'DynamoDB table for storing non-Binary resources',
            value: `${resourceDynamoDbTable.tableArn}`,
            exportName: `ResourceDynamoDbTableArn-${props!.stage}`,
        });
        // eslint-disable-next-line no-new
        new CfnOutput(this, 'resourceDynamoDbTableStreamArnOutput', {
            description: 'DynamoDB stream for the DDB table storing non-Binary resources',
            value: `${resourceDynamoDbTable.tableStreamArn}`,
            exportName: `ResourceDynamoDbTableStreamArn-${props!.stage}`,
        });
        // eslint-disable-next-line no-new
        new CfnOutput(this, 'exportRequestDynamoDbTableArnOutput', {
            description: 'DynamoDB table for storing bulk export requests',
            value: `${resourceDynamoDbTable.tableArn}`,
            exportName: `ExportRequestDynamoDbTableArnOutput-${props!.stage}`,
        });
        // eslint-disable-next-line no-new
        new CfnOutput(this, 'elasticsearchDomainEndpointOutput', {
            description: 'Endpoint of ElasticSearch instance',
            value: `${elasticSearchResources.elasticSearchDomain.domainEndpoint}`,
            exportName: `ElasticSearchDomainEndpoint-${props!.stage}`,
        });
        // eslint-disable-next-line no-new
        new CfnOutput(this, 'developerApiKeyOutput', {
            description: 'Key for developer access to the API',
            value: `${apiGatewayApiKey}`,
            exportName: `DeveloperAPIKey-${props!.stage}`,
        });

        if (isDev) {
            // eslint-disable-next-line no-new
            new CfnOutput(this, 'elasticsearchDomainKibanaEndpointOutput', {
                description: 'ElasticSearch Kibana endpoint',
                value: `${elasticSearchResources.elasticSearchDomain.domainEndpoint}/_plugin/kibana`,
                exportName: `ElasticSearchDomainKibanaEndpoint-${props!.stage}`,
                condition: isDevCondition,
            });
            // eslint-disable-next-line no-new
            new CfnOutput(this, 'elasticsearchKibanaUserPoolIdOutput', {
                description: 'User pool id for the provisioning ES Kibana users.',
                value: `${elasticSearchResources.kibanaUserPool!.ref}`,
                exportName: `ElasticSearchKibanaUserPoolId-${props!.stage}`,
                condition: isDevCondition,
            });
            // eslint-disable-next-line no-new
            new CfnOutput(this, 'elasticsearchKibanaUserPoolAppClientIdOutput', {
                description: 'App client id for the provisioning ES Kibana users.',
                value: `${elasticSearchResources.kibanaUserPoolClient!.ref}`,
                exportName: `ElasticSearchKibanaUserPoolAppClientId-${props!.stage}`,
                condition: isDevCondition,
            });
        }
    }
}
