import { getFhirClient, randomPatient } from './utils';

test('practitioner role can create new patient', async () => {
    const client = await getFhirClient(false);
    const patientRecord: any = randomPatient();
    delete patientRecord.id;
    await expect(client.post('Patient', patientRecord)).resolves.toMatchObject({
        status: 201,
        data: patientRecord,
    });
}, 10000);

describe('Negative tests', () => {
    test('invalid token', async () => {
        const client = await getFhirClient(false, 'Invalid token');
        await expect(client.post('Patient', randomPatient())).rejects.toMatchObject({
            response: { status: 401 },
        });
    });

    test('auditor role cannot create new patient record', async () => {
        const client = await getFhirClient(true);
        await expect(client.post('Patient', randomPatient())).rejects.toMatchObject({
            response: { status: 403 },
        });
    });
});
