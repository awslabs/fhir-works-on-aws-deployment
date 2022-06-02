import { AccountRootPrincipal, Effect, PolicyDocument, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Alias, Key } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export default class KMSResources {
    backupKMSKey: Key;

    dynamoDbKMSKey: Key;

    s3KMSKey: Key;

    elasticSearchKMSKey: Key;

    logKMSKey: Key;

    snsKMSKey: Key;

    s3Alias: Alias;

    dynamoDbAlias: Alias;

    elasticSearchAlias: Alias;

    logAlias: Alias;

    snsAlias: Alias;

    constructor(scope: Construct, region: string, stage: string, account: string) {
        this.backupKMSKey = new Key(scope, 'backupKMSKey', {
            description: 'Encryption key for daily',
            enableKeyRotation: true,
            policy: new PolicyDocument({
                statements: [
                    new PolicyStatement({
                        effect: Effect.ALLOW,
                        principals: [new AccountRootPrincipal()],
                        actions: ['kms:*'],
                        resources: ['*'],
                    }),
                ],
            }),
        });

        this.dynamoDbKMSKey = new Key(scope, 'dynamodbKMSKey', {
            enableKeyRotation: true,
            enabled: true,
            description: 'KMS CMK for DynamoDB',
            policy: new PolicyDocument({
                statements: [
                    new PolicyStatement({
                        sid: 'Enable IAM Root Permissions',
                        effect: Effect.ALLOW,
                        actions: ['kms:*'],
                        resources: ['*'],
                        principals: [new AccountRootPrincipal()],
                    }),
                ],
            }),
        });

        this.s3KMSKey = new Key(scope, 's3KMSKey', {
            enableKeyRotation: true,
            description: 'KMS CMK for s3',
            policy: new PolicyDocument({
                statements: [
                    new PolicyStatement({
                        sid: 'Enable IAM Root Permissions',
                        effect: Effect.ALLOW,
                        actions: ['kms:*'],
                        resources: ['*'],
                        principals: [new AccountRootPrincipal()],
                    }),
                ],
            }),
        });

        this.elasticSearchKMSKey = new Key(scope, 'elasticSearchKMSKey', {
            enableKeyRotation: true,
            description: 'KMS CMK for Elastic Search',
            policy: new PolicyDocument({
                statements: [
                    new PolicyStatement({
                        sid: 'Enable IAM Root Permissions',
                        effect: Effect.ALLOW,
                        actions: ['kms:*'],
                        resources: ['*'],
                        principals: [new AccountRootPrincipal()],
                    }),
                ],
            }),
        });

        this.logKMSKey = new Key(scope, 'logKMSKey', {
            enableKeyRotation: true,
            description: 'KMS CDK for Cloudwatch Logs',
            policy: new PolicyDocument({
                statements: [
                    new PolicyStatement({
                        sid: 'Enable IAM root Permissions',
                        effect: Effect.ALLOW,
                        actions: ['kms:*'],
                        resources: ['*'],
                        principals: [new AccountRootPrincipal()],
                    }),
                    new PolicyStatement({
                        sid: 'Allow Cloudwatch to use this Key policy',
                        effect: Effect.ALLOW,
                        actions: [
                            'kms:Encrypt*',
                            'kms:Decrypt*',
                            'kms:ReEncrypt*',
                            'kms:GenerateDataKey*',
                            'kms:Describe*',
                        ],
                        resources: ['*'],
                        principals: [new ServicePrincipal(`logs.${region}.amazonaws.com`)],
                        conditions: {
                            ArnLike: {
                                'kms:EncryptionContext:aws:logs:arn': `arn:aws:logs:${region}:${account}:*`,
                            },
                        },
                    }),
                ],
            }),
        });

        this.snsKMSKey = new Key(scope, 'snsKMSKey', {
            enableKeyRotation: true,
            description: 'KMS CMK for SNS',
            policy: new PolicyDocument({
                statements: [
                    new PolicyStatement({
                        sid: 'Enable IAM Root Permissions',
                        effect: Effect.ALLOW,
                        principals: [new AccountRootPrincipal()],
                        actions: ['kms:*'],
                        resources: ['*'],
                    }),
                    new PolicyStatement({
                        sid: 'Allow Cloudwatch to use this Key Policy',
                        effect: Effect.ALLOW,
                        principals: [new ServicePrincipal('cloudwatch.amazonaws.com')],
                        actions: ['kms:Encrypt', 'kms:Decrypt', 'kms:GenerateDataKey*'],
                        resources: ['*'],
                    }),
                    new PolicyStatement({
                        sid: 'Allow SNS to use this Key Policy',
                        effect: Effect.ALLOW,
                        principals: [new ServicePrincipal('sns.amazonaws.com')],
                        actions: ['kms:Encrypt', 'kms:Decrypt', 'kms:GenerateDataKey*'],
                        resources: ['*'],
                    }),
                ],
            }),
        });

        this.s3Alias = new Alias(scope, 's3KMSKeyAlias', {
            aliasName: `alias/s3Key-${stage}`,
            targetKey: this.s3KMSKey,
        });

        this.dynamoDbAlias = new Alias(scope, 'dynamoDbKMSKeyAlias', {
            aliasName: `alias/dynamoKey-${stage}`,
            targetKey: this.dynamoDbKMSKey,
        });

        this.elasticSearchAlias = new Alias(scope, 'elasticSearchKMSKeyAlias', {
            aliasName: `alias/elasticKey-${stage}`,
            targetKey: this.elasticSearchKMSKey,
        });

        this.logAlias = new Alias(scope, 'logKMSKeyAlias', {
            aliasName: `alias/logKey-${stage}`,
            targetKey: this.logKMSKey,
        });

        this.snsAlias = new Alias(scope, 'snsKMSKeyAlias', {
            aliasName: `alias/snsKey-${stage}`,
            targetKey: this.snsKMSKey,
        });
    }
}
