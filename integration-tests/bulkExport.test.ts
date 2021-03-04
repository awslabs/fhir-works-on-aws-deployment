/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import BulkExportTestHelper, { ExportStatusOutput } from './bulkExportTestHelper';
import { getFhirClient } from './utils';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
jest.setTimeout(FIVE_MINUTES_IN_MS);

describe('Bulk Export', () => {
    let bulkExportTestHelper: BulkExportTestHelper;

    beforeAll(async () => {
        const fhirUserAxios = await getFhirClient();

        bulkExportTestHelper = new BulkExportTestHelper(fhirUserAxios);
    });

    test('Successfully export all data added to DB after currentTime', async () => {
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
    });

    test('Successfully export just Patient data', async () => {
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
    });

    test('Successfully stop a running export job', async () => {
        // BUILD
        const statusPollUrl = await bulkExportTestHelper.startExportJob({});
        // OPERATE
        await bulkExportTestHelper.stopExportJob(statusPollUrl);
        // CHECK
        return bulkExportTestHelper.getExportStatus(statusPollUrl, 'Export job has been canceled');
    });
});
