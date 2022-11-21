import { AxiosInstance } from 'axios';
import { getFhirClient, idsOfFhirResources, randomPatient } from './utils';

const sherlockId = idsOfFhirResources.sherlockHolmes;
const mycroftId = idsOfFhirResources.mycroftHolmes;

async function getPatient(client: AxiosInstance, patientId: string) {
    const url = `/Patient/${patientId}`;
    return client.get(url);
}

async function postPatient(client: AxiosInstance) {
    const url = '/Patient/';
    return client.post(url, randomPatient());
}

async function getEncounter(client: AxiosInstance, encounterId: string) {
    const url = `/Encounter/${encounterId}`;
    return client.get(url);
}

test('Successfully read own user record and records that reference the user', async () => {
    const fhirClient = await getFhirClient('launch/patient patient/Patient.read', false);

    const sherlockRecord = await getPatient(fhirClient, sherlockId);
    expect(sherlockRecord.data.name[0].given).toEqual(['Sherlock']);

    // Sherlock can read Mycroft's record because Mycroft has a reference to Sherlock
    const mycroftRecord = await getPatient(fhirClient, mycroftId);
    expect(mycroftRecord.data.name[0].given).toEqual(['Mycroft']);
});

describe('SMART AuthZ Negative tests', () => {
    test('Access token with insufficient scope', async () => {
        // FhirClient does not include enough permission because patient/Patient.read scope is missing
        const fhirClient = await getFhirClient('launch/patient', false);

        await expect(getPatient(fhirClient, sherlockId)).rejects.toMatchObject({
            response: { status: 401 },
        });
    });

    test('Invalid access token', async () => {
        const fhirClient = await getFhirClient('launch/patient patient/Patient.read', false, {
            providedAccessToken: 'Invalid Access Token',
        });
        await expect(getPatient(fhirClient, sherlockId)).rejects.toMatchObject({
            response: { status: 401 },
        });
    });

    test("Failed to read record of a Patient that doesn't reference the current user", async () => {
        const watsonId = idsOfFhirResources.johnWatson;
        // FhirClient does not include enough permission because Watson doesn't have any reference to Sherlock
        const fhirClient = await getFhirClient('launch/patient patient/Patient.read', false);

        await expect(getPatient(fhirClient, watsonId)).rejects.toMatchObject({
            response: { status: 401 },
        });
    });

    const nonAdminScopes: string[] = [
        'patient/Patient.read',
        'user/Patient.read',
        'patient/Patient.read user/Patient.read',
    ];
    const adminScopes: string[] = [
        'patient/Patient.read',
        'user/Patient.read',
        'system/Patient.read',
        'patient/Patient.read user/Patient.read',
        'patient/Patient.read system/Patient.read',
        'system/Patient.read user/Patient.read',
        'patient/Patient.read system/Patient.read user/Patient.read',
    ];
    describe.each(nonAdminScopes)('NON-ADMIN with scope: (%p)', (scope: string) => {
        let fhirClient: AxiosInstance;

        beforeAll(async () => {
            fhirClient = await getFhirClient(`launch/patient fhirUser ${scope}`, false);
        });
        test('Attempt to READ an encounter failing due to scoped resource', async () => {
            await expect(getEncounter(fhirClient, '1234')).rejects.toMatchObject({
                response: { status: 401 },
            });
        });
        test('Attempt to WRITE a Patient failing due to incorrect access scope', async () => {
            await expect(postPatient(fhirClient)).rejects.toMatchObject({
                response: { status: 401 },
            });
        });
    });
    describe.each(adminScopes)('ADMIN with scope: (%p)', (scope: string) => {
        let fhirClient: AxiosInstance;

        beforeAll(async () => {
            fhirClient = await getFhirClient(`launch/patient fhirUser ${scope}`, true);
        });
        test('Attempt to READ an encounter failing due to scoped resource', async () => {
            await expect(getEncounter(fhirClient, '1234')).rejects.toMatchObject({
                response: { status: 401 },
            });
        });
        test('Attempt to WRITE a Patient failing due to incorrect access scope', async () => {
            await expect(postPatient(fhirClient)).rejects.toMatchObject({
                response: { status: 401 },
            });
        });
    });
});
