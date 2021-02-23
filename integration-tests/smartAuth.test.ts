import { AxiosInstance } from 'axios';
import { getFhirClient } from './utils';

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

const sherlockId = '92e0d921-bb19-4cae-a3cc-9d3c5bcf7a39';
const mycroftId = 'cf52937f-a28f-437e-bfac-2228f5db6801';

async function getPatient(client: AxiosInstance, patientId: string | undefined = undefined) {
    const url = patientId ? `/Patient/${patientId}` : '/Patient';

    return client.get(url);
}

test('Successfully read Sherlock and Mycroft records', async () => {
    const fhirClient = await getFhirClient('launch/patient patient/Patient.read', false);

    const sherlockRecord = await getPatient(fhirClient, sherlockId);
    expect(sherlockRecord.data.name[0].given).toEqual(['Sherlock']);

    // Sherlock can read Mycroft's record because his record has a reference to Mycroft
    const mycroftRecord = await getPatient(fhirClient, mycroftId);
    expect(mycroftRecord.data.name[0].given).toEqual(['Mycroft']);
});

describe('Negative tests', () => {
    test('Access token with insufficient scope', async () => {
        // FhirClient does not include enough permission because patient/Patient.read scope is missing
        const fhirClient = await getFhirClient('launch/patient', false);

        await expect(getPatient(fhirClient, sherlockId)).rejects.toThrowError(
            new Error('Request failed with status code 403'),
        );
    });

    test('Invalid access token', async () => {
        const fhirClient = await getFhirClient('launch/patient patient/Patient.read', false, 'Invalid Access Token');
        await expect(getPatient(fhirClient, sherlockId)).rejects.toThrowError(
            new Error('Request failed with status code 403'),
        );
    });

    test('Failed to read Watson, because of insufficient scope', async () => {
        const watsonId = '7965ea12-7ecd-46cd-9ec1-340400c9548c';
        // FhirClient does not include enough permission because patient/Patient.read scope is missing
        const fhirClient = await getFhirClient('launch/patient patient/Patient.read', false);

        await expect(getPatient(fhirClient, watsonId)).rejects.toThrowError(
            new Error('Request failed with status code 403'),
        );
    });
});
