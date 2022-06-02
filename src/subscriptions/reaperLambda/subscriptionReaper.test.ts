/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { DynamoDbDataService, DynamoDb } from 'fhir-works-on-aws-persistence-ddb';
import reaperHandler from './subscriptionReaper';

const dbServiceWithTenancy = new DynamoDbDataService(DynamoDb, false, {
    enableMultiTenancy: true,
});
const dbService = new DynamoDbDataService(DynamoDb);

describe('subscriptionReaper', () => {
    test('no subscriptions to delete', async () => {
        const expectedResponse: {
            success: boolean;
            message: string;
        }[] = [];
        const subResource = [
            {
                resourceType: 'Subscription',
                id: 'sub1',
                status: 'requested',
                end: '2121-01-01T00:00:00Z',
            },
        ];
        const mockGetActiveSubscriptions = jest.fn();
        mockGetActiveSubscriptions.mockResolvedValueOnce(subResource);
        dbService.getActiveSubscriptions = mockGetActiveSubscriptions;
        const actualResponse = await reaperHandler(dbService, dbServiceWithTenancy, false);
        expect(actualResponse).toEqual(expectedResponse);
    });

    test('subscriptions that have expired should be deleted', async () => {
        const message = `Successfully deleted ResourceType: Subscription, Id: sub1, VersionId: 1`;
        const expectedResponse: {
            success: boolean;
            message: string;
        }[] = [
            {
                success: true,
                message,
            },
        ];
        const subResource = [
            {
                resourceType: 'Subscription',
                _id: 'sub1',
                status: 'requested',
                end: '2021-01-01T00:00:00Z',
                _tenantId: 'tenant1',
            },
            {
                resourceType: 'Subscription',
                _id: 'sub2',
                status: 'requested',
                end: '2121-01-01T00:00:00Z',
                _tenantId: 'tenant1',
            },
        ];
        const mockGetActiveSubscriptions = jest.fn();
        const mockDeleteResource = jest.fn();
        mockGetActiveSubscriptions.mockResolvedValueOnce(subResource);
        mockDeleteResource.mockResolvedValueOnce({ success: true, message });
        dbService.getActiveSubscriptions = mockGetActiveSubscriptions;
        dbServiceWithTenancy.deleteResource = mockDeleteResource;
        const actualResponse = await reaperHandler(dbService, dbServiceWithTenancy, true);
        expect(actualResponse).toEqual(expectedResponse);
    });

    test('subscriptions that have no specified end should not be deleted', async () => {
        const expectedResponse: {
            success: boolean;
            message: string;
        }[] = [];
        const subResource = [
            {
                resourceType: 'Subscription',
                id: 'sub1',
                status: 'requested',
            },
        ];
        const mockGetActiveSubscriptions = jest.fn();
        mockGetActiveSubscriptions.mockResolvedValueOnce(subResource);
        dbService.getActiveSubscriptions = mockGetActiveSubscriptions;
        const actualResponse = await reaperHandler(dbService, dbServiceWithTenancy, false);
        expect(actualResponse).toEqual(expectedResponse);
    });
});
