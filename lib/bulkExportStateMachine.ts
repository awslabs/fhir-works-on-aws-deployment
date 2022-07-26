import { Duration } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import {
    TaskInput,
    Wait,
    WaitTime,
    Choice,
    Condition,
    Parallel,
    StateMachine,
    LogLevel,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

export default class BulkExportStateMachine {
    bulkExportStateMachine: StateMachine;

    constructor(
        scope: Construct,
        updateStatusLambdaFunction: Function,
        startExportJobLambdaFunction: Function,
        getExportJobLambdaFunction: Function,
        stopExportJobLambdaFunction: Function,
        stage: string,
    ) {
        const catchAllUpdateStatusToFailed = new LambdaInvoke(scope, 'catchAllUpdateStatusToFailed', {
            lambdaFunction: updateStatusLambdaFunction,
            payload: TaskInput.fromObject({
                'globalParams.$': '$',
                status: 'failed',
            }),
        });

        const updateStatusToFailed = new LambdaInvoke(scope, 'updateStatusToFailed', {
            lambdaFunction: updateStatusLambdaFunction,
            payload: TaskInput.fromObject({
                'globalParams.$': '$',
                status: 'failed',
            }),
        });

        const updateStatusToCanceled = new LambdaInvoke(scope, 'updateStatusToCanceled', {
            lambdaFunction: updateStatusLambdaFunction,
            payload: TaskInput.fromObject({
                'globalParams.$': '$',
                status: 'canceled',
            }),
        });

        const updateStatusToCompleted = new LambdaInvoke(scope, 'updateStatusToCompleted', {
            lambdaFunction: updateStatusLambdaFunction,
            payload: TaskInput.fromObject({
                'globalParams.$': '$',
                status: 'completed',
            }),
        });

        const stopExportJob = new LambdaInvoke(scope, 'stopExportJob', {
            lambdaFunction: stopExportJobLambdaFunction,
            outputPath: '$.Payload',
        }).next(updateStatusToCanceled);

        const waitForExportJob = new Wait(scope, 'waitForExportJob', {
            time: WaitTime.duration(Duration.seconds(10)),
        });

        const choiceOnJobStatus = new Choice(scope, 'choiceOnJobStatus')
            .when(Condition.booleanEquals('$.executionParameters.isCanceled', true), stopExportJob)
            .when(
                Condition.stringEquals('$.executionParameters.glueJobRunStatus', 'SUCCEEDED'),
                updateStatusToCompleted,
            )
            .when(Condition.stringEquals('$.executionParameters.glueJobRunStatus', 'STARTING'), waitForExportJob)
            .when(Condition.stringEquals('$.executionParameters.glueJobRunStatus', 'RUNNING'), waitForExportJob)
            .when(Condition.stringEquals('$.executionParameters.glueJobRunStatus', 'FAILED'), updateStatusToFailed)
            .when(Condition.stringEquals('$.executionParameters.glueJobRunStatus', 'TIMEOUT'), updateStatusToFailed)
            // STOPPING and STOPPED can only occur here if the job was forcefully stopped with a Glue API call from outside the FHIR server, so we treat it as failure
            .when(Condition.stringEquals('$.executionParameters.glueJobRunStatus', 'STOPPING'), updateStatusToFailed)
            .when(Condition.stringEquals('$.executionParameters.glueJobRunStatus', 'STOPPED'), updateStatusToFailed);

        const getJobStatus = new LambdaInvoke(scope, 'getJobStatus', {
            lambdaFunction: getExportJobLambdaFunction,
            outputPath: '$.Payload',
        }).next(choiceOnJobStatus);

        waitForExportJob.next(getJobStatus);

        const startExportJob = new LambdaInvoke(scope, 'startExportJob', {
            lambdaFunction: startExportJobLambdaFunction,
            outputPath: '$.Payload',
        }).next(waitForExportJob);

        const parallelHelper = new Parallel(scope, 'parallelHelper');
        parallelHelper.addCatch(catchAllUpdateStatusToFailed, {
            resultPath: '$.error',
        });
        parallelHelper.branch(startExportJob);

        this.bulkExportStateMachine = new StateMachine(scope, 'bulkExportStateMachine', {
            stateMachineName: `BulkExportStateMachine-${stage}`,
            definition: parallelHelper,
            tracingEnabled: true,
            logs: {
                level: LogLevel.ALL,
                destination: new LogGroup(scope, 'bulkExportStateMachineLogs', {
                    logGroupName: `BulkExportSM-Logs-${stage}`,
                }),
            },
        });
    }
}
