import { Duration } from 'aws-cdk-lib';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Alarm, ComparisonOperator, Metric, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Effect, PolicyDocument, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Domain } from 'aws-cdk-lib/aws-opensearchservice';
import { CfnTopicPolicy, Topic } from 'aws-cdk-lib/aws-sns';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export default class AlarmsResource {
    constructor(
        scope: Construct,
        stage: string,
        ddbToEsLambdaFunction: Function,
        snsKMSKey: Key,
        ddbToEsDLQ: Queue,
        fhirServerLambdaFunction: Function,
        apiGatewayRestApi: RestApi,
        stackName: string,
        account: string,
        elasticSearchDomain: Domain,
        isDev: boolean,
    ) {
        const fhirWorksAlarmSNSTopic = new Topic(scope, 'fhirWorksAlarmSNSTopic', {
            displayName: `FhirSolution-${stage}-cloudwatch-alarm-topic`,
            masterKey: snsKMSKey,
        });

        const fhirWorksAlarmSNSTopicPolicy = new CfnTopicPolicy(scope, 'fhirWorksAlarmSNSTopicPolicy', {
            policyDocument: new PolicyDocument({
                statements: [
                    new PolicyStatement({
                        sid: 'FhirWorksAlarmSNSTopicPolicy',
                        effect: Effect.ALLOW,
                        principals: [new ServicePrincipal('cloudwatch.amazonaws.com')],
                        actions: ['sns:Publish'],
                        resources: [fhirWorksAlarmSNSTopic.topicArn],
                    }),
                ],
            }),
            topics: [fhirWorksAlarmSNSTopic.topicArn],
        });
        fhirWorksAlarmSNSTopicPolicy.node.addDependency(fhirWorksAlarmSNSTopic);

        const ddbtoEsErrorAlarm = new Alarm(scope, 'ddbToEsErrorAlarm', {
            alarmDescription:
                'Alarm when the Stream errors is more than 1 unit for 15 minutes out of the past 25 minutes. Streams do have retry logic',
            alarmName: `FhirSolution.${stage}.High.DDBToESLambdaErrorAlarm`,
            actionsEnabled: false,
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            evaluationPeriods: 5,
            datapointsToAlarm: 3,
            metric: new Metric({
                metricName: 'Errors',
                namespace: 'AWS/Lambda',
                dimensionsMap: {
                    FunctionName: `${ddbToEsLambdaFunction.functionName}`,
                },
                period: Duration.seconds(300),
                statistic: 'Sum',
            }),
            threshold: 1,
            treatMissingData: TreatMissingData.NOT_BREACHING,
        });
        ddbtoEsErrorAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
        ddbtoEsErrorAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));

        const ddbToEsIteratorAgeAlarm = new Alarm(scope, 'ddbToEsIteratorAgeAlarm', {
            alarmDescription: 'Alarm if the oldest record in the batch when processed was older than 1 minute.',
            alarmName: `FhirSolution.${stage}.High.DDBToESIteratorAgeAlarm`,
            actionsEnabled: false,
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            evaluationPeriods: 1,
            datapointsToAlarm: 1,
            metric: new Metric({
                metricName: 'IteratorAge',
                dimensionsMap: {
                    FunctionName: `${ddbToEsLambdaFunction.functionName}`,
                },
                namespace: 'AWS/Lambda',
                period: Duration.seconds(300),
                statistic: 'Average',
            }),
            threshold: 60,
            treatMissingData: TreatMissingData.NOT_BREACHING,
        });
        ddbToEsIteratorAgeAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));
        ddbToEsIteratorAgeAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));

        const ddbToEsDLQDepthAlarm = new Alarm(scope, 'ddbToEsDLQDepthAlarm', {
            alarmDescription: 'Alarm if queue depth increases to >= 1 messages',
            alarmName: `FhirSolution.${stage}.High.DDBToESDLQDepthAlarm`,
            actionsEnabled: false,
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods: 1,
            metric: new Metric({
                metricName: 'ApproximateNumberOfMessagesVisible',
                dimensionsMap: {
                    QueueName: `${ddbToEsDLQ.queueName}`,
                },
                namespace: 'AWS/SQS',
                period: Duration.seconds(300),
                statistic: 'Sum',
            }),
            threshold: 0,
        });
        ddbToEsDLQDepthAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));
        ddbToEsDLQDepthAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));

        const fhirLambdaErrorAlarm = new Alarm(scope, 'fhirLambdaErrorAlarm', {
            alarmDescription: 'Alarm when Fhir errors is more than 1',
            alarmName: `FhirSolution.${stage}.High.FhirLambdaErrorAlarm`,
            actionsEnabled: false,
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            evaluationPeriods: 1,
            metric: new Metric({
                metricName: 'Errors',
                dimensionsMap: {
                    FunctionName: fhirServerLambdaFunction.functionName,
                },
                namespace: 'AWS/Lambda',
                period: Duration.seconds(300),
                statistic: 'Sum',
            }),
            threshold: 1,
            treatMissingData: TreatMissingData.NOT_BREACHING,
        });
        fhirLambdaErrorAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));
        fhirLambdaErrorAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));

        const fhirLambdaLatencyAlarm = new Alarm(scope, 'fhirLambdaLatencyAlarm', {
            alarmDescription: 'Alarm when Fhir average is more than 2.5s; 2 times',
            alarmName: `FhirSolution.${stage}.Low.FhirLambdaLatencyAlarm`,
            actionsEnabled: false,
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            evaluationPeriods: 5,
            datapointsToAlarm: 2,
            metric: new Metric({
                metricName: 'Duration',
                dimensionsMap: {
                    FunctionName: fhirServerLambdaFunction.functionName,
                },
                namespace: 'AWS/Lambda',
                period: Duration.seconds(60),
                statistic: 'Average',
            }),
            threshold: 2500,
            treatMissingData: TreatMissingData.NOT_BREACHING,
        });
        fhirLambdaLatencyAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
        fhirLambdaLatencyAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));

        const apiGateway5XXErrorAlarm = new Alarm(scope, 'apiGateway5XXErrorAlarm', {
            alarmDescription: 'Alarm when API Gateway has more than 1 5xx errors; 3 times',
            alarmName: `FhirSolution.${stage}.High.ApiGateway5XXErrorAlarm`,
            actionsEnabled: false,
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            evaluationPeriods: 5,
            datapointsToAlarm: 3,
            metric: new Metric({
                metricName: '5XXError',
                dimensionsMap: {
                    ApiName: `${stage}-${stackName}`,
                },
                namespace: 'AWS/ApiGateway',
                period: Duration.seconds(300),
                statistic: 'Sum',
            }),
            threshold: 1,
            treatMissingData: TreatMissingData.NOT_BREACHING,
        });
        apiGateway5XXErrorAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
        apiGateway5XXErrorAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));
        apiGateway5XXErrorAlarm.node.addDependency(apiGatewayRestApi);

        const apiGateway4XXErrorAlarm = new Alarm(scope, 'apiGateway4XXErrorAlarm', {
            alarmDescription: 'Alarm when API Gateway has more 1 4xx errors; 3 times',
            alarmName: `FhirSolution.${stage}.Low.ApiGateway4XXErrorAlarm`,
            actionsEnabled: false,
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            evaluationPeriods: 5,
            datapointsToAlarm: 3,
            metric: new Metric({
                metricName: '4XXError',
                dimensionsMap: {
                    ApiName: `${stage}-${stackName}`,
                },
                namespace: 'AWS/ApiGateway',
                period: Duration.seconds(300),
                statistic: 'Sum',
            }),
            threshold: 1,
            treatMissingData: TreatMissingData.NOT_BREACHING,
        });
        apiGateway4XXErrorAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
        apiGateway4XXErrorAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));
        apiGateway4XXErrorAlarm.node.addDependency(apiGatewayRestApi);

        const apiGatewayLatencyAlarm = new Alarm(scope, 'apiGatewayLatencyAlarm', {
            alarmDescription: 'Alarm when API Gatway average latency is more than 3s; 2 times',
            alarmName: `FhirSolution.${stage}.Low.ApiGatewayLatencyAlarm`,
            actionsEnabled: false,
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            evaluationPeriods: 5,
            datapointsToAlarm: 2,
            metric: new Metric({
                metricName: 'Latency',
                dimensionsMap: {
                    ApiName: `${stage}-${stackName}`,
                },
                namespace: 'AWS/ApiGateway',
                period: Duration.seconds(60),
                statistic: 'Average',
            }),
            threshold: 3000,
            treatMissingData: TreatMissingData.NOT_BREACHING,
        });
        apiGatewayLatencyAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
        apiGatewayLatencyAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));
        apiGatewayLatencyAlarm.node.addDependency(apiGatewayRestApi);

        const clusterStatusRedAlarm = new Alarm(scope, 'clusterStatusRedAlarm', {
            alarmName: `FhirSolution.${stage}.High.FhirESClusterStatusRedAlarm`,
            alarmDescription:
                'Primary and replica shards of at least one index are not allocated to nodes in a cluster.',
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods: 5,
            datapointsToAlarm: 3,
            metric: new Metric({
                metricName: 'ClusterStatus.red',
                dimensionsMap: {
                    ClientId: account,
                    DomainName: elasticSearchDomain.domainName,
                },
                namespace: 'AWS/ES',
                period: Duration.seconds(60),
                statistic: 'Maximum',
            }),
            threshold: 0,
        });
        clusterStatusRedAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
        clusterStatusRedAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));

        const clusterStatusYellowAlarm = new Alarm(scope, 'clusterStatusYellowAlarm', {
            alarmName: `FhirSolution.${stage}.Low.FhirESClusterStatusYellowAlarm`,
            alarmDescription: 'Replica shards for at least one index are not allocated to 2 nodes in a cluster.',
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods: 5,
            datapointsToAlarm: 3,
            metric: new Metric({
                metricName: 'ClusterStatus.yellow',
                dimensionsMap: {
                    ClientId: account,
                    DomainName: elasticSearchDomain.domainName,
                },
                namespace: 'AWS/ES',
                period: Duration.seconds(60),
                statistic: 'Maximum',
            }),
            threshold: 0,
        });
        clusterStatusYellowAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
        clusterStatusYellowAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));

        const clusterCPUUtilizationTooHighAlarm = new Alarm(scope, 'clusterCPUUtilizationTooHighAlarm', {
            alarmName: `FhirSolution.${stage}.High.FhirESClusterCPUUtilAlarm`,
            alarmDescription: 'Average CPU utilization over last 10 minutes too high.',
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods: 1,
            metric: new Metric({
                metricName: 'CPUUtilization',
                dimensionsMap: {
                    ClientId: account,
                    DomainName: elasticSearchDomain.domainName,
                },
                namespace: 'AWS/ES',
                period: Duration.seconds(600),
                statistic: 'Average',
            }),
            threshold: 80,
        });
        clusterCPUUtilizationTooHighAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
        clusterCPUUtilizationTooHighAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));

        if (!isDev) {
            const clusterMasterCPUUtilizationTooHighAlarm = new Alarm(
                scope,
                'clusterMasterCPUUtilizationTooHighAlarm',
                {
                    alarmName: `FhirSolution.${stage}.Low.FhirESClusterMasterCPUUtilAlarm`,
                    alarmDescription: 'Average CPU utilization over last 10 minutes too high.',
                    comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
                    evaluationPeriods: 1,
                    metric: new Metric({
                        metricName: 'MasterCPUUtilization',
                        dimensionsMap: {
                            ClientId: account,
                            DomainName: elasticSearchDomain.domainName,
                        },
                        namespace: 'AWS/ES',
                        period: Duration.seconds(600),
                        statistic: 'Average',
                    }),
                    threshold: 50,
                },
            );
            clusterMasterCPUUtilizationTooHighAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
            clusterMasterCPUUtilizationTooHighAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));

            const clusterMasterJVMMemoryPressureTooHighAlarm = new Alarm(
                scope,
                'clusterMasterJVMMemoryPressureTooHighAlarm',
                {
                    alarmName: `FhirSolution.${stage}.Low.FhirESClusterMasterJVMMemoryAlarm`,
                    alarmDescription: 'Average JVM memory pressure over last 10 minutes too high.',
                    comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
                    evaluationPeriods: 1,
                    metric: new Metric({
                        metricName: 'MasterJVMMemoryPressure',
                        dimensionsMap: {
                            ClientId: account,
                            DomainName: elasticSearchDomain.domainName,
                        },
                        namespace: 'AWS/ES',
                        period: Duration.seconds(600),
                        statistic: 'Average',
                    }),
                    threshold: 80,
                },
            );
            clusterMasterJVMMemoryPressureTooHighAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
            clusterMasterJVMMemoryPressureTooHighAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));

            const clusterMasterNotReachableFromNodeAlarm = new Alarm(scope, 'clusterMasterNotReachableFromNodeAlarm', {
                alarmName: `FhirSolution.${stage}.Low.FhirESClusterMasterNotReachableFromNodeAlarm`,
                alarmDescription:
                    'Master node stopped or not reachable. Usually the result of a network connectivity issue or AWS dependency problem.',
                comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
                evaluationPeriods: 5,
                metric: new Metric({
                    metricName: 'MasterReachableFromNode',
                    dimensionsMap: {
                        ClientId: account,
                        DomainName: elasticSearchDomain.domainName,
                    },
                    namespace: 'AWS/ES',
                    period: Duration.seconds(60),
                    statistic: 'Minimum',
                }),
                threshold: 1,
            });
            clusterMasterNotReachableFromNodeAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
            clusterMasterNotReachableFromNodeAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));

            const clusterAutomatedSnapshotFailureTooHighAlarm = new Alarm(
                scope,
                'clusterAutomatedSnapshotFailureTooHighAlarm',
                {
                    alarmName: `FhirSolution.${stage}.Low.FhirESClusterSnapshotFailureAlarm`,
                    alarmDescription: 'No automated snapshot was taken for the domain in the previous 36 hours.',
                    comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
                    evaluationPeriods: 1,
                    metric: new Metric({
                        metricName: 'AutomatedSnapshotFailure',
                        dimensionsMap: {
                            ClientId: account,
                            DomainName: elasticSearchDomain.domainName,
                        },
                        namespace: 'AWS/ES',
                        period: Duration.seconds(60),
                        statistic: 'Maximum',
                    }),
                    threshold: 0,
                },
            );
            clusterAutomatedSnapshotFailureTooHighAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
            clusterAutomatedSnapshotFailureTooHighAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));
        }

        const clusterFreeStorageSpaceTooLowAlarm = new Alarm(scope, 'clusterFreeStorageSpaceTooLowAlarm', {
            alarmName: `FhirSolution.${stage}.Low.FhirESClusterFreeStorageSpaceTooLowAlarm`,
            alarmDescription: 'Cluster is running out of storage space.',
            comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
            evaluationPeriods: 1,
            metric: new Metric({
                metricName: 'FreeStorageSpace',
                dimensionsMap: {
                    ClientId: account,
                    DomainName: elasticSearchDomain.domainName,
                },
                namespace: 'AWS/ES',
                period: Duration.seconds(60),
                statistic: 'Minimum',
            }),
            threshold: isDev ? 2500 : 22500, // in MB; aiming for alarm at 25% remaining
        });
        clusterFreeStorageSpaceTooLowAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
        clusterFreeStorageSpaceTooLowAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));

        const clusterIndexWritesBlockedTooHighAlarm = new Alarm(scope, 'clusterIndexWritesBlockedTooHighAlarm', {
            alarmName: `FhirSolution.${stage}.Low.FhirESClusterIndexWRitesBlockedTooHighAlarm`,
            alarmDescription: 'Cluster is blocking incoming write requests.',
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods: 1,
            metric: new Metric({
                metricName: 'ClusterIndexWritesBlocked',
                dimensionsMap: {
                    ClientId: account,
                    DomainName: elasticSearchDomain.domainName,
                },
                namespace: 'AWS/ES',
                period: Duration.seconds(60),
                statistic: 'Maximum',
            }),
            threshold: 0,
        });
        clusterIndexWritesBlockedTooHighAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
        clusterIndexWritesBlockedTooHighAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));

        const clusterJVMMemoryPressureTooHighAlarm = new Alarm(scope, 'clusterJVMMemoryPressureTooHighAlarm', {
            alarmName: `FhirSolution.${stage}.Low.FhirESClusterJVMMemoryAlarm`,
            alarmDescription: 'Average JVM memory pressure over last 10 minutes too high.',
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods: 1,
            metric: new Metric({
                metricName: 'JVMMemoryPressure',
                dimensionsMap: {
                    ClientId: account,
                    DomainName: elasticSearchDomain.domainName,
                },
                namespace: 'AWS/ES',
                period: Duration.seconds(600),
                statistic: 'Average',
            }),
            threshold: 80,
        });
        clusterJVMMemoryPressureTooHighAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
        clusterJVMMemoryPressureTooHighAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));

        const clusterKMSKeyErrorAlarm = new Alarm(scope, 'clusterKMSKeyErrorAlarm', {
            alarmName: `FhirSolution.${stage}.High.FhirESClusterKMSErrorAlarm`,
            alarmDescription: 'KMS customer master key used to encrypt data at rest has been disabled.',
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods: 1,
            metric: new Metric({
                metricName: 'KMSKeyError',
                dimensionsMap: {
                    ClientId: account,
                    DomainName: elasticSearchDomain.domainName,
                },
                namespace: 'AWS/ES',
                period: Duration.seconds(60),
                statistic: 'Maximum',
            }),
            threshold: 0,
        });
        clusterKMSKeyErrorAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
        clusterKMSKeyErrorAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));

        const clusterKMSKeyInaccessibleAlarm = new Alarm(scope, 'clusterKMSKeyInaccessibleAlarm', {
            alarmName: `FhirSolution.${stage}.High.FhirESClusterKMSInaccessibleAlarm`,
            alarmDescription:
                'KMS customer master key used to encrypt data at rest has been deleted or revoked its grants to Amazon ES.',
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods: 1,
            metric: new Metric({
                metricName: 'KMSKeyInaccessible',
                dimensionsMap: {
                    ClientId: account,
                    DomainName: elasticSearchDomain.domainName,
                },
                namespace: 'AWS/ES',
                period: Duration.seconds(60),
                statistic: 'Maximum',
            }),
            threshold: 0,
        });
        clusterKMSKeyInaccessibleAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
        clusterKMSKeyInaccessibleAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));

        if (isDev) {
            const clusterKibanaHealthyNodesTooLowAlarm = new Alarm(scope, 'clusterKibanaHealthyNodesTooLowAlarm', {
                alarmName: `FhirSolution.${stage}.Low.FhirESClusterKibanaAlarm`,
                alarmDescription: 'Kibana is inaccessible.',
                comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
                evaluationPeriods: 5,
                datapointsToAlarm: 3,
                metric: new Metric({
                    metricName: 'KibanaHealthyNodes',
                    dimensionsMap: {
                        ClientId: account,
                        DomainName: elasticSearchDomain.domainName,
                    },
                    namespace: 'AWS/ES',
                    period: Duration.seconds(60),
                    statistic: 'Minimum',
                }),
                threshold: 1,
            });
            clusterKibanaHealthyNodesTooLowAlarm.addOkAction(new SnsAction(fhirWorksAlarmSNSTopic));
            clusterKibanaHealthyNodesTooLowAlarm.addAlarmAction(new SnsAction(fhirWorksAlarmSNSTopic));
        }
    }
}
