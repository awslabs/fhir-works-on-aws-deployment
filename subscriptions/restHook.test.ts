import axios from 'axios';
import { sendRestHookNotification } from './restHook';

jest.mock('axios');
// This mock only works on the file level for once
// Separating multi-tenant tests to a separate file to use other mock value
jest.mock('./allowList', () => ({
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

process.env.ENABLE_MULTI_TENANCY = 'false';

const getEvent = ({
    channelHeader = ['testKey:testValue'],
    channelPayload = 'application/fhir+json',
    endpoint = 'https://fake-end-point-1',
    tenantId = null as any,
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

describe('Single tenant: Rest hook notification', () => {
    beforeEach(() => {
        axios.post = jest.fn().mockResolvedValueOnce({ data: { message: 'POST Successful' } });
        axios.put = jest.fn().mockResolvedValueOnce({ data: { message: 'PUT Successful' } });
    });

    test('Empty POST notification is sent when channelPayload is null', async () => {
        await expect(sendRestHookNotification(getEvent({ channelPayload: null as any }))).resolves.toEqual([
            { message: 'POST Successful' },
        ]);
        expect(axios.post).toHaveBeenCalledWith('https://fake-end-point-1', null, {
            headers: { 'header-name-1': ' header-value-1', testKey: 'testValue' },
        });
    });

    test('PUT notification with ID is sent when channelPayload is application/fhir+json', async () => {
        await expect(
            sendRestHookNotification(getEvent({ endpoint: 'https://fake-end-point-2-something' })),
        ).resolves.toEqual([{ message: 'PUT Successful' }]);
        expect(axios.put).toHaveBeenCalledWith('https://fake-end-point-2-something/Patient/1234567', null, {
            headers: { 'header-name-2': ' header-value-2', testKey: 'testValue' },
        });
    });

    test('Header in channelHeader overrides header in allow list when there is duplicated header name', async () => {
        await expect(
            sendRestHookNotification(
                getEvent({
                    channelHeader: ['header-name-2: header-value-2-something'],
                    endpoint: 'https://fake-end-point-2-something',
                }),
            ),
        ).resolves.toEqual([{ message: 'PUT Successful' }]);
        expect(axios.put).toHaveBeenCalledWith('https://fake-end-point-2-something/Patient/1234567', null, {
            headers: { 'header-name-2': ' header-value-2-something' },
        });
    });

    test('Header string without colon is sent as empty header', async () => {
        await expect(
            sendRestHookNotification(
                getEvent({ endpoint: 'https://fake-end-point-2-something', channelHeader: ['testKey'] }),
            ),
        ).resolves.toEqual([{ message: 'PUT Successful' }]);
        expect(axios.put).toHaveBeenCalledWith('https://fake-end-point-2-something/Patient/1234567', null, {
            headers: { 'header-name-2': ' header-value-2', testKey: '' },
        });
    });

    test('Error thrown when endpoint is not allow listed', async () => {
        await expect(sendRestHookNotification(getEvent({ endpoint: 'https://fake-end-point-3' }))).rejects.toThrow(
            new Error('Endpoint https://fake-end-point-3 is not allow listed.'),
        );
    });

    test('Error thrown when tenantID is passed in', async () => {
        const event = getEvent({ tenantId: 'tenant1' });
        await expect(sendRestHookNotification(event)).rejects.toThrow(
            new Error('This instance has multi-tenancy disabled, but the incoming request has a tenantId'),
        );
    });
});
