import { CfnCondition, CfnOutput, CfnParameter, CustomResource, Duration, Fn, Stack, StackProps } from 'aws-cdk-lib';
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
import { Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal, StarPrincipal } from 'aws-cdk-lib/aws-iam';
import { Alias } from 'aws-cdk-lib/aws-kms';
import { Runtime, StartingPosition, Tracing } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource, SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Bucket, BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { Queue, QueuePolicy } from 'aws-cdk-lib/aws-sqs';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { NodejsFunction, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs';
import path from 'path';
import KMSResources from './kms';
import ElasticSearchResources from './elasticsearch';
import SubscriptionsResources from './subscriptions';
import AlarmsResource from './alarms';
import CognitoResources from './cognito';
import BulkExportResources from './bulkExport';
import BulkExportStateMachine from './bulkExportStateMachine';

export interface FhirWorksStackProps extends StackProps {
    stage: string;
    region: string;
    enableMultiTenancy: boolean;
    enableSubscriptions: boolean;
    useHapiValidator: boolean;
    enableESHardDelete: boolean;
    logLevel: string;
    oauthRedirect: string;
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

        const PATIENT_COMPARTMENT_V3 = 'patientCompartmentSearchParams.3.0.2.json';
        const PATIENT_COMPARTMENT_V4 = 'patientCompartmentSearchParams.4.0.1.json';

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

        // Create Subscriptions resources here:
        const subscriptionsResources = new SubscriptionsResources(this, props!.region, this.partition);

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

        const defaultEnvVars = {
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
            CUSTOM_USER_AGENT: 'AwsSolution/SO0`18/GH-v4.3.0',
            ENABLE_MULTI_TENANCY: `${props!.enableMultiTenancy}`,
            ENABLE_SUBSCRIPTIONS: `${props!.enableSubscriptions}`,
            LOG_LEVEL: props!.logLevel,
        };

        const defaultLambdaBundlingOptions = {
            target: 'es2020',
        };

        const startExportJobLambdaFunction = new NodejsFunction(this, 'startExportJobLambdaFunction', {
            timeout: Duration.seconds(30),
            memorySize: 192,
            runtime: Runtime.NODEJS_14_X,
            description: 'Start the Glue job for bulk export',
            role: bulkExportResources.glueJobRelatedLambdaRole,
            handler: 'startExportJobHandler',
            entry: path.join(__dirname, '../bulkExport/index.ts'),
            bundling: defaultLambdaBundlingOptions,
            environment: {
                ...defaultEnvVars,
            },
        });

        const stopExportJobLambdaFunction = new NodejsFunction(this, 'stopExportJobLambdaFunction', {
            timeout: Duration.seconds(30),
            memorySize: 192,
            runtime: Runtime.NODEJS_14_X,
            description: 'Stop the Glue job for bulk export',
            role: bulkExportResources.glueJobRelatedLambdaRole,
            handler: 'stopExportJobHandler',
            entry: path.join(__dirname, '../bulkExport/index.ts'),
            bundling: defaultLambdaBundlingOptions,
            environment: {
                ...defaultEnvVars,
            },
        });

        const getJobStatusLambdaFunction = new NodejsFunction(this, 'getJobStatusLambdaFunction', {
            timeout: Duration.seconds(30),
            memorySize: 192,
            runtime: Runtime.NODEJS_14_X,
            description: 'Get the status of a Glue job run for bulk export',
            role: bulkExportResources.glueJobRelatedLambdaRole,
            handler: 'getJobStatusHandler',
            entry: path.join(__dirname, '../bulkExport/index.ts'),
            bundling: {
                target: 'es2020',
            },
            environment: {
                ...defaultEnvVars,
            },
        });

        const updateStatusLambdaFunction = new NodejsFunction(this, 'updateStatusLambdaFunction', {
            timeout: Duration.seconds(30),
            memorySize: 192,
            runtime: Runtime.NODEJS_14_X,
            description: 'Update the status of a bulk export job',
            role: bulkExportResources.updateStatusLambdaRole,
            handler: 'updateStatusStatusHandler',
            entry: path.join(__dirname, '../bulkExport/index.ts'),
            bundling: {
                target: 'es2020',
            },
            environment: {
                ...defaultEnvVars,
            },
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
                    beforeBundling(inputDir, outputDir) {
                        return [];
                    },
                    beforeInstall(inputDir, outputDir) {
                        return [];
                    },
                    afterBundling(inputDir, outputDir) {
                        console.log('input', inputDir);
                        console.log('output', outputDir);
                        // copy all the necessary files for the lambda into the bundle
                        return [
                            `dir ${outputDir}\\bulkExport || mkdir -p ${outputDir}\\bulkExport\\glueScripts`,
                            `dir ${outputDir}\\bulkExport\\schema || mkdir ${outputDir}\\bulkExport\\schema`,
                            `cp ${inputDir}\\bulkExport\\glueScripts\\export-script.py ${outputDir}\\bulkExport\\glueScripts\\export-script.py`,
                            `cp ${inputDir}\\bulkExport\\schema\\transitiveReferenceParams.json ${outputDir}\\bulkExport\\schema\\transitiveReferenceParams.json`,
                            `cp ${inputDir}\\bulkExport\\schema\\${PATIENT_COMPARTMENT_V3} ${outputDir}\\bulkExport\\schema\\${PATIENT_COMPARTMENT_V3}`,
                            `cp ${inputDir}\\bulkExport\\schema\\${PATIENT_COMPARTMENT_V4} ${outputDir}\\bulkExport\\schema\\${PATIENT_COMPARTMENT_V4}`,
                        ];
                    },
                },
            },
            environment: {
                ...defaultEnvVars,
                GLUE_SCRIPTS_BUCKET: bulkExportResources.glueScriptsBucket.bucketArn,
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
                ...defaultEnvVars,
                ELASTICSEARCH_DOMAIN_ENDPOINT: `https://${elasticSearchResources.elasticSearchDomain.domainEndpoint}`,
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

        // const uploadGlueScriptsCustomResource = new CustomResource(this, 'uploadGlueScriptsCustomResource', {
        //     serviceToken: uploadGlueScriptsLambdaFunction.functionArn,
        //     properties: {
        //         'RandomValue': this.artifactId
        //     }
        // });

        // const updateSearchMappingsCustomResource = new CustomResource(this, 'updateSearchMappingsCustomResource', {
        //     serviceToken: updateSearchMappingsLambdaFunction.functionArn,
        // });
        // updateSearchMappingsCustomResource.node.addDependency(elasticSearchResources.elasticSearchDomain);

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

        const fhirServerLambda = new NodejsFunction(this, 'fhirServer', {
            timeout: Duration.seconds(40),
            description: 'FHIR API Server',
            entry: path.join(__dirname, '../src/index.ts'),
            handler: 'handler',
            bundling: defaultLambdaBundlingOptions,
            runtime: Runtime.NODEJS_14_X,
            reservedConcurrentExecutions: 5,
            environment: {
                ...defaultEnvVars,
                EXPORT_STATE_MACHINE_ARN: bulkExportStateMachine.bulkExportStateMachine.stateMachineArn,
                PATIENT_COMPARTMENT_V3,
                PATIENT_COMPARTMENT_V4,
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
                                resources: [`${resourceDynamoDbTable.tableArn}/index/*`],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['es:ESHttpGet', 'es:ESHttpHead', 'es:ESHttpPost'],
                                resources: [`${elasticSearchResources.elasticSearchDomain.domainArn}/*`],
                            }),
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['s3:*Object', 's3:ListBucket', 's3:DeleteObjectVersion'],
                                resources: [fhirBinaryBucket.bucketArn, `${fhirBinaryBucket.bucketArn}/*'`],
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
                ...defaultEnvVars,
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
            entry: path.join(__dirname, '../src/subscriptions/matcherLambda/index.ts'),
            bundling: {
                target: 'es2020',
            },
            environment: {
                SUBSCRIPTIONS_TOPIC: subscriptionsResources.subscriptionsTopic.ref,
                ...defaultEnvVars,
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
                ...defaultEnvVars,
            },
        });
        new Rule(this, 'subscriptionReaperScheduleEvent', {
            schedule: Schedule.cron({ minute: '5' }),
            enabled: isSubscriptionsEnabled,
        }).addTarget(new LambdaFunction(subscriptionReaper));

        const subscriptionsRestHook = new NodejsFunction(this, 'subscriptionsRestHook', {
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
                ...defaultEnvVars,
            },
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

        // create outputs for stack here:
        const userPoolIdOutput = new CfnOutput(this, 'userPoolId', {
            description: 'User pool id for the provisioning users',
            value: `${cognitoResources.userPool.userPoolId}`,
            exportName: `UserPoolId-${props!.stage}`,
        });

        const userPoolAppClientIdOutput = new CfnOutput(this, 'userPoolAppClientId', {
            description: 'App client id for the provisioning users.',
            value: `${cognitoResources.userPoolClient.ref}`,
            exportName: `UserPoolAppClientId-${props!.stage}`,
        });

        const FHIRBinaryBucketOutput = new CfnOutput(this, 'FHIRBinaryBucket', {
            description: 'S3 bucket for storing Binary objects',
            value: `${fhirBinaryBucket.bucketArn}`,
            exportName: `FHIRBinaryBucket-${props!.stage}`,
        });

        const resourceDynamoDbTableArnOutput = new CfnOutput(this, 'resourceDynamoDbTableArnOutput', {
            description: 'DynamoDB table for storing non-Binary resources',
            value: `${resourceDynamoDbTable.tableArn}`,
            exportName: `ResourceDynamoDbTableArn-${props!.stage}`,
        });

        const resourceDynamoDbTableStreamArnOutput = new CfnOutput(this, 'resourceDynamoDbTableStreamArnOutput', {
            description: 'DynamoDB stream for the DDB table storing non-Binary resources',
            value: `${resourceDynamoDbTable.tableStreamArn}`,
            exportName: `ResourceDynamoDbTableStreamArn-${props!.stage}`,
        });

        const exportRequestDynamoDbTableArnOutput = new CfnOutput(this, 'exportRequestDynamoDbTableArnOutput', {
            description: 'DynamoDB table for storing bulk export requests',
            value: `${resourceDynamoDbTable.tableArn}`,
            exportName: `ExportRequestDynamoDbTableArnOutput-${props!.stage}`,
        });

        const elasticSearchDomainEndpointOutput = new CfnOutput(this, 'elasticsearchDomainEndpointOutput', {
            description: 'Endpoint of ElasticSearch instance',
            value: `${elasticSearchResources.elasticSearchDomain.domainEndpoint}`,
            exportName: `ElasticSearchDomainEndpoint-${props!.stage}`,
        });

        const developerApiKeyOutput = new CfnOutput(this, 'developerApiKeyOutput', {
            description: 'Key for developer access to the API',
            value: `${apiGatewayApiKey}`,
            exportName: `DeveloperAPIKey`,
        });

        if (isDev) {
            const elasticSearchDomainKibanaEndpointOutput = new CfnOutput(
                this,
                'elasticsearchDomainKibanaEndpointOutput',
                {
                    description: 'ElasticSearch Kibana endpoint',
                    value: `${elasticSearchResources.elasticSearchDomain.domainEndpoint}/_plugin/kibana`,
                    exportName: `ElasticSearchDomainKibanaEndpoint-${props!.stage}`,
                    condition: isDevCondition,
                },
            );

            const elasticSearchKibanaUserPoolIdOutput = new CfnOutput(this, 'elasticsearchKibanaUserPoolIdOutput', {
                description: 'User pool id for the provisioning ES Kibana users.',
                value: `${elasticSearchResources.kibanaUserPool!.ref}`,
                exportName: `ElasticSearchKibanaUserPoolId-${props!.stage}`,
                condition: isDevCondition,
            });

            const elasticSearchKibanaUserPoolAppClientIdOutput = new CfnOutput(
                this,
                'elasticsearchKibanaUserPoolAppClientIdOutput',
                {
                    description: 'App client id for the provisioning ES Kibana users.',
                    value: `${elasticSearchResources.kibanaUserPoolClient!.ref}`,
                    exportName: `ElasticSearchKibanaUserPoolAppClientId-${props!.stage}`,
                    condition: isDevCondition,
                },
            );
        }
    }
}
