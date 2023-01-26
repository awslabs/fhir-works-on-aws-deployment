import { AxiosInstance } from 'axios';
import { getFhirClient, idsOfFhirResources, randomPatient } from './utils';

const sherlockId = idsOfFhirResources.sherlockHolmes;
const watsonId = idsOfFhirResources.johnWatson;
jest.setTimeout(30000);

async function getPatient(client: AxiosInstance, patientId: string) {
    const url = `/Patient/${patientId}`;
    return client.get(url);
}

async function postPatient(client: AxiosInstance) {
    const url = '/Patient/';
    return client.post(url, randomPatient());
}

async function searchEncounter(client: AxiosInstance, patientId: string) {
    const url = `/Encounter/?subject=Patient/${patientId}`;
    return client.get(url);
}

async function searchPatient(client: AxiosInstance, name: string) {
    const url = `/Patient/?name=${name}`;
    return client.get(url);
}

test('Successfully read own user record and records that reference the user', async () => {
    const fhirClient = await getFhirClient(
        'launch/patient patient/Patient.read patient/Encounter.read profile openid',
        false,
    );

    // Can look up own record
    const sherlockRecord = await getPatient(fhirClient, sherlockId);
    expect(sherlockRecord.data.name[0].given).toEqual(['Sherlock']);

    const sherlockSearches = await searchPatient(fhirClient, 'Sherlock');
    expect(sherlockSearches.data.total).toBeGreaterThan(0); // Should return 1+ results
});

describe('SMART AuthZ Negative tests', () => {
    test('Access token with insufficient scope', async () => {
        // FhirClient does not include enough permission because patient/Patient.read scope is missing
        const fhirClient = await getFhirClient('launch/patient profile openid', false);

        await expect(getPatient(fhirClient, sherlockId)).rejects.toMatchObject({
            response: { status: 401 },
        });
    });

    test('Invalid access token', async () => {
        const fhirClient = await getFhirClient('launch/patient patient/Patient.read profile openid', false, {
            providedAccessToken: 'Invalid Access Token',
        });
        await expect(getPatient(fhirClient, sherlockId)).rejects.toMatchObject({
            response: { status: 401 },
        });
    });

    const nonAdminScopes: string[] = [
        'patient/Patient.read',
        'user/Patient.read',
        'patient/Patient.read user/Patient.read',
    ];
    describe.each(nonAdminScopes)('NON-ADMIN with scope: (%p)', (scope: string) => {
        let fhirClient: AxiosInstance;

        beforeAll(async () => {
            fhirClient = await getFhirClient(`launch/patient fhirUser profile openid ${scope}`, false);
        });
        test('Attempt to SEARCH an encounter failing due to scope does not include Encounter', async () => {
            await expect(searchEncounter(fhirClient, sherlockId)).rejects.toMatchObject({
                response: { status: 401 },
            });
        });
        test('Attempt to WRITE a Patient failing due to incorrect access scope', async () => {
            await expect(postPatient(fhirClient)).rejects.toMatchObject({
                response: { status: 401 },
            });
        });

        test("Attempt to READ record of a Patient that doesn't reference the current user", async () => {
            await expect(getPatient(fhirClient, watsonId)).rejects.toMatchObject({
                response: { status: 401 },
            });
        });
        test('Attempt to SEARCH an encounter failing due scope and user does not have a reference', async () => {
            await expect(searchEncounter(fhirClient, watsonId)).rejects.toMatchObject({
                response: { status: 401 },
            });
        });
    });

    const adminScopes: string[] = [
        'patient/Patient.read',
        'user/Patient.read',
        'system/Patient.read',
        'patient/Patient.read user/Patient.read',
        'patient/Patient.read system/Patient.read',
        'system/Patient.read user/Patient.read',
        'patient/Patient.read system/Patient.read user/Patient.read',
    ];
    describe.each(adminScopes)('ADMIN with scope: (%p)', (scope: string) => {
        let fhirClient: AxiosInstance;

        beforeAll(async () => {
            fhirClient = await getFhirClient(`launch/patient fhirUser profile openid ${scope}`, true);
        });
        test('Attempt to SEARCH an encounter failing due to scoped resource', async () => {
            await expect(searchEncounter(fhirClient, sherlockId)).rejects.toMatchObject({
                response: { status: 401 },
            });
        });
        test('Attempt to WRITE a Patient failing due to incorrect access scope', async () => {
            await expect(postPatient(fhirClient)).rejects.toMatchObject({
                response: { status: 401 },
            });
        });
        test('Attempt to SEARCH an encounter failing due scope and user does not have a reference', async () => {
            await expect(searchEncounter(fhirClient, watsonId)).rejects.toMatchObject({
                response: { status: 401 },
            });
        });
    });
    test("ADMIN patient scope: Attempt to read record of a Patient that doesn't reference the current user", async () => {
        const fhirClient = await getFhirClient('launch/patient patient/Patient.read profile openid', true);
        // This is getting the launch/patient as Dr. Bell he does not have access to Watson's records
        await expect(getPatient(fhirClient, watsonId)).rejects.toMatchObject({
            response: { status: 401 },
        });
    });
    test("ADMIN patient&system scope: Attempt to search for a Patient that doesn't reference the current user", async () => {
        const fhirClient = await getFhirClient(
            'launch/patient patient/Patient.read system/Patient.read profile openid',
            true,
        );
        // In our configurations `system` scope does not have `search` operation permissions
        const getPatientAdmin = await searchPatient(fhirClient, 'Watson');
        expect(getPatientAdmin.data.total).toBe(0); // Should return no results
    });

    test('failing XHTML Validation: patient with invalid family name', async () => {
        if (process.env.VALIDATE_XHTML !== 'true') {
            return;
        }
        // BUILD
        const fhirClient = await getFhirClient('user/*.* fhirUser profile openid', true);

        const patient = randomPatient();
        patient.name[0].family = '<script>alert(123);</script>';

        // OPERATE & CHECK
        await expect(fhirClient.post('/Patient/', patient)).rejects.toMatchObject({
            response: { status: 400 },
        });
    });
});
