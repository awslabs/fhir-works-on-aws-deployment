import axios from 'axios';
import { stringify } from 'query-string';

/*
 *  DDB Set Up on SMART Integration Env
 *  Sherlock Holmes (Patient)
 *     id: 92e0d921-bb19-4cae-a3cc-9d3c5bcf7a39
 *     reference: Patient Mycroft Holmes
 *     reference: Practitioner Joseph Bell
 *  Mycroft Holmes (Patient)
 *     id: cf52937f-a28f-437e-bfac-2228f5db6801
 *     reference: Patient Sherlock Holmes
 *     reference: Practitioner Joseph Bell
 *  John Watson (Patient)
 *     id: 7965ea12-7ecd-46cd-9ec1-340400c9548c
 *  Joseph Bell
 *     id: 7cbe5ea4-826d-4de6-86d9-18644b1cc5b7
 */
async function getAuthToken(scopes: string) {
    // Login as Sherlock Holmes
    const data = stringify({
        grant_type: 'password',
        username: process.env.SMART_AUTH_USERNAME,
        password: process.env.SMART_AUTH_PASSWORD,
        scope: scopes,
    });
    const clientId = process.env.SMART_INTEGRATION_TEST_CLIENT_ID;
    const clientPw = process.env.SMART_INTEGRATION_TEST_CLIENT_PW;
    const authToken = `Basic ${Buffer.from(`${clientId}:${clientPw}`).toString('base64')}`;

    const config: any = {
        method: 'post',
        url: `${process.env.SMART_OAUTH2_API_ENDPOINT}/token`,
        headers: {
            Accept: 'application/json',
            Authorization: authToken,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        data,
    };
    const response = await axios(config);
    return response.data.access_token;
}

const sherlockId = '92e0d921-bb19-4cae-a3cc-9d3c5bcf7a39';
const mycroftId = 'cf52937f-a28f-437e-bfac-2228f5db6801';

async function getPatient(accessToken: string, patientId: string | undefined = undefined) {
    const url = patientId
        ? `${process.env.SMART_SERVICE_URL}/Patient/${patientId}`
        : `${process.env.SMART_SERVICE_URL}/Patient`;
    const config: any = {
        method: 'get',
        url,
        headers: {
            Accept: 'application/json',
            'x-api-key': process.env.SMART_API_KEY,
            Authorization: `Bearer ${accessToken}`,
        },
    };

    return axios(config);
}

test('Successfully read Sherlock and Mycroft records', async () => {
    const token = await getAuthToken('launch/patient patient/Patient.read');

    const sherlockRecord = await getPatient(token, sherlockId);
    expect(sherlockRecord.data.name[0].given).toEqual(['Sherlock']);

    // Sherlock can read Mycroft's record because his record has a reference to Mycroft
    const mycroftRecord = await getPatient(token, mycroftId);
    expect(mycroftRecord.data.name[0].given).toEqual(['Mycroft']);
});

describe('Negative tests', () => {
    test('Access token with insufficient scope', async () => {
        // Token does not include enough permission because patient/Patient.read scope is missing
        const token = await getAuthToken('launch/patient');

        await expect(getPatient(token, sherlockId)).rejects.toThrowError(
            new Error('Request failed with status code 403'),
        );
    });

    test('Invalid access token', async () => {
        await expect(getPatient('InvalidAccessToken', sherlockId)).rejects.toThrowError(
            new Error('Request failed with status code 403'),
        );
    });

    test('Failed to read Watson, because of insufficient scope', async () => {
        const watsonId = '7965ea12-7ecd-46cd-9ec1-340400c9548c';
        // Token does not include enough permission because patient/Patient.read scope is missing
        const token = await getAuthToken('launch/patient patient/Patient.read');

        await expect(getPatient(watsonId, token)).rejects.toThrowError(
            new Error('Request failed with status code 403'),
        );
    });
});
