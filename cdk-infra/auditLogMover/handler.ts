/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import moment from 'moment';
import AWS from 'aws-sdk';
import { LogStreamType, AuditLogMoverHelper } from './auditLogMoverHelper';

const CLOUDWATCH_EXECUTION_LOG_GROUP = process.env.CLOUDWATCH_EXECUTION_LOG_GROUP || '';
const AUDIT_LOG_BUCKET = process.env.AUDIT_LOGS_BUCKET || 'FAKE_AUDIT_LOG_BUCKET';
const STAGE: string = process.env.STAGE || '';

const DATE_FORMAT = 'YYYY-MM-DD';
const NUMBER_OF_DAYS_KEEP_CWLOGS_BEFORE_ARCHIVING = 7;
/*
exportCloudwatchLogs and deleteCloudwatchLogs will be called by a stepFunction.
The stepFunction work flow is described below
    exportLog => waitFor2Hours => deleteLog
 */

exports.exportCloudwatchLogs = async () => {
    // CWLogs needs to be initialized inside the function for 'aws-sdk-mock' to mock this object correctly during
    // unit testing
    const cloudwatchLogs = new AWS.CloudWatchLogs();
    const beginTimeMoment = moment.utc().subtract(NUMBER_OF_DAYS_KEEP_CWLOGS_BEFORE_ARCHIVING, 'days').startOf('day');
    const endTimeMoment = beginTimeMoment.endOf('day');

    const eachDayInTimeFrame: moment.Moment[] = AuditLogMoverHelper.getEachDayInTimeFrame(
        beginTimeMoment,
        endTimeMoment,
    );

    const exportTaskPromises: any[] = [];
    const daysExported: string[] = [];
    eachDayInTimeFrame.forEach((dayAsMoment) => {
        const dateStringOfDayExported = dayAsMoment.format(DATE_FORMAT);
        const params: any = {
            destination: AUDIT_LOG_BUCKET,
            from: dayAsMoment.startOf('day').valueOf(),
            logGroupName: CLOUDWATCH_EXECUTION_LOG_GROUP,
            to: dayAsMoment.endOf('day').valueOf(), // timeInMs
            destinationPrefix: dateStringOfDayExported,
            taskName: `audit-log-export-${dateStringOfDayExported}`,
        };
        daysExported.push(dateStringOfDayExported);
        exportTaskPromises.push(cloudwatchLogs.createExportTask(params).promise());
    });

    try {
        await Promise.all(exportTaskPromises);
        await AuditLogMoverHelper.putCWMetric(STAGE, 'exportCloudwatchLogs', true);
        return {
            daysExported,
            message: 'Successfully kicked off export tasks',
        };
    } catch (e) {
        await AuditLogMoverHelper.putCWMetric(STAGE, 'exportCloudwatchLogs', false);
        const message = 'Failed to kick off all export tasks';
        console.error(message, e);
        throw new Error(message);
    }
};

exports.deleteCloudwatchLogs = async (event: any) => {
    // CWLogs needs to be initialized inside the function for 'aws-sdk-mock' to mock this object correctly during
    // unit testing
    const cloudwatchLogs = new AWS.CloudWatchLogs();
    const logStreams: LogStreamType[] = await AuditLogMoverHelper.getAllLogStreams(CLOUDWATCH_EXECUTION_LOG_GROUP);
    // In the step function, 'deleteCloudwatchLogs' gets a list of daysExported from 'exportCloudwatchLogs'
    const eachDayInTimeFrame = event.daysExported;

    const eachDayHaveS3Directory = await AuditLogMoverHelper.doesEachDayHaveS3Directory(
        eachDayInTimeFrame,
        AUDIT_LOG_BUCKET,
    );

    if (!eachDayHaveS3Directory) {
        await AuditLogMoverHelper.putCWMetric(STAGE, 'deleteCloudwatchLogs', false);
        const message = 'Failed to delete Cloudwatch Logs because some Cloudwatch Logs have not been exported to S3';
        throw new Error(message);
    }

    const firstDayInTimeFrame = eachDayInTimeFrame[0];
    const lastDayInTimeFrame = eachDayInTimeFrame[eachDayInTimeFrame.length - 1];
    const beginTimeMoment = moment(firstDayInTimeFrame).startOf('day');
    const endTimeMoment = moment(lastDayInTimeFrame).endOf('day');
    const logStreamsToDelete = logStreams.filter((logStream) => {
        return (
            logStream.firstEventTimestamp >= beginTimeMoment.valueOf() &&
            logStream.lastEventTimestamp <= endTimeMoment.valueOf()
        );
    });

    const deleteLogstreamPromises: any[] = [];
    logStreamsToDelete.forEach((logStream) => {
        const params: any = {
            logGroupName: CLOUDWATCH_EXECUTION_LOG_GROUP,
            logStreamName: logStream.logStreamName,
        };
        deleteLogstreamPromises.push(cloudwatchLogs.deleteLogStream(params).promise());
    });

    try {
        await Promise.all(deleteLogstreamPromises);
        await AuditLogMoverHelper.putCWMetric(STAGE, 'deleteCloudwatchLogs', true);
        return {
            message: `Successfully deleted old log streams from ${firstDayInTimeFrame} to ${lastDayInTimeFrame}`,
        };
    } catch (e) {
        await AuditLogMoverHelper.putCWMetric(STAGE, 'deleteCloudwatchLogs', false);
        const message = 'Failed to delete Cloudwatch Logs because of error';
        throw new Error(message);
    }
};
