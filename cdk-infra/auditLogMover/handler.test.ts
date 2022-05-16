/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import AWS from 'aws-sdk';
// eslint-disable-next-line import/no-extraneous-dependencies
import sinon from 'sinon';
import moment from 'moment';
// eslint-disable-next-line import/no-extraneous-dependencies
import AWSMock from 'aws-sdk-mock';
// @ts-ignore
import { exportCloudwatchLogs, deleteCloudwatchLogs } from './handler';

AWSMock.setSDKInstance(AWS);

let putMetricDataSpy = sinon.spy();
function checkEmitMetrics(metricPrefix: string, isSuccessful: boolean) {
    expect(putMetricDataSpy.calledTwice).toBeTruthy();
    const actualPutMetricData = [];
    actualPutMetricData.push(putMetricDataSpy.getCall(0).args[0]);
    actualPutMetricData.push(putMetricDataSpy.getCall(1).args[0]);

    actualPutMetricData.sort((metricA: any, metricB: any) => {
        return metricA.MetricData[0].MetricName.localeCompare(metricB.MetricData[0].MetricName);
    });

    const expectedPutMetricData = [
        {
            MetricData: [
                {
                    MetricName: `${metricPrefix}-Succeeded`,
                    Unit: 'Count',
                    Value: isSuccessful ? 1 : 0,
                },
            ],
            Namespace: 'Audit-Log-Mover',
        },
        {
            MetricData: [
                {
                    MetricName: `${metricPrefix}-Failed`,
                    Unit: 'Count',
                    Value: isSuccessful ? 0 : 1,
                },
            ],
            Namespace: 'Audit-Log-Mover',
        },
    ];

    expectedPutMetricData.sort((metricA, metricB) => {
        return metricA.MetricData[0].MetricName.localeCompare(metricB.MetricData[0].MetricName);
    });

    for (let i = 0; i < actualPutMetricData.length; i += 1) {
        expect(actualPutMetricData[i]).toMatchObject(expectedPutMetricData[i]);
    }
}

describe('exportCloudwatchLogs', () => {
    let createExportTaskSpy = sinon.spy();
    afterEach(() => {
        createExportTaskSpy = sinon.spy();
        putMetricDataSpy = sinon.spy();
        AWSMock.restore();
    });

    beforeEach(() => {
        AWSMock.mock('CloudWatch', 'putMetricData', (params: any, callback: Function) => {
            putMetricDataSpy(params);
            callback(null, {});
        });
    });

    test('create export task succeed. exportCloudwatchLogs-Succeeded emit 1 and exportCloudwatchLogs-Failed emit 0', async () => {
        // BUILD
        AWSMock.mock('CloudWatchLogs', 'createExportTask', (params: any, callback: Function) => {
            createExportTaskSpy(params);
            callback(null, {});
        });

        // OPERATE
        await exportCloudwatchLogs();

        // CHECK
        expect(createExportTaskSpy.calledOnce).toBeTruthy();

        const sevenDaysAgo = moment.utc().subtract(7, 'days').format('YYYY-MM-DD');

        const expectedCreateExportParams = {
            destinationPrefix: sevenDaysAgo,
            taskName: `audit-log-export-${sevenDaysAgo}`,
        };

        const actualExportParam = createExportTaskSpy.getCall(0).args[0];
        expect(actualExportParam).toMatchObject(expectedCreateExportParams);

        checkEmitMetrics('exportCloudwatchLogs', true);
    });

    test('create export task failed. exportCloudwatchLogs-Succeeded emit 0 and exportCloudwatchLogs-Failed emit 1', async () => {
        // BUILD
        AWSMock.mock('CloudWatchLogs', 'createExportTask', (params: any, callback: Function) => {
            createExportTaskSpy(params);
            const error = {
                message: 'Failed to create export task',
            };
            callback(error, {});
        });

        try {
            // OPERATE
            expect.hasAssertions();
            await exportCloudwatchLogs();
        } catch (e) {
            // CHECK
            expect((e as any).message).toEqual('Failed to kick off all export tasks');
            expect(createExportTaskSpy.calledOnce).toBeTruthy();

            const sevenDaysAgo = moment.utc().subtract(7, 'days').format('YYYY-MM-DD');

            const params = {
                destinationPrefix: sevenDaysAgo,
                taskName: `audit-log-export-${sevenDaysAgo}`,
            };

            const actualExportParam = createExportTaskSpy.getCall(0).args[0];
            expect(actualExportParam).toMatchObject(params);

            expect(putMetricDataSpy.calledTwice).toBeTruthy();
            const actualPutMetricData = [];
            actualPutMetricData.push(putMetricDataSpy.getCall(0).args[0]);
            actualPutMetricData.push(putMetricDataSpy.getCall(1).args[0]);

            checkEmitMetrics('exportCloudwatchLogs', false);
        }
    });
});

describe('deleteCloudwatchLogs', () => {
    const logStreamName = '1b80d2ffe808890e47f94dc4adc5617a';
    afterEach(() => {
        putMetricDataSpy = sinon.spy();
        AWSMock.restore();
    });

    beforeEach(() => {
        AWSMock.mock('CloudWatch', 'putMetricData', (params: any, callback: Function) => {
            putMetricDataSpy(params);
            callback(null, {});
        });

        AWSMock.mock('CloudWatchLogs', 'describeLogStreams', (params: any, callback: Function) => {
            callback(null, {
                logStreams: [
                    {
                        logStreamName,
                        firstEventTimestamp: moment('2020-07-04').add(1, 'minutes').valueOf(),
                        lastEventTimestamp: moment('2020-07-04').add(2, 'minutes').valueOf(),
                    },
                ],
            });
        });
    });

    test('delete cloudwatch logs succeed. deleteCloudwatchLogs-Succeeded emit 1 and deleteCloudwatchLogs-Failed emit 0', async () => {
        // BUILD
        AWSMock.mock('S3', 'listObjectsV2', (params: any, callback: Function) => {
            callback(null, {
                CommonPrefixes: [
                    {
                        Prefix: '2020-07-04/',
                    },
                ],
            });
        });

        const deleteLogStreamsSpy = sinon.spy();
        AWSMock.mock('CloudWatchLogs', 'deleteLogStream', (params: any, callback: Function) => {
            deleteLogStreamsSpy(params);
            callback(null, {});
        });

        // OPERATE
        await deleteCloudwatchLogs({
            daysExported: ['2020-07-04'],
        });

        // CHECK
        const actualLogstreamDeleted = deleteLogStreamsSpy.getCall(0).args[0];
        expect(deleteLogStreamsSpy.calledOnce).toBeTruthy();
        expect(actualLogstreamDeleted).toMatchObject({ logStreamName });

        checkEmitMetrics('deleteCloudwatchLogs', true);
    });

    test('delete cloudwatch logs failed. deleteCloudwatchLogs-Succeeded emit 0 and deleteCloudwatchLogs-Failed emit 1', async () => {
        // BUILD
        AWSMock.mock('S3', 'listObjectsV2', (params: any, callback: Function) => {
            callback(null, {
                CommonPrefixes: [
                    {
                        Prefix: '2020-06-01/',
                    },
                ],
            });
        });
        try {
            // OPERATE
            await deleteCloudwatchLogs({
                daysExported: ['2020-07-04'],
            });
        } catch (e) {
            // CHECK
            expect((e as any).message).toEqual(
                'Failed to delete Cloudwatch Logs because some Cloudwatch Logs have not been exported to S3',
            );
            checkEmitMetrics('deleteCloudwatchLogs', false);
        }
    });
});
