import { getFhirClient, randomPatient } from './utils';

jest.setTimeout(60 * 1000);

test('practitioner role can create new patient', async () => {
    const client = await getFhirClient('practitioner');
    const patientRecord: any = randomPatient();
    delete patientRecord.id;
    await expect(client.post('Patient', patientRecord)).resolves.toMatchObject({
        status: 201,
        data: patientRecord,
    });
});

describe('Negative tests', () => {
    test('invalid token', async () => {
        const client = await getFhirClient('practitioner', 'Invalid token');
        await expect(client.post('Patient', randomPatient())).rejects.toMatchObject({
            response: { status: 401 },
        });
    });

    test('auditor role cannot create new patient record', async () => {
        const client = await getFhirClient('auditor');
        await expect(client.post('Patient', randomPatient())).rejects.toMatchObject({
            response: { status: 401 },
        });
    });
});
