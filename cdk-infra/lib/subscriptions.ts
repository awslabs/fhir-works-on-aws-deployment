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
import { CfnSubscription, CfnTopic, Subscription } from 'aws-cdk-lib/aws-sns';
import { CfnQueue, CfnQueuePolicy, Queue, QueuePolicy } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class SubscriptionsResources {
    subscriptionsKey: Key;

    restHookDLQ: CfnQueue;

    restHookQueue: CfnQueue;

    subscriptionsTopic: CfnTopic;

    restHookDLQPolicy: CfnQueuePolicy;

    restHookQueuePolicy: CfnQueuePolicy;

    restHookSubscription: CfnSubscription;

    restHookLambdaRole: Role;

    constructor(scope: Construct, region: string, partition: string) {
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

        this.restHookDLQ = new CfnQueue(scope, 'restHookDLQ', {
            kmsMasterKeyId: this.subscriptionsKey.keyId,
            messageRetentionPeriod: 1209600, // 14 days in seconds
        });

        this.restHookQueue = new CfnQueue(scope, 'restHookQueue', {
            kmsMasterKeyId: this.subscriptionsKey.keyId,
            redrivePolicy: {
                deadLetterTargetArn: this.restHookDLQ.attrArn,
                maxReceiveCount: 2,
            },
        });

        this.subscriptionsTopic = new CfnTopic(scope, 'subscriptionsTopic', {
            topicName: 'SubscriptionsTopic',
            kmsMasterKeyId: this.subscriptionsKey.keyId,
        });

        this.restHookDLQPolicy = new CfnQueuePolicy(scope, 'restHookDLQPolicy', {
            queues: [this.restHookDLQ.ref],
            policyDocument: new PolicyDocument({
                statements: [
                    new PolicyStatement({
                        effect: Effect.DENY,
                        actions: ['SQS:*'],
                        resources: [this.restHookDLQ.attrArn],
                        principals: [new StarPrincipal()],
                        conditions: {
                            Bool: {
                                'aws:SecureTransport': false,
                            },
                        },
                    }),
                ],
            }),
        });

        this.restHookQueuePolicy = new CfnQueuePolicy(scope, 'restHookQueuePolicy', {
            queues: [this.restHookQueue.ref],
            policyDocument: new PolicyDocument({
                statements: [
                    new PolicyStatement({
                        effect: Effect.DENY,
                        actions: ['SQS:*'],
                        resources: [this.restHookQueue.attrArn],
                        principals: [new StarPrincipal()],
                        conditions: {
                            Bool: {
                                'aws:SecureTransport': false,
                            },
                        },
                    }),
                    new PolicyStatement({
                        effect: Effect.ALLOW,
                        actions: ['SQS:SendMessage'],
                        resources: [this.restHookQueue.attrArn],
                        principals: [new ServicePrincipal('sns.amazonaws.com')],
                        conditions: {
                            ArnEquals: {
                                'aws:SourceArn': this.subscriptionsTopic.ref,
                            },
                        },
                    }),
                ],
            }),
        });

        this.restHookSubscription = new CfnSubscription(scope, 'restHookSubscription', {
            topicArn: this.subscriptionsTopic.ref,
            endpoint: this.restHookQueue.attrArn,
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
                            actions: ['xray:PutTraceSegments', 'scray:PutTelemetryRecords'],
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
                            resources: [this.restHookQueue.attrArn],
                        }),
                    ],
                }),
            },
        });
    }
}
