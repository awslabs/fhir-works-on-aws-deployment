import { CfnMapping, CfnParameter, Duration, Fn, Stack, StackProps } from 'aws-cdk-lib';
import { AuthorizationType, CognitoUserPoolsAuthorizer } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, BillingMode, StreamViewType, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { AccountPrincipal, AccountRootPrincipal, AnyPrincipal, Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal, StarPrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Code, Function, Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { ApiEventSource, DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Bucket, BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as path from 'path';

export class CdkInfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Define command line parameters
    const stage = new CfnParameter(this, "stage", {
      type: "String",
      description: "The stage for deployment",
      default: "dev",
    });

    const region = new CfnParameter(this, "region", {
      type: "String", 
      description: "The region to which to deploy",
      default: "us-west-2",
    });

    const oauthRedirect = new CfnParameter(this, "oauthRedirect", {
      type: "String",
      default: 'http://localhost',
    });

    const useHapiValidator = new CfnParameter(this, "useHapiValidator", {
      type: "String",
      description: "Whether or not to enable validation of implementation guides",
      default: "false",
    });

    const enableMultiTenancy = new CfnParameter(this, "enableMultiTenancy", {
      type: "String",
      description: "Whether or not to enable a multi tenant deployment",
      default: "false",
    });

    const enableSubscriptions = new CfnParameter(this, "enableSubscriptions", {
      type: "String", 
      description: "Whether or not to enable FHIR Subscriptions",
      default: "false",
    });

    const logLevel = new CfnParameter(this, "logLevel", {
      type: "String",
      description: "Choose what level of information to log",
      default: "error",
    });

    const enableESHardDelete = new CfnParameter(this, "enableESHardDelete", {
      type: "String",
      description: "Whether resources should be hard deleted or not",
      default: "false",
    });

    // define other custom variables here
    const resourceTableName = `resource-db-${stage.node.id}`;
    const exportRequestTableName = `export-request-${stage.node.id}`;
    const exportRequestTableJobStatusIndex = `jobStatus-index`;
    const regionMappings = new CfnMapping(this, 'RegionMap', {
      mapping: {
        'us-east-2': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'us-east-1': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'us-west-1': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'r6g.large.elasticsearch',
        },
        'us-west-2': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'af-south-1': {
          'smallEc2': 'c5.large.elasticsearch',
          'largeEc2': 'm5.large.elasticsearch',
        },
        'ap-east-1': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'ap-south-1': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'r6g.large.elasticsearch',
        },
        'ap-southeast-2': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'ap-southeast-1': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'ap-northeast-3': {
          'smallEc2': 'c5.large.elasticsearch',
          'largeEc2': 'm5.large.elasticsearch',
        },
        'ap-northeast-2': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'ap-northeast-1': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'ca-central-1': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'eu-central-1': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'eu-west-1': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'eu-west-2': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'eu-west-3': {
          'smallEc2': 'c5.large.elasticsearch',
          'largeEc2': 'm5.large.elasticsearch',
        },
        'eu-south-1': {
          'smallEc2': 'c5.large.elasticsearch',
          'largeEc2': 'm5.large.elasticsearch',
        },
        'eu-north-1': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'me-south-1': {
          'smallEc2': 'c5.large.elasticsearch',
          'largeEc2': 'm5.large.elasticsearch',
        },
        'sa-east-1': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'us-gov-east-1': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
        'us-gov-west-1': {
          'smallEc2': 'c6g.large.elasticsearch',
          'largeEc2': 'm6g.large.elasticsearch',
        },
      }
    });

    // Define resources here:
    const dynamoDbKMSKey = new Key(this, 'dynamodbKMSKey', {
      enableKeyRotation: true,
      enabled: true,
      description: 'KMS CMK for DynamoDB',
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: 'Enable IAM Root Permissions',
            effect: Effect.ALLOW,
            actions: [
              'kms:*'
            ],
            resources: [
              '*'
            ],
            principals: [new AccountRootPrincipal()]
          })
        ]
      }) 
    });
    
    const s3KMSKey = new Key(this, 's3KMSKey', {
      enableKeyRotation: true,
      description: 'KMS CMK for s3',
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: 'Enable IAM Root Permissions',
            effect: Effect.ALLOW,
            actions: [
              'kms:*'
            ],
            resources: [
              '*'
            ],
            principals: [ new AccountRootPrincipal() ]
          })
        ]
      })
    });

    const elasticSearchKMSKey = new Key(this, 'elasticSearchKMSKey', {
      enableKeyRotation: true,
      description: 'KMS CMK for Elastic Search',
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: 'Enable IAM Root Permissions',
            effect: Effect.ALLOW,
            actions: [
              'kms:*'
            ],
            resources: [
              '*'
            ],
            principals: [new AccountRootPrincipal()]
          })
        ]
      })
    });

    const resourceDynamoDbTable = new Table(this, resourceTableName, {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      sortKey: {
        type: AttributeType.NUMBER,
        name: 'vid'
      },
      tableName: resourceTableName,
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecovery: true,
      encryption: TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: dynamoDbKMSKey,
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
      }
    });

    const exportRequestDynamoDbTable = new Table(this, exportRequestTableName, {
      tableName: exportRequestTableName,
      partitionKey: {
        name: 'jobId',
        type: AttributeType.STRING,
      },
      encryption: TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: dynamoDbKMSKey,
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
      }
    });

    const apiGatewayAuthorizer = new CognitoUserPoolsAuthorizer(this, 'apiGatewayAuthorizer', {
      authorizerName:`fhir-works-authorizer-${stage}-${region}`,
      identitySource: 'method.request.header.Authorization',
      cognitoUserPools: [
        // pending port of cognito.yaml
      ]
    });

    const fhirLogsBucket = new Bucket(this, 'fhirLogsBucket', {
      accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
      encryption: BucketEncryption.S3_MANAGED,
      publicReadAccess: false,
      blockPublicAccess: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      }
    });

    fhirLogsBucket.addToResourcePolicy(new PolicyStatement({
      sid: 'AllowSSLRequestsOnly',
      effect: Effect.DENY,
      principals: [new StarPrincipal()],
      actions: [
        's3:*',
      ],
      resources: [
        fhirLogsBucket.bucketArn,
        fhirLogsBucket.arnForObjects('*'),
      ],
      conditions: {
        'Bool': {
          'aws:SecureTransport': false
        }
      }
    }))

    const fhirBinaryBucket = new Bucket(this, 'fhirBinaryBucket', {
      serverAccessLogsBucket: fhirLogsBucket,
      serverAccessLogsPrefix: 'binary-acl',
      versioned: true,
      encryption: BucketEncryption.KMS,
      encryptionKey: s3KMSKey,
      blockPublicAccess: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
    });

    fhirBinaryBucket.addToResourcePolicy(new PolicyStatement({
      sid: 'AllowSSLRequestsOnly',
      effect: Effect.DENY,
      actions: [
        's3:*'
      ],
      principals: [new StarPrincipal()],
      resources:[
        fhirBinaryBucket.bucketArn,
        fhirBinaryBucket.arnForObjects('*'),
      ],
      conditions: {
        'Bool': {
          'aws:SecureTransport': false
        }
      }
    }));

    const fhirServerLambda = new Function(this, 'fhirServer', {
      timeout: Duration.seconds(40),
      description: 'FHIR API Server', 
      handler: 'index.handler',
      runtime: Runtime.NODEJS_14_X,
      reservedConcurrentExecutions: 5,
      environment: {
        // pending port of bulk Export
        'EXPORT_STATE_MACHINE_ARN': '',
        'PATIENT_COMPARTMENT_V3': '',
        'PATIENT_COMPARTMENT_V4': '',
      },
      code: Code.fromAsset(path.join(__dirname, '../../src/')),
      role: new Role(this, 'fhirServerLambdaRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'FhirServerLambdaPolicy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'logs:CreateLogStream',
                  'logs:CreateLogGroup',
                  'logs:PutLogEvents',
                ],
                resources: [
                  `arn:${this.partition}:logs:${region}:*:*`
                ]
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
                  s3KMSKey.keyArn,
                  dynamoDbKMSKey.keyArn,
                  elasticSearchKMSKey.keyArn,
                ]
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
                ]
              }),
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'dynamodb:Query',
                ],
                resources: [
                  `${resourceDynamoDbTable.tableArn}/index/*`,
                ]
              }),
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  's3:*Object',
                  's3:ListBucket',
                  's3:DeleteObjectVersion',
                ],
                resources: [
                  fhirBinaryBucket.bucketArn,
                  fhirBinaryBucket.arnForObjects('*'),
                ]
              })
            ]
          })
        }
      })
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
    fhirServerLambda.addEventSource(new ApiEventSource('ANY', '/', {
      authorizer: apiGatewayAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    }));
    fhirServerLambda.addEventSource(new ApiEventSource('ANY', '/{proxy+}', {
      authorizer: apiGatewayAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    }));
    fhirServerLambda.addEventSource(new ApiEventSource('GET', '/metadata', {}));
    fhirServerLambda.addEventSource(new ApiEventSource('GET', '/tenant/{tenantId}/metadata', {}));
    
    const ddbToEsLambda = new Function(this, 'ddbToEs', {
      timeout: Duration.seconds(300),
      runtime: Runtime.NODEJS_14_X,
      description: 'Write DDB changes from `resource` table to ElasticSearch service',
      handler: 'index.handler',
      code: Code.fromAsset(path.join(__dirname, '../../ddbToEsLambda/')),
      environment: {
        'ENABLE_ES_HARD_DELETE': enableESHardDelete.valueAsString
      },
      role: new Role(this, 'DdbToEsLambdaRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'DdbToEsLambdaPolicy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'logs:CreateLogStream',
                  'logs:CreateLogGroup',
                  'logs:PutLogEvents',
                ],
                resources: [
                  `arn:${this.partition}:logs:${region}:*:*`,
                ],
              }),
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'dynamoDb:GetShardIterator',
                  'dynamoDb:DescribeStream',
                  'dynamoDb:ListStreams',
                  'dynamoDb:GetRecords',
                ],
                resources: [
                  resourceDynamoDbTable.tableStreamArn!,
                ],
              }),
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'xray:PutTraceSegments',
                  'xray:PutTelemetryRecords',
                ],
                resources: [ '*' ]
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
                  dynamoDbKMSKey.keyArn,
                  elasticSearchKMSKey.keyArn,
                ]
              }),
            ]
          }),
        }
      }),
    });
    ddbToEsLambda.addEventSource(new DynamoEventSource(resourceDynamoDbTable, {
      batchSize: 15,
      retryAttempts: 3,
      startingPosition: StartingPosition.LATEST,
    }));
  }
}
