import { Duration } from 'aws-cdk-lib';
import {
    AccountRootPrincipal,
    Effect,
    PolicyDocument,
    PolicyStatement,
    Role,
    ServicePrincipal,
    StarPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { CfnSubscription, CfnTopic } from 'aws-cdk-lib/aws-sns';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export default class SubscriptionsResources {
    subscriptionsKey: Key;

    restHookDLQ: Queue;

    restHookQueue: Queue;

    subscriptionsTopic: CfnTopic;

    restHookSubscription: CfnSubscription;

    restHookLambdaRole: Role;

    constructor(scope: Construct, region: string, partition: string, stage: string) {
        this.subscriptionsKey = new Key(scope, 'subscriptionsKey', {
            description: 'Encryption key for rest hook queue that can be used by SNS',
            enableKeyRotation: true,
            policy: new PolicyDocument({
                statements: [
                    new PolicyStatement({
                        effect: Effect.ALLOW,
                        principals: [new ServicePrincipal('sns.amazonaws.com')],
                        actions: ['kms:Decrypt', 'kms:GenerateDataKey*'],
                        resources: ['*'],
                    }),
                    new PolicyStatement({
                        sid: 'Allow administration of the key',
                        effect: Effect.ALLOW,
                        principals: [new AccountRootPrincipal()],
                        actions: ['kms:*'],
                        resources: ['*'],
                    }),
                ],
            }),
        });

        this.restHookDLQ = new Queue(scope, 'restHookDLQ', {
            encryptionMasterKey: this.subscriptionsKey,
            retentionPeriod: Duration.days(14), // 14 days in seconds
        });
        NagSuppressions.addResourceSuppressions(this.restHookDLQ, [
            {
                id: 'AwsSolutions-SQS3',
                reason: 'This is a DLQ.',
            },
        ]);

        this.restHookQueue = new Queue(scope, 'restHookQueue', {
            encryptionMasterKey: this.subscriptionsKey,
            deadLetterQueue: {
                queue: this.restHookDLQ,
                maxReceiveCount: 2,
            },
        });

        this.subscriptionsTopic = new CfnTopic(scope, 'subscriptionsTopic', {
            topicName: `SubscriptionsTopic-${stage}`,
            kmsMasterKeyId: this.subscriptionsKey.keyId,
        });

        this.restHookDLQ.addToResourcePolicy(
            new PolicyStatement({
                effect: Effect.DENY,
                actions: ['sqs:*'],
                resources: [this.restHookDLQ.queueArn],
                principals: [new StarPrincipal()],
                conditions: {
                    Bool: {
                        'aws:SecureTransport': 'false',
                    },
                },
            }),
        );

        this.restHookQueue.addToResourcePolicy(
            new PolicyStatement({
                effect: Effect.DENY,
                actions: ['sqs:*'],
                resources: [this.restHookQueue.queueArn],
                principals: [new StarPrincipal()],
                conditions: {
                    Bool: {
                        'aws:SecureTransport': false,
                    },
                },
            }),
        );
        this.restHookQueue.addToResourcePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['sqs:SendMessage'],
                resources: [this.restHookQueue.queueArn],
                principals: [new ServicePrincipal('sns.amazonaws.com')],
                conditions: {
                    ArnEquals: {
                        'aws:SourceArn': this.subscriptionsTopic.ref,
                    },
                },
            }),
        );

        this.restHookSubscription = new CfnSubscription(scope, 'restHookSubscription', {
            topicArn: this.subscriptionsTopic.ref,
            endpoint: this.restHookQueue.queueArn,
            protocol: 'sqs',
            filterPolicy: {
                channelType: ['rest-hook'],
            },
        });

        this.restHookLambdaRole = new Role(scope, 'restHookLambdaRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            inlinePolicies: {
                restHookLambdaPolicy: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['logs:CreateLogStream', 'logs:CreateLogGroup', 'logs:PutLogEvents'],
                            resources: [`arn:${partition}:logs:${region}:*:*`],
                        }),
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
                            resources: ['*'],
                        }),
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['kms:Decrypt'],
                            resources: [this.subscriptionsKey.keyArn],
                        }),
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['sqs:DeleteMessage', 'sqs:ReceiveMessage', 'sqs:GetQueueAttributes'],
                            resources: [this.restHookQueue.queueArn],
                        }),
                    ],
                }),
            },
        });
    }
}
