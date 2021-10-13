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
        PhysicalResourceId: 'implementationGuides',
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
    });
    console.log(`Sending response to CFN: ${responseBody}`);
    await axios.put(event.ResponseURL, responseBody);
};

/*
    Returns all `fileType` files in specified `directory` and sub-directories.
*/
const getFilesInDir = (directory: string, fileType: string, fileNamesAndPath) => {
    if (!fs.existsSync(directory)) {
        throw new Error(`directory not found: ${directory}`);
    }

    const files = fs.readdirSync(directory);
    let filePath = ``;
    for (let i = 0; i < files.length; i += 1) {
        filePath = `${directory}/${files[i]}`;
        if (fs.statSync(filePath).isDirectory()) {
            fileNamesAndPath = getFilesInDir(filePath, 'json', fileNamesAndPath);
        } else if (files[i].endsWith(fileType)) {
            const fileObj = { path: filePath, filename: files[i] };
            fileNamesAndPath.push(fileObj);
        }
    }
    return fileNamesAndPath;
};
/**
 * Custom resource lambda handler that uploads a specific file to s3.
 * Custom resource spec: See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources.html
 * @param event Custom resource request event. See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/crpg-ref-requests.html
 */
exports.handler = async (event: any) => {
    console.log(event);
    try {
        if (process.env.IMPLEMENTATION_GUIDES_BUCKET === undefined) {
            throw new Error('Missing env variable IMPLEMENTATION_GUIDES_BUCKET');
        }
        const s3 = new AWS.S3();
        if (event.RequestType === 'Create' || event.RequestType === 'Update') {
            await Promise.all(
                getFilesInDir('implementationGuides', 'json', []).map(entry => {
                    console.log(`uploading ${entry} to ${process.env.IMPLEMENTATION_GUIDES_BUCKET}`);
                    return s3
                        .putObject({
                            Bucket: process.env.IMPLEMENTATION_GUIDES_BUCKET,
                            Body: fs.readFileSync(entry.path),
                            Key: entry.filename,
                        })
                        .promise();
                }),
            );
            console.log(`upload successful`);
            await sendCfnResponse(event, 'SUCCESS');
        } else {
            console.log('Deleting files from s3');
            await Promise.all(
                getFilesInDir('implementationGuides', 'json', []).map(entry => {
                    console.log(`uploading ${entry.filename} to ${process.env.IMPLEMENTATION_GUIDES_BUCKET}`);
                    return s3
                        .deleteObject({
                            Bucket: process.env.IMPLEMENTATION_GUIDES_BUCKET,
                            Key: entry.filename,
                        })
                        .promise();
                }),
            );
            await sendCfnResponse(event, 'SUCCESS');
        }
    } catch (e) {
        console.log(e);
        await sendCfnResponse(event, 'FAILED', e);
    }
};
