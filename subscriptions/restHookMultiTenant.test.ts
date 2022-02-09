import axios from 'axios';
import { sendRestHookNotification } from './restHook';

jest.mock('axios');
jest.mock('./allowList', () => ({
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

process.env.ENABLE_MULTI_TENANCY = 'true';

const getEvent = ({
    channelHeader = ['testKey:testValue'],
    channelPayload = 'application/fhir+json',
    endpoint = 'https://fake-end-point-tenant1',
    tenantId = 'tenant1',
} = {}) => ({
    Records: [
        {
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
        },
    ],
});

describe('Multi-tenant: Rest hook notification', () => {
    beforeEach(() => {
        axios.post = jest.fn().mockResolvedValueOnce({ data: { message: 'POST Successful' } });
        axios.put = jest.fn().mockResolvedValueOnce({ data: { message: 'PUT Successful' } });
    });

    test('Empty POST notification is sent when channelPayload is null', async () => {
        await expect(sendRestHookNotification(getEvent({ channelPayload: null as any }))).resolves.toEqual([
            { message: 'POST Successful' },
        ]);
        expect(axios.post).toHaveBeenCalledWith('https://fake-end-point-tenant1', null, {
            headers: { 'header-name-1': ' header-value-1', testKey: 'testValue' },
        });
    });

    test('PUT notification with ID is sent when channelPayload is application/fhir+json', async () => {
        await expect(
            sendRestHookNotification(
                getEvent({ endpoint: 'https://fake-end-point-tenant2-something', tenantId: 'tenant2' }),
            ),
        ).resolves.toEqual([{ message: 'PUT Successful' }]);
        expect(axios.put).toHaveBeenCalledWith('https://fake-end-point-tenant2-something/Patient/1234567', null, {
            headers: { 'header-name-2': ' header-value-2', testKey: 'testValue' },
        });
    });

    test('Header in channelHeader overrides header in allow list when there is duplicated header name', async () => {
        await expect(
            sendRestHookNotification(
                getEvent({
                    channelHeader: ['header-name-2: header-value-2-something'],
                    endpoint: 'https://fake-end-point-tenant2-something',
                    tenantId: 'tenant2',
                }),
            ),
        ).resolves.toEqual([{ message: 'PUT Successful' }]);
        expect(axios.put).toHaveBeenCalledWith('https://fake-end-point-tenant2-something/Patient/1234567', null, {
            headers: { 'header-name-2': ' header-value-2-something' },
        });
    });

    test('Error thrown when endpoint is not allow listed', async () => {
        await expect(
            sendRestHookNotification(getEvent({ endpoint: 'https://fake-end-point-tenant2-something' })),
        ).rejects.toThrow(new Error('Endpoint https://fake-end-point-tenant2-something is not allow listed.'));
    });

    test('Error thrown when tenantID is not passed in', async () => {
        const event = getEvent({ tenantId: null as any });
        await expect(sendRestHookNotification(event)).rejects.toThrow(
            new Error('This instance has multi-tenancy enabled, but the incoming request is missing tenantId'),
        );
    });
});
