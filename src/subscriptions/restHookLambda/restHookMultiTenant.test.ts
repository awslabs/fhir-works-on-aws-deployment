import axios from 'axios';
import RestHookHandler from './restHook';
import { AllowListInfo, getAllowListInfo } from './allowListUtil';

jest.mock('axios');
jest.mock('../allowList', () => ({
    __esModule: true,
    default: async () => [
        {
            endpoint: 'https://fake-end-point-tenant1',
            headers: ['header-name-1: header-value-1'],
            tenantId: 'tenant1',
        },
        {
            endpoint: new RegExp('^https://fake-end-point-tenant2'),
            headers: ['header-name-2: header-value-2'],
            tenantId: 'tenant2',
        },
    ],
}));

const getEvent = ({
    channelHeader = ['testKey:testValue'],
    channelPayload = 'application/fhir+json',
    endpoint = 'https://fake-end-point-tenant1',
    tenantId = 'tenant1',
} = {}) => ({
    Records: [
        {
            messageId: 'fake-message-id',
            receiptHandle: 'fake-receipt-Handle',
            body: JSON.stringify({
                Message: JSON.stringify({
                    subscriptionId: 123456,
                    channelType: 'rest-hook',
                    tenantId,
                    endpoint,
                    channelPayload,
                    channelHeader,
                    matchedResource: {
                        id: 1234567,
                        resourceType: 'Patient',
                        versionId: 2,
                        lastUpdated: 'some-time-stamp',
                    },
                }),
            }),
            attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '123456789',
                SenderId: 'FAKESENDERID',
                MessageDeduplicationId: '1',
                ApproximateFirstReceiveTimestamp: '123456789',
            },
            messageAttributes: {},
            md5OfBody: '123456789012',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:fhir-service-dev-RestHookQueue',
            awsRegion: 'us-east-2',
        },
    ],
});

describe('Multi-tenant: Rest hook notification', () => {
    const restHookHandler = new RestHookHandler({ enableMultitenancy: true });
    const allowListPromise: Promise<{ [key: string]: AllowListInfo }> = getAllowListInfo({ enableMultitenancy: true });

    beforeEach(() => {
        axios.post = jest.fn().mockResolvedValueOnce({ data: { message: 'POST Successful' } });
        axios.put = jest.fn().mockResolvedValueOnce({ data: { message: 'PUT Successful' } });
    });

    test('Empty POST notification is sent when channelPayload is null', async () => {
        await expect(
            restHookHandler.sendRestHookNotification(getEvent({ channelPayload: null as any }), allowListPromise),
        ).resolves.toMatchInlineSnapshot(`
                    Object {
                      "batchItemFailures": Array [],
                    }
                `);
        expect(axios.post).toHaveBeenCalledWith('https://fake-end-point-tenant1', null, {
            headers: { 'header-name-1': ' header-value-1', testKey: 'testValue' },
        });
    });

    test('PUT notification with ID is sent when channelPayload is application/fhir+json', async () => {
        await expect(
            restHookHandler.sendRestHookNotification(
                getEvent({ endpoint: 'https://fake-end-point-tenant2-something', tenantId: 'tenant2' }),
                allowListPromise,
            ),
        ).resolves.toMatchInlineSnapshot(`
                    Object {
                      "batchItemFailures": Array [],
                    }
                `);
        expect(axios.put).toHaveBeenCalledWith('https://fake-end-point-tenant2-something/Patient/1234567', null, {
            headers: { 'header-name-2': ' header-value-2', testKey: 'testValue' },
        });
    });

    test('Header in channelHeader overrides header in allow list when there is duplicated header name', async () => {
        await expect(
            restHookHandler.sendRestHookNotification(
                getEvent({
                    channelHeader: ['header-name-2: header-value-2-something'],
                    endpoint: 'https://fake-end-point-tenant2-something',
                    tenantId: 'tenant2',
                }),
                allowListPromise,
            ),
        ).resolves.toMatchInlineSnapshot(`
                    Object {
                      "batchItemFailures": Array [],
                    }
                `);
        expect(axios.put).toHaveBeenCalledWith('https://fake-end-point-tenant2-something/Patient/1234567', null, {
            headers: { 'header-name-2': ' header-value-2-something' },
        });
    });

    test('Error thrown when endpoint is not allow listed', async () => {
        await expect(
            restHookHandler.sendRestHookNotification(
                getEvent({ endpoint: 'https://fake-end-point-tenant2-something' }),
                allowListPromise,
            ),
        ).resolves.toMatchInlineSnapshot(`
                    Object {
                      "batchItemFailures": Array [
                        Object {
                          "itemIdentifier": "fake-message-id",
                        },
                      ],
                    }
                `);
    });

    test('Error thrown when tenant has no allow list', async () => {
        await expect(
            restHookHandler.sendRestHookNotification(
                getEvent({ endpoint: 'https://fake-end-point-tenant3-something', tenantId: 'tenant3' }),
                allowListPromise,
            ),
        ).resolves.toMatchInlineSnapshot(`
                    Object {
                      "batchItemFailures": Array [
                        Object {
                          "itemIdentifier": "fake-message-id",
                        },
                      ],
                    }
                `);
    });

    test('Error thrown when tenantID is not passed in', async () => {
        await expect(restHookHandler.sendRestHookNotification(getEvent({ tenantId: null as any }), allowListPromise))
            .resolves.toMatchInlineSnapshot(`
                    Object {
                      "batchItemFailures": Array [
                        Object {
                          "itemIdentifier": "fake-message-id",
                        },
                      ],
                    }
                `);
    });
});
