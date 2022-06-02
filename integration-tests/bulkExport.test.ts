/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import BulkExportTestHelper, { ExportStatusOutput } from './bulkExportTestHelper';
import { getFhirClient, getResourcesFromBundleResponse, sleep } from './utils';
import createGroupMembersBundle from './createGroupMembersBundle.json';

const EIGHT_MINUTES_IN_MS = 8 * 60 * 1000;
jest.setTimeout(EIGHT_MINUTES_IN_MS);

describe('Bulk Export', () => {
    let bulkExportTestHelper: BulkExportTestHelper;

    beforeAll(async () => {
        const fhirUserAxios = await getFhirClient();

        bulkExportTestHelper = new BulkExportTestHelper(fhirUserAxios);
    });

    test('Successfully export all data added to DB after currentTime', async () => {
        // BUILD
        const oldCreatedResourceBundleResponse = await bulkExportTestHelper.sendCreateResourcesRequest();
        const resTypToResNotExpectedInExport = getResourcesFromBundleResponse(oldCreatedResourceBundleResponse);
        // sleep 30 seconds to make tests more resilient to clock skew when running locally.
        await sleep(30_000);
        const currentTime = new Date();
        const newCreatedResourceBundleResponse = await bulkExportTestHelper.sendCreateResourcesRequest();
        const resTypToResExpectedInExport = getResourcesFromBundleResponse(newCreatedResourceBundleResponse);

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
        const resTypToResExpectedInExport = getResourcesFromBundleResponse(createdResourceBundleResponse);
        const type = 'Patient';

        // OPERATE
        const statusPollUrl = await bulkExportTestHelper.startExportJob({ type });
        const responseBody = await bulkExportTestHelper.getExportStatus(statusPollUrl);

        // CHECK
        // Check only files specified by "type" are exported
        expect(new Set((responseBody.output as ExportStatusOutput[]).map((x) => x.type))).toEqual(new Set([type]));
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

    test('Successfully export a group and patient compartment', async () => {
        // BUILD
        const createdResourceBundleResponse = await bulkExportTestHelper.sendCreateGroupRequest();
        const resTypToResExpectedInExport = getResourcesFromBundleResponse(
            createdResourceBundleResponse,
            createGroupMembersBundle,
            true,
        );

        // OPERATE
        const groupId = resTypToResExpectedInExport.Group.id;
        const statusPollUrl = await bulkExportTestHelper.startExportJob({ exportType: 'group', groupId });
        const responseBody = await bulkExportTestHelper.getExportStatus(statusPollUrl);

        // CHECK
        return bulkExportTestHelper.checkResourceInExportedFiles(responseBody.output, resTypToResExpectedInExport);
    });

    test('Successfully export group members last updated after _since timestamp in a group last updated before the _since timestamp', async () => {
        // BUILD
        const createdResourceBundleResponse = await bulkExportTestHelper.sendCreateGroupRequest();
        const resTypToResExpectedInExport = getResourcesFromBundleResponse(
            createdResourceBundleResponse,
            createGroupMembersBundle,
            true,
        );
        // sleep 10 seconds to make tests more resilient to clock skew when running locally.
        await sleep(10_000);
        const currentTime = new Date();
        // Update patient resource so the last updated time is after currentTime
        const updatedPatientResource = await bulkExportTestHelper.updateResource(resTypToResExpectedInExport.Patient);

        // OPERATE
        const groupId = resTypToResExpectedInExport.Group.id;
        const statusPollUrl = await bulkExportTestHelper.startExportJob({
            exportType: 'group',
            groupId,
            since: currentTime,
        });
        const responseBody = await bulkExportTestHelper.getExportStatus(statusPollUrl);

        // CHECK
        return bulkExportTestHelper.checkResourceInExportedFiles(responseBody.output, {
            Patient: updatedPatientResource,
        });
    });

    test('Does not include inactive members in group export', async () => {
        // BUILD
        const createdResourceBundleResponse = await bulkExportTestHelper.sendCreateGroupRequest({ inactive: true });
        const resTypToResExpectedInExport = getResourcesFromBundleResponse(
            createdResourceBundleResponse,
            createGroupMembersBundle,
            true,
        );

        // OPERATE
        const groupId = resTypToResExpectedInExport.Group.id;
        const statusPollUrl = await bulkExportTestHelper.startExportJob({ exportType: 'group', groupId });
        const responseBody = await bulkExportTestHelper.getExportStatus(statusPollUrl);

        // CHECK
        return expect(responseBody.output.length).toEqual(0);
    });

    test('Does not include members with expired membership in group export', async () => {
        // BUILD
        const createdResourceBundleResponse = await bulkExportTestHelper.sendCreateGroupRequest({
            period: { start: '1992-02-01T00:00:00.000Z', end: '2020-03-04T00:00:00.000Z' },
        });
        const resTypToResExpectedInExport = getResourcesFromBundleResponse(
            createdResourceBundleResponse,
            createGroupMembersBundle,
            true,
        );

        // OPERATE
        const groupId = resTypToResExpectedInExport.Group.id;
        const statusPollUrl = await bulkExportTestHelper.startExportJob({ exportType: 'group', groupId });
        const responseBody = await bulkExportTestHelper.getExportStatus(statusPollUrl);

        // CHECK
        return expect(responseBody.output.length).toEqual(0);
    });
});
