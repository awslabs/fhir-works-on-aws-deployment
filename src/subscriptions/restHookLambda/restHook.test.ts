import axios from 'axios';
import RestHookHandler from './restHook';
import { AllowListInfo, getAllowListInfo } from './allowListUtil';

jest.mock('axios');
// This mock only works on the file level for once
// Separating multi-tenant tests to a separate file to use other mock value
jest.mock('../allowList', () => ({
    __esModule: true,
    default: async () => [
        {
            endpoint: 'https://fake-end-point-1',
            headers: ['header-name-1: header-value-1'],
        },
        {
            endpoint: new RegExp('^https://fake-end-point-2'),
            headers: ['header-name-2: header-value-2'],
        },
    ],
}));

const getEvent = ({
    channelHeader = ['testKey:testValue'],
    channelPayload = 'application/fhir+json',
    endpoint = 'https://fake-end-point-1',
    tenantId = null as any,
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

describe('Single tenant: Rest hook notification', () => {
    const restHookHandler = new RestHookHandler({ enableMultitenancy: false });
    const allowListPromise: Promise<{ [key: string]: AllowListInfo }> = getAllowListInfo({ enableMultitenancy: false });

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
        expect(axios.post).toHaveBeenCalledWith('https://fake-end-point-1', null, {
            headers: { 'header-name-1': ' header-value-1', testKey: 'testValue' },
        });
    });

    test('PUT notification with ID is sent when channelPayload is application/fhir+json', async () => {
        await expect(
            restHookHandler.sendRestHookNotification(
                getEvent({ endpoint: 'https://fake-end-point-2-something' }),
                allowListPromise,
            ),
        ).resolves.toMatchInlineSnapshot(`
                    Object {
                      "batchItemFailures": Array [],
                    }
                `);
        expect(axios.put).toHaveBeenCalledWith('https://fake-end-point-2-something/Patient/1234567', null, {
            headers: { 'header-name-2': ' header-value-2', testKey: 'testValue' },
        });
    });

    test('Header in channelHeader overrides header in allow list when there is duplicated header name', async () => {
        await expect(
            restHookHandler.sendRestHookNotification(
                getEvent({
                    channelHeader: ['header-name-2: header-value-2-something'],
                    endpoint: 'https://fake-end-point-2-something',
                }),
                allowListPromise,
            ),
        ).resolves.toMatchInlineSnapshot(`
                    Object {
                      "batchItemFailures": Array [],
                    }
                `);
        expect(axios.put).toHaveBeenCalledWith('https://fake-end-point-2-something/Patient/1234567', null, {
            headers: { 'header-name-2': ' header-value-2-something' },
        });
    });

    test('Header string without colon is sent as empty header', async () => {
        await expect(
            restHookHandler.sendRestHookNotification(
                getEvent({ endpoint: 'https://fake-end-point-2-something', channelHeader: ['testKey'] }),
                allowListPromise,
            ),
        ).resolves.toMatchInlineSnapshot(`
                    Object {
                      "batchItemFailures": Array [],
                    }
                `);
        expect(axios.put).toHaveBeenCalledWith('https://fake-end-point-2-something/Patient/1234567', null, {
            headers: { 'header-name-2': ' header-value-2', testKey: '' },
        });
    });

    test('Error thrown when endpoint is not allow listed', async () => {
        await expect(
            restHookHandler.sendRestHookNotification(
                getEvent({ endpoint: 'https://fake-end-point-3' }),
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

    test('Error thrown when tenantID is passed in', async () => {
        await expect(restHookHandler.sendRestHookNotification(getEvent({ tenantId: 'tenant1' }), allowListPromise))
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
