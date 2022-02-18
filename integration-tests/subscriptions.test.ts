import axios, { AxiosInstance } from 'axios';
import { getFhirClient } from './utils';

let client: AxiosInstance;
describe('test subscription creation and deletion', () => {
    beforeAll(async () => {
        client = await getFhirClient();
    });

    test('creation', async () => {
        // OPERATE
        const subscriptionResource = {
            resourceType: 'Subscription',
            status: 'requested',
            // get a time 1 minute (60000 ms) in the future
            end: new Date(new Date().getTime() + 60000).toISOString()
        };
        const postSubResult = await client.post('Subscription', subscriptionResource);
        console.log(postSubResult);
    });
});