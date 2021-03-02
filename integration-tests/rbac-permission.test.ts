import { getFhirClient } from './utils';

const patientRecord = {
    resourceType: 'Patient',
    name: [
        {
            family: 'Smith',
            given: ['John'],
        },
    ],
    gender: 'male',
};

test('practitioner role can create new patient', async () => {
    const client = await getFhirClient(false);
    await expect(client.post('Patient', patientRecord)).resolves.toMatchObject({
        status: 201,
        data: patientRecord,
    });
}, 10000);

describe('Negative tests', () => {
    test('invalid token', async () => {
        const client = await getFhirClient(false, 'Invalid token');
        await expect(client.post('Patient', patientRecord)).rejects.toMatchObject({
            response: { status: 401 },
        });
    });

    test('auditor role cannot create new patient record', async () => {
        const client = await getFhirClient(true);
        await expect(client.post('Patient', patientRecord)).rejects.toMatchObject({
            response: { status: 403 },
        });
    });
});
