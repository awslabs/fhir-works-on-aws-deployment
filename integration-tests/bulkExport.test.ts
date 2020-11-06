/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import axios from 'axios';
import AWS from 'aws-sdk';
import BulkExportTestHelper, { ExportStatusOutput } from './bulkExportTestHelper';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
const {
    API_URL,
    API_ACCESS_TOKEN,
    API_KEY,
    AWS_REGION,
    COGNITO_USERNAME,
    COGNITO_PASSWORD,
    COGNITO_CLIENT_ID,
} = process.env;

describe('Bulk Export', () => {
    let bulkExportTestHelper: BulkExportTestHelper;

    beforeAll(async () => {
        if (API_URL === undefined) {
            throw new Error('API_URL environment variable is not defined');
        }
        if (API_ACCESS_TOKEN === undefined) {
            throw new Error('API_ACCESS_TOKEN environment variable is not defined');
        }
        if (API_KEY === undefined) {
            throw new Error('API_KEY environment variable is not defined');
        }
        if (AWS_REGION === undefined) {
            throw new Error('AWS_REGION environment variable is not defined');
        }
        if (COGNITO_CLIENT_ID === undefined) {
            throw new Error('COGNITO_CLIENT_ID environment variable is not defined');
        }
        if (COGNITO_USERNAME === undefined) {
            throw new Error('COGNITO_USERNAME environment variable is not defined');
        }
        if (COGNITO_PASSWORD === undefined) {
            throw new Error('COGNITO_PASSWORD environment variable is not defined');
        }

        AWS.config.update({ region: AWS_REGION });
        const Cognito = new AWS.CognitoIdentityServiceProvider();

        const authResponse = await Cognito.initiateAuth({
            ClientId: COGNITO_CLIENT_ID,
            AuthFlow: 'USER_PASSWORD_AUTH',
            AuthParameters: {
                USERNAME: COGNITO_USERNAME,
                PASSWORD: COGNITO_PASSWORD,
            },
        }).promise();

        const fhirUserAxios = axios.create({
            headers: {
                'x-api-key': API_KEY,
                Authorization: `Bearer ${authResponse.AuthenticationResult!.AccessToken}`,
            },
            baseURL: API_URL,
        });

        bulkExportTestHelper = new BulkExportTestHelper(fhirUserAxios);
    });

    test(
        'Successfully export all data added to DB after currentTime',
        async () => {
            // BUILD
            const oldCreatedResourceBundleResponse = await bulkExportTestHelper.sendCreateResourcesRequest();
            const resTypToResNotExpectedInExport = bulkExportTestHelper.getResources(oldCreatedResourceBundleResponse);
            const currentTime = new Date();
            const newCreatedResourceBundleResponse = await bulkExportTestHelper.sendCreateResourcesRequest();
            const resTypToResExpectedInExport = bulkExportTestHelper.getResources(newCreatedResourceBundleResponse);

            // OPERATE
            // Only export resources that were added after 'currentTime'
            const statusPollUrl = await bulkExportTestHelper.startExportJob({ since: currentTime });
            const responseBody = await bulkExportTestHelper.getExportStatus(statusPollUrl);

            // CHECK
            return bulkExportTestHelper.checkResourceInExportedFiles(
                responseBody.output,
                resTypToResExpectedInExport,
                resTypToResNotExpectedInExport,
            );
        },
        FIVE_MINUTES_IN_MS,
    );

    test(
        'Successfully export just Patient data',
        async () => {
            // BUILD
            const createdResourceBundleResponse = await bulkExportTestHelper.sendCreateResourcesRequest();
            const resTypToResExpectedInExport = bulkExportTestHelper.getResources(createdResourceBundleResponse);
            const type = 'Patient';

            // OPERATE
            const statusPollUrl = await bulkExportTestHelper.startExportJob({ type });
            const responseBody = await bulkExportTestHelper.getExportStatus(statusPollUrl);

            // CHECK
            // Check only files specified by "type" are exported
            expect(new Set((responseBody.output as ExportStatusOutput[]).map(x => x.type))).toEqual(new Set([type]));
            return bulkExportTestHelper.checkResourceInExportedFiles(responseBody.output, {
                Patient: resTypToResExpectedInExport.Patient,
            });
        },
        FIVE_MINUTES_IN_MS,
    );

    test(
        'Successfully stop a running export job',
        async () => {
            // BUILD
            const statusPollUrl = await bulkExportTestHelper.startExportJob({});
            // OPERATE
            await bulkExportTestHelper.stopExportJob(statusPollUrl);
            // CHECK
            return bulkExportTestHelper.getExportStatus(statusPollUrl, 'Export job has been canceled');
        },
        FIVE_MINUTES_IN_MS,
    );
});
