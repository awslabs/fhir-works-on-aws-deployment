/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { DynamoDbDataService } from 'fhir-works-on-aws-persistence-ddb';
import reaperHandler from './subscriptionReaper';

jest.mock('fhir-works-on-aws-persistence-ddb');
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
        DynamoDbDataService.prototype.getActiveSubscriptions = mockGetActiveSubscriptions;
        mockGetActiveSubscriptions.mockResolvedValueOnce(subResource);
        const actualResponse = await reaperHandler({});
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
                id: 'sub1',
                status: 'requested',
                end: '2021-01-01T00:00:00Z',
            },
            {
                resourceType: 'Subscription',
                id: 'sub2',
                status: 'requested',
                end: '2121-01-01T00:00:00Z',
            },
        ];
        const mockGetActiveSubscriptions = jest.fn();
        const mockDeleteResource = jest.fn();
        DynamoDbDataService.prototype.getActiveSubscriptions = mockGetActiveSubscriptions;
        DynamoDbDataService.prototype.deleteResource = mockDeleteResource;
        mockGetActiveSubscriptions.mockResolvedValueOnce(subResource);
        mockDeleteResource.mockResolvedValueOnce([{ success: true, message }]);
        const actualResponse = await reaperHandler({});
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
        DynamoDbDataService.prototype.getActiveSubscriptions = mockGetActiveSubscriptions;
        mockGetActiveSubscriptions.mockResolvedValueOnce(subResource);
        const actualResponse = await reaperHandler({});
        expect(actualResponse).toEqual(expectedResponse);
    });
});
