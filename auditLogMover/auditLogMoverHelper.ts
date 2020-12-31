/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import AWS from 'aws-sdk';
import moment from 'moment';
import { ListObjectsV2Output } from 'aws-sdk/clients/s3';

export interface LogStreamType {
    logStreamName: string;
    firstEventTimestamp: number;
    lastEventTimestamp: number;
}

export class AuditLogMoverHelper {
    static async doesEachDayHaveS3Directory(eachDayInTimeFrame: string[], auditLogBucket: string) {
        const yearAndMonthPrefixOfDates = Array.from(
            new Set(
                eachDayInTimeFrame.map(date => {
                    return date.substring(0, 7); // Only grab the year and month
                }),
            ),
        );
        const directoriesInS3 = await this.getDirectoriesInS3GivenPrefixes(yearAndMonthPrefixOfDates, auditLogBucket);

        const dateWithoutDirectory = eachDayInTimeFrame.filter(date => !directoriesInS3.includes(date));

        return dateWithoutDirectory.length === 0;
    }

    static getEachDayInTimeFrame(startTimeMoment: moment.Moment, endTimeMoment: moment.Moment): moment.Moment[] {
        if (startTimeMoment.isAfter(endTimeMoment)) {
            throw new Error('startTime can not be later than endTime');
        }
        const eachDayInTimeFrame: moment.Moment[] = [];

        let currentTimeMoment = moment(startTimeMoment);
        do {
            eachDayInTimeFrame.push(moment(currentTimeMoment));
            currentTimeMoment = currentTimeMoment.add(1, 'days');
        } while (currentTimeMoment.valueOf() < endTimeMoment.valueOf());

        return eachDayInTimeFrame;
    }

    private static async getDirectoriesInS3GivenPrefixes(prefixes: string[], auditLogBucket: string) {
        const S3 = new AWS.S3();
        const listS3Responses: ListObjectsV2Output[] = await Promise.all(
            prefixes.map(prefix => {
                const s3params: any = {
                    Bucket: auditLogBucket,
                    MaxKeys: 31,
                    Delimiter: '/',
                    Prefix: prefix,
                };
                return S3.listObjectsV2(s3params).promise();
            }),
        );

        const directoriesInS3: string[] = [];
        listS3Responses.forEach((response: ListObjectsV2Output) => {
            if (response.CommonPrefixes) {
                response.CommonPrefixes.forEach(commonPrefix => {
                    // Format of Prefix is 2020-07-04/
                    // Therefore we need to remove the '/' at the end
                    if (commonPrefix.Prefix) {
                        directoriesInS3.push(commonPrefix.Prefix.slice(0, -1));
                    }
                });
            }
        });

        return directoriesInS3;
    }

    static async getAllLogStreams(cwLogExecutionGroup: string): Promise<LogStreamType[]> {
        const params: any = {
            logGroupName: cwLogExecutionGroup,
            orderBy: 'LastEventTime',
            descending: true,
            limit: 50,
        };
        const logStreams: LogStreamType[] = [];

        let nextToken = '';
        do {
            if (nextToken) {
                params.nextToken = nextToken;
            }
            const cloudwatchLogs = new AWS.CloudWatchLogs();
            // eslint-disable-next-line no-await-in-loop
            const describeResponse = await cloudwatchLogs.describeLogStreams(params).promise();
            if (describeResponse.logStreams && describeResponse.logStreams.length > 0) {
                describeResponse.logStreams.forEach((logStream: any) => {
                    logStreams.push({
                        logStreamName: logStream.logStreamName,
                        firstEventTimestamp: logStream.firstEventTimestamp,
                        lastEventTimestamp: logStream.lastEventTimestamp,
                    });
                });
            }
            nextToken = describeResponse.nextToken || '';
        } while (nextToken);

        return logStreams;
    }

    static async putCWMetric(stage: string, functionName: string, isSuccessful: boolean) {
        const putMetricDataPromises = [];
        if (isSuccessful) {
            // Mark a value of value of 1 for metric marking success and a value of 0 for metric marking failure
            putMetricDataPromises.push(this.getMetricDataPromise(stage, functionName, true, 1));
            putMetricDataPromises.push(this.getMetricDataPromise(stage, functionName, false, 0));
        } else {
            putMetricDataPromises.push(this.getMetricDataPromise(stage, functionName, true, 0));
            putMetricDataPromises.push(this.getMetricDataPromise(stage, functionName, false, 1));
        }

        try {
            await Promise.all(putMetricDataPromises);
        } catch (e) {
            console.error('Failed to putCWMetric', e);
        }
    }

    private static async getMetricDataPromise(
        stage: string,
        functionName: string,
        isSuccessful: boolean,
        metricValue: number,
    ) {
        const MetricName = `${functionName}-${isSuccessful ? 'Succeeded' : 'Failed'}`;
        const params: any = {
            MetricData: [
                {
                    MetricName,
                    Dimensions: [
                        {
                            Name: 'Stage',
                            Value: stage,
                        },
                    ],
                    StorageResolution: 60,
                    Timestamp: new Date(),
                    Unit: 'Count',
                    Value: metricValue,
                },
            ],
            Namespace: 'Audit-Log-Mover',
        };
        const cloudwatch = new AWS.CloudWatch();
        return cloudwatch.putMetricData(params).promise();
    }
}
