/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0 *
 */

import { AxiosInstance } from 'axios';
import {
    expectResourceToNotBePartOfSearchResults,
    getFhirClient,
    randomPatient,
    waitForResourceToBeSearchable,
} from './utils';
import BulkExportTestHelper from './bulkExportTestHelper';

jest.setTimeout(300_000);

test('empty test placeholder', () => {
    // empty test to avoid the "Your test suite must contain at least one test." error
});

if (process.env.MULTI_TENANCY_ENABLED === 'true') {
    describe('tenant data isolation', () => {
        let client: AxiosInstance;
        let clientForAnotherTenant: AxiosInstance;
        beforeAll(async () => {
            client = await getFhirClient('fhirUser user/*.*', true, { tenant: 'tenant1' });
            clientForAnotherTenant = await getFhirClient('fhirUser user/*.*', true, { tenant: 'tenant2' });
        });

        test('tenant cannot READ resources from another tenant', async () => {
            const testPatient: ReturnType<typeof randomPatient> = (await client.post('Patient', randomPatient())).data;

            await expect(clientForAnotherTenant.get(`Patient/${testPatient.id}`)).rejects.toMatchObject({
                response: { status: 404 },
            });
        });

        test('tenant cannot UPDATE resources from another tenant', async () => {
            const testPatient: ReturnType<typeof randomPatient> = (await client.post('Patient', randomPatient())).data;

            await expect(clientForAnotherTenant.put(`Patient/${testPatient.id}`, testPatient)).rejects.toMatchObject({
                response: { status: 404 },
            });
        });

        test('tenant cannot DELETE resources from another tenant', async () => {
            const testPatient: ReturnType<typeof randomPatient> = (await client.post('Patient', randomPatient())).data;

            await expect(clientForAnotherTenant.delete(`Patient/${testPatient.id}`)).rejects.toMatchObject({
                response: { status: 404 },
            });
        });

        test('tenant cannot SEARCH resources from another tenant', async () => {
            const testPatient: ReturnType<typeof randomPatient> = (await client.post('Patient', randomPatient())).data;

            await waitForResourceToBeSearchable(client, testPatient);

            await expectResourceToNotBePartOfSearchResults(
                clientForAnotherTenant,
                { url: 'Patient', params: { _id: testPatient.id } },
                testPatient,
            );
        });

        test('tenant cannot SEARCH _include or _revinclude resources from another tenant', async () => {
            const testOrganization = {
                resourceType: 'Organization',
                name: 'Some Organization',
            };

            const testOrganizationResource = (await client.post('Organization', testOrganization)).data;

            const testPatientWithRelativeReferenceToOrg: ReturnType<typeof randomPatient> = (
                await clientForAnotherTenant.post('Patient', {
                    ...randomPatient(),
                    managingOrganization: {
                        reference: `Organization/${testOrganizationResource.id}`,
                    },
                })
            ).data;

            const testPatientWithAbsoluteReferenceToOrg: ReturnType<typeof randomPatient> = (
                await clientForAnotherTenant.post('Patient', {
                    ...randomPatient(),
                    managingOrganization: {
                        reference: `${process.env.SMART_SERVICE_URL}/tenant/tenant1/Organization/${testOrganizationResource.id}`,
                    },
                })
            ).data;

            await waitForResourceToBeSearchable(clientForAnotherTenant, testPatientWithAbsoluteReferenceToOrg);

            await expectResourceToNotBePartOfSearchResults(
                clientForAnotherTenant,
                { url: 'Patient', params: { _id: testPatientWithRelativeReferenceToOrg.id, _include: '*' } },
                testOrganizationResource,
            );

            await expectResourceToNotBePartOfSearchResults(
                clientForAnotherTenant,
                { url: 'Patient', params: { _id: testPatientWithAbsoluteReferenceToOrg.id, _include: '*' } },
                testOrganizationResource,
            );

            await expectResourceToNotBePartOfSearchResults(
                client,
                { url: 'Organization', params: { _id: testOrganizationResource.id, _revinclude: '*' } },
                testPatientWithAbsoluteReferenceToOrg,
            );

            await expectResourceToNotBePartOfSearchResults(
                client,
                { url: 'Organization', params: { _id: testOrganizationResource.id, _revinclude: '*' } },
                testPatientWithRelativeReferenceToOrg,
            );
        });

        test('tenant cannot EXPORT resources from another tenant', async () => {
            const testPatient: ReturnType<typeof randomPatient> = (await client.post('Patient', randomPatient())).data;
            const bulkExportTestHelper = new BulkExportTestHelper(clientForAnotherTenant);

            const testPatientFromAnotherTenant: ReturnType<typeof randomPatient> = (
                await clientForAnotherTenant.post('Patient', randomPatient())
            ).data;

            const statusPollUrl = await bulkExportTestHelper.startExportJob({
                since: new Date(Date.now() - 600_000),
            });
            const responseBody = await bulkExportTestHelper.getExportStatus(statusPollUrl);

            const expectedResources = { Patient: testPatientFromAnotherTenant };
            const notExpectedResources = { Patient: testPatient };

            return bulkExportTestHelper.checkResourceInExportedFiles(
                responseBody.output,
                expectedResources,
                notExpectedResources,
            );
        });
    });

    describe('routing', () => {
        let client: AxiosInstance;
        beforeAll(async () => {
            client = await getFhirClient('fhirUser user/*.*', true, { tenant: 'tenant1' });
        });
        test('requests without /tenant/<tenantId> in path should fail', async () => {
            await expect(client.get(`${process.env.SMART_SERVICE_URL}/Patient`)).rejects.toMatchObject({
                response: { status: 404 },
            });

            await expect(client.get(`${process.env.SMART_SERVICE_URL}/Patient/123`)).rejects.toMatchObject({
                response: { status: 404 },
            });

            await expect(client.post(`${process.env.SMART_SERVICE_URL}/Patient/123`)).rejects.toMatchObject({
                response: { status: 404 },
            });

            await expect(client.put(`${process.env.SMART_SERVICE_URL}/Patient/123`)).rejects.toMatchObject({
                response: { status: 404 },
            });

            await expect(client.delete(`${process.env.SMART_SERVICE_URL}/Patient/123`)).rejects.toMatchObject({
                response: { status: 404 },
            });
        });

        test('requests with tenantId in path different from the tenantId in access token should fail', async () => {
            await expect(
                client.get(`${process.env.SMART_SERVICE_URL}/tenant/anotherTenantId/Patient`),
            ).rejects.toMatchObject({
                response: { status: 401 },
            });

            await expect(
                client.get(`${process.env.SMART_SERVICE_URL}/tenant/anotherTenantId/Patient/123`),
            ).rejects.toMatchObject({
                response: { status: 401 },
            });

            await expect(
                client.post(`${process.env.SMART_SERVICE_URL}/tenant/anotherTenantId/Patient/123`),
            ).rejects.toMatchObject({
                response: { status: 401 },
            });

            await expect(
                client.put(`${process.env.SMART_SERVICE_URL}/tenant/anotherTenantId/Patient/123`),
            ).rejects.toMatchObject({
                response: { status: 401 },
            });

            await expect(
                client.delete(`${process.env.SMART_SERVICE_URL}/tenant/anotherTenantId/Patient/123`),
            ).rejects.toMatchObject({
                response: { status: 401 },
            });
        });
    });
}
