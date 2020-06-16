// eslint-disable-next-line import/no-extraneous-dependencies
import AWS from 'aws-sdk';

// @ts-ignore
import { exportCloudwatchLogs } from './handler';

// eslint-disable-next-line import/no-extraneous-dependencies
const AWSMock = require('aws-sdk-mock');

AWS.config.update({ region: 'us-east-1' });
AWSMock.setSDKInstance(AWS);

describe('exportCloudwatchLogs', () => {
    test('foo', async () => {
        AWSMock.mock('CloudWatchLogs', 'createExportTask', (params: any, callback: Function) => {
            console.log('Param Stuff', params.logGroupName);
            callback(null, { Items: [] });
        });
        AWSMock.mock('CloudWatch', 'putMetricData', (params: any, callback: Function) => {
            console.log('Param CloudWatch', params.MetricData);
            callback(null, { Items: [] });
        });
        await exportCloudwatchLogs();
        AWSMock.restore();
    });
});
