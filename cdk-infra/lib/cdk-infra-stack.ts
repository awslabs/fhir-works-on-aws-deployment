import {
    Aws,
    CfnCondition,
    CfnCustomResource,
    CfnMapping,
    CfnParameter,
    Duration,
    Fn,
    Stack,
    StackProps,
} from 'aws-cdk-lib';
import { AuthorizationType, CognitoUserPoolsAuthorizer } from 'aws-cdk-lib/aws-apigateway';
import {
    BackupPlan,
    BackupPlanRule,
    BackupResource,
    BackupSelection,
    BackupVault,
    TagOperation,
} from 'aws-cdk-lib/aws-backup';
import {
    CfnIdentityPool,
    CfnIdentityPoolRoleAttachment,
    CfnUserPool,
    CfnUserPoolClient,
    CfnUserPoolDomain,
    UserPool,
} from 'aws-cdk-lib/aws-cognito';
import { AttributeType, BillingMode, StreamViewType, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { CfnDomain, Domain, EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';
import { Schedule } from 'aws-cdk-lib/aws-events';
import {
    AccountPrincipal,
    AccountRootPrincipal,
    AnyPrincipal,
    ArnPrincipal,
    CfnRole,
    Effect,
    FederatedPrincipal,
    ManagedPolicy,
    PolicyDocument,
    PolicyStatement,
    Role,
    ServicePrincipal,
    StarPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Alias, Key } from 'aws-cdk-lib/aws-kms';
import { Code, Function, Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { ApiEventSource, DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { LogGroup, ResourcePolicy } from 'aws-cdk-lib/aws-logs';
import { Bucket, BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as path from 'path';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import { KMSResources } from './kms';
import { Backup } from './backup';
import { ElasticSearchResources } from './elasticsearch';
import { SubscriptionsResources } from './subscriptions';
import { AlarmsResource } from './alarms';
import { CognitoResources } from './cognito';
import { BulkExportResources } from './bulkExport';
import { Queue, QueuePolicy } from 'aws-cdk-lib/aws-sqs';

export class FhirWorksStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Define command line parameters
        const stage = new CfnParameter(this, 'stage', {
            type: 'String',
            description: 'The stage for deployment',
            default: 'dev',
        });

        const region = new CfnParameter(this, 'this.region', {
            type: 'String',
            description: 'The this.region to which to deploy',
            default: 'us-west-2',
        });

        const oauthRedirect = new CfnParameter(this, 'oauthRedirect', {
            type: 'String',
            default: 'http://localhost',
        });

        const useHapiValidator = new CfnParameter(this, 'useHapiValidator', {
            type: 'String',
            description: 'Whether or not to enable validation of implementation guides',
            default: 'false',
        });

        const enableMultiTenancy = new CfnParameter(this, 'enableMultiTenancy', {
            type: 'String',
            description: 'Whether or not to enable a multi tenant deployment',
            default: 'false',
        });

        const enableSubscriptions = new CfnParameter(this, 'enableSubscriptions', {
            type: 'String',
            description: 'Whether or not to enable FHIR Subscriptions',
            default: 'false',
        });

        const logLevel = new CfnParameter(this, 'logLevel', {
            type: 'String',
            description: 'Choose what level of information to log',
            default: 'error',
        });

        const enableESHardDelete = new CfnParameter(this, 'enableESHardDelete', {
            type: 'String',
            description: 'Whether resources should be hard deleted or not',
            default: 'false',
        });

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
        const isDev = stage.valueAsString === 'dev';
        const isDevCondition = new CfnCondition(this, 'isDev', {
            expression: Fn.conditionEquals(stage.valueAsString, 'dev'),
        });
        const isUsingHapiValidator = useHapiValidator.valueAsString === 'true';
        const isMultiTenancyEnabled = enableMultiTenancy.valueAsString === 'true';

        // define other custom variables here
        const resourceTableName = `resource-db-${stage.node.id}`;
        const exportRequestTableName = `export-request-${stage.node.id}`;
        const exportRequestTableJobStatusIndex = `jobStatus-index`;

        // Create KMS Resources
        const kmsResources = new KMSResources(this, this.region, stage.valueAsString, this.account);

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

        const uploadGlueScriptsLambdaFunction = new Function(this, 'uploadGlueScriptsLambdaFunction', {
          timeout: Duration.seconds(30),
          memorySize: 192,
          runtime: Runtime.NODEJS_14_X,
          description: 'Upload glue scripts to s3',
          role: new Role(this),
          handler: 'uploadGlueScriptsToS3.handler',
          code: Code.fromAsset(path.join(__dirname, '../../bulkExport/index.ts')),
          environment: {
            'GLUE_SCRIPTS_BUCKET': glueScriptsBucket.bucketArn,
          }
        })

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

        // Define Backup Resources here:
        // NOTE: this is an extra Cloudformation stack; not linked to FHIR Server stack
        // This is not deployed by default, but can be added to cdk-infra.ts under /bin/ to do so:
        // const backupResources = new Backup(this, 'backup', { backupKMSKey: kmsResources.backupKMSKey });

        // Define ElasticSearch resources here:
        const elasticSearchResources = new ElasticSearchResources(
            this,
            isDevCondition,
            this.stackName,
            stage.valueAsString,
            this.account,
            isDev,
            kmsResources.elasticSearchKMSKey,
        );

        // Create Subscriptions resources here:
        const subscriptionsResources = new SubscriptionsResources(this, this.region, this.partition);

        // Create Cognito Resources here:
        const cognitoResources = new CognitoResources(this, this.stackName, oauthRedirect.valueAsString);

        // Create bulkExport Resources here:
        const bulkExportResources = new BulkExportResources(
          this, resourceDynamoDbTable,
          exportRequestDynamoDbTable,
          fhirLogsBucket,
          kmsResources.dynamoDbKMSKey,
          kmsResources.s3KMSKey,
          kmsResources.logKMSKey,
          stage.valueAsString,
          this.region,
          exportGlueWorkerType,
          exportGlueNumberWorkers,
          isMultiTenancyEnabled,
          uploadGlueScriptsLambdaFunction,
        );

        // TODO: update when finished importing all lambda functions
        // const updateSearchMappingsCustomResource = new CfnCustomResource(this, 'updateSearchMappingsCustomResource', {
        //   serviceToken: updateSearchMappingsLambdaFunction.functionArn,
        //   RandomValue: 'sls:instanceId'
        // })

        // Define main resources here:
        const apiGatewayAuthorizer = new CognitoUserPoolsAuthorizer(this, 'apiGatewayAuthorizer', {
            authorizerName: `fhir-works-authorizer-${stage}-${this.region}`,
            identitySource: 'method.request.header.Authorization',
            cognitoUserPools: [
                // TODO: pending port of cognito.yaml
            ],
        });

        const subscriptionsMatcherDLQ = new Queue(this, 'subscriptionsMatcherDLQ', {
          retentionPeriod: Duration.days(14),
          encryptionMasterKey: Alias.fromAliasName(this, 'kmsMasterKeyId', 'alias/aws/sqs'),
        });

        const subscriptionsMatcherDLQHttpsOnlyPolicy = new QueuePolicy(this, 'subscriptionsMatcherDLQHttpsOnlyPolicy', {
          queues: [
            subscriptionsMatcherDLQ,
          ],
        });
        subscriptionsMatcherDLQHttpsOnlyPolicy.document.addStatements(
          new PolicyStatement({
            effect: Effect.DENY,
            actions: [
              'SQS:*'
            ],
            resources: [
              subscriptionsMatcherDLQ.queueArn,
            ],
            principals: [
              new StarPrincipal(),
            ],
            conditions: {
              Bool: {
                'aws:SecureTransport': false,
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
                        'aws:SecureTransport': false,
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
                        'aws:SecureTransport': false,
                    },
                },
            }),
        );

        const fhirServerLambda = new Function(this, 'fhirServer', {
            timeout: Duration.seconds(40),
            description: 'FHIR API Server',
            handler: 'index.handler',
            runtime: Runtime.NODEJS_14_X,
            reservedConcurrentExecutions: 5,
            environment: {
                // pending port of bulk Export
                EXPORT_STATE_MACHINE_ARN: '',
                PATIENT_COMPARTMENT_V3: '',
                PATIENT_COMPARTMENT_V4: '',
            },
            code: Code.fromAsset(path.join(__dirname, '../../src/')),
            role: new Role(this, 'fhirServerLambdaRole', {
                assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
                inlinePolicies: {
                    FhirServerLambdaPolicy: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['logs:CreateLogStream', 'logs:CreateLogGroup', 'logs:PutLogEvents'],
                                resources: [`arn:${this.partition}:logs:${this.region}:*:*`],
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
        fhirServerLambda.addEventSource(
            new ApiEventSource('ANY', '/', {
                authorizer: apiGatewayAuthorizer,
                authorizationType: AuthorizationType.COGNITO,
            }),
        );
        fhirServerLambda.addEventSource(
            new ApiEventSource('ANY', '/{proxy+}', {
                authorizer: apiGatewayAuthorizer,
                authorizationType: AuthorizationType.COGNITO,
            }),
        );
        fhirServerLambda.addEventSource(new ApiEventSource('GET', '/metadata', {}));
        fhirServerLambda.addEventSource(new ApiEventSource('GET', '/tenant/{tenantId}/metadata', {}));

        const ddbToEsLambda = new Function(this, 'ddbToEs', {
            timeout: Duration.seconds(300),
            runtime: Runtime.NODEJS_14_X,
            description: 'Write DDB changes from `resource` table to ElasticSearch service',
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, '../../ddbToEsLambda/')),
            environment: {
                ENABLE_ES_HARD_DELETE: enableESHardDelete.valueAsString,
            },
            role: new Role(this, 'DdbToEsLambdaRole', {
                assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
                inlinePolicies: {
                    DdbToEsLambdaPolicy: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['logs:CreateLogStream', 'logs:CreateLogGroup', 'logs:PutLogEvents'],
                                resources: [`arn:${this.partition}:logs:${this.region}:*:*`],
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
              'SubscriptionsMatcherLambdaPolicy': new PolicyDocument({
                statements: [
                  new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                      'logs:CreateLogStream',
                      'logs:CreateLogGroup',
                      'logs:PutLogEvents',
                    ],
                    resources: [
                      `arn:${this.partition}:logs:${this.region}:*:*`,
                    ],
                  }),
                  new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                      'dynamodb:GetShardIterator',
                      'dynamodb:DescribeStream',
                      'dynamodb:ListStreams',
                      'dynamodb:GetRecords',
                    ],
                    resources: [
                      resourceDynamoDbTable.tableArn,
                    ],
                  }),
                  new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                      'dynamodb:Query',
                      'dynamodb:Scan',
                      'dynamodb:GetItem',
                    ],
                    resources: [
                      resourceDynamoDbTable.tableArn,
                    ],
                  }),
                  new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                      'dynamodb:Query',
                    ],
                    resources: [
                      `${resourceDynamoDbTable.tableArn}/index/*`
                    ],
                  }),
                  new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                      'xray:PutTraceSegments',
                      'xray:PutTelemetryRecords',
                    ],
                    resources: [
                      '*'
                    ],
                  }),
                  new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                      'sqs:SendMessage',
                    ],
                    resources: [
                      subscriptionsMatcherDLQ.arn
                    ]
                  })
                ]
              }),
              'KMSPolicy': new PolicyDocument({
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
                    ],
                  }),
                ],
              }),
              'PublishToSNSPolicy': new PolicyDocument({
                statements: [
                  new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                      'kms:GenerateDataKey',
                      'kms:Decrypt',
                    ],
                    resources: [
                      subscriptionsResources.subscriptionsKey.keyArn,
                    ],
                  }),
                  new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                      'sns:Publish',
                    ],
                    resources: [
                      subscriptionsResources.subscriptionsTopic.ref,
                    ],
                  }),
                ],
              }),
            },
          }),
          handler: 'index.handler',
          code: Code.fromAsset(path.join(__dirname, '../../src/subscriptions/matcherLambda/')),
          environment: {
            'SUBSCRIPTIONS_TOPIC': subscriptionsResources.subscriptionsTopic.ref,
          },
          events: [
            new DynamoEventSource(resourceDynamoDbTable, {
              batchSize: 15,
              retryAttempts: 3,
              startingPosition: StartingPosition.LATEST,
              enabled: enableSubscriptions.valueAsString === 'true' // will only run if opted into subscriptions feature
            })
          ]
        });

        // Create alarms resources here: 
        const alarmsResources = new AlarmsResource(
          this,
          stage.valueAsString,
          ddbToEsLambda,
          kmsResources.snsKMSKey,
          ddbToEsDLQ,
          fhirServerLambda,
          apigateway,
          this.stackName,
          this.account,
          elasticSearchResources.elasticSearchDomain,
          isDev
        );
    }
}
