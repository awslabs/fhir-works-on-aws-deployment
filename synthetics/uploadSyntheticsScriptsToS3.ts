/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import * as AWS from 'aws-sdk';
import axios from 'axios';
import * as AdmZip from 'adm-zip';

const sendCfnResponse = async (event: any, status: 'SUCCESS' | 'FAILED', error?: Error) => {
    const responseBody = JSON.stringify({
        Status: status,
        Reason: error?.message,
        // The value of PhysicalResourceId doesn't really matter in this case.
        // It just needs to be the same string on all responses to indicate that it is the same resource.
        PhysicalResourceId: 'syntheticsScripts',
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
    });
    console.log(`Sending response to CFN: ${responseBody}`);
    await axios.put(event.ResponseURL, responseBody);
};

/**
 * Custom resource lambda handler that uploads synthetic canary scripts to s3
 * Custom resource spec: See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources.html
 * @param event Custom resource request event. See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/crpg-ref-requests.html
 */
exports.handler = async (event: any) => {
    console.log(event);
    try {
        if (process.env.SYNTHETICS_SCRIPTS_BUCKET === undefined) {
            throw new Error('Missing env variable SYNTHETICS_SCRIPTS_BUCKET');
        }
        const s3 = new AWS.S3();

        const filenameAndPath = [
            { filename: 'synthetics/syntheticScripts/metadata.zip', path: 'synthetics/metadata.js' },
        ];

        if (event.RequestType === 'Create' || event.RequestType === 'Update') {
            await Promise.all(
                filenameAndPath.map(async (entry) => {
                    // node doesn't have a std lib for creating zip archive files
                    // adm-zip is the only zip archive package that seemed to work w/lambda & cloudformation
                    console.log(`creating zip to s3 for ${entry.path}`);

                    // @ts-ignore: Only a void function can be called with the 'new' keyword.ts(2350)
                    const zip = new AdmZip();

                    // super strange zip file format for canaries when using s3
                    // need to make sure it's nested in nodejs/node_modules
                    // and that the file name matches the handler name
                    // by convention we'll use index.handler & index.js
                    // https://gist.github.com/zcapper/82a9ef2ad8dc5156c77d22dde15d6391#gistcomment-3550685
                    // TODO: handle install/package of node_modules
                    zip.addLocalFile(entry.path, 'nodejs/node_modules/');
                    const zipBuffer = zip.toBuffer();
                    console.log(`created zip for ${entry.path}`);

                    console.log(`uploading ${entry.path} to s3`);
                    return s3
                        .putObject({
                            Bucket: process.env.SYNTHETICS_SCRIPTS_BUCKET,
                            Body: zipBuffer,
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
                filenameAndPath.map((entry) => {
                    console.log(`deleting ${entry.filename} from ${process.env.SYNTHETICS_SCRIPTS_BUCKET}`);
                    return s3
                        .deleteObject({
                            Bucket: process.env.SYNTHETICS_SCRIPTS_BUCKET,
                            Key: entry.filename,
                        })
                        .promise();
                }),
            );
            console.log(`delete successful`);
            await sendCfnResponse(event, 'SUCCESS');
        }
    } catch (e) {
        console.log(e);
        await sendCfnResponse(event, 'FAILED', e);
    }
};
