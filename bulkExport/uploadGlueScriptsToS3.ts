/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as AWS from 'aws-sdk';
import axios from 'axios';

const sendCfnResponse = async (event: any, status: 'SUCCESS' | 'FAILED', error?: Error) => {
    const responseBody = JSON.stringify({
        Status: status,
        Reason: error?.message,
        // The value of PhysicalResourceId doesn't really matter in this case.
        // It just needs to be the same string on all responses to indicate that it is the same resource.
        PhysicalResourceId: 'glueScripts',
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
    });
    console.log(`Sending response to CFN: ${responseBody}`);
    await axios.put(event.ResponseURL, responseBody);
};
/**
 * Custom resource lambda handler that uploads a specific file to s3.
 * Custom resource spec: See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources.html
 * @param event Custom resource request event. See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/crpg-ref-requests.html
 */
exports.handler = async (event: any) => {
    console.log(event);
    try {
        if (process.env.GLUE_SCRIPTS_BUCKET === undefined) {
            throw new Error('Missing env variable GLUE_SCRIPTS_BUCKET');
        }
        const s3 = new AWS.S3();
        const filename = 'export-script.py';
        const path = `bulkExport/glueScripts/${filename}`;

        if (event.RequestType === 'Create' || event.RequestType === 'Update') {
            console.log(`uploading ${filename} to ${process.env.GLUE_SCRIPTS_BUCKET}`);
            await s3
                .putObject({
                    Bucket: process.env.GLUE_SCRIPTS_BUCKET,
                    Body: fs.readFileSync(path),
                    Key: filename,
                })
                .promise();
            console.log('upload successful');
            await sendCfnResponse(event, 'SUCCESS');
        } else {
            console.log('Deleting files from s3');
            await s3
                .deleteObject({
                    Bucket: process.env.GLUE_SCRIPTS_BUCKET,
                    Key: filename,
                })
                .promise();
            await sendCfnResponse(event, 'SUCCESS');
        }
    } catch (e) {
        console.log(e);
        await sendCfnResponse(event, 'FAILED', e);
    }
};
