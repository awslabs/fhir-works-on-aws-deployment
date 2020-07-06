import Validator from './validator';
import validPatient from '../../sampleData/validV4Patient.json';
import invalidPatient from '../../sampleData/invalidV4Patient.json';
import validV3Account from '../../sampleData/validV3Account.json';

describe('Validating V4 resources', () => {
    const validatorV4 = new Validator('4.0.1');
    test('No error when validating valid resource', () => {
        const response = validatorV4.validate('Patient', validPatient);
        expect(response).toEqual({ success: true, message: 'Success' });
    });

    test('Show error when validating invalid resource', () => {
        const response = validatorV4.validate('Patient', invalidPatient);
        expect(response).toEqual({
            success: false,
            message:
                "data.text should have required property 'div', data.gender should be equal to one of the allowed values",
        });
    });

    test('Show error when checking for wrong version of FHIR resource', () => {
        const response = validatorV4.validate('Account', validV3Account);
        expect(response).toEqual({
            success: false,
            message:
                'data should NOT have additional properties, data should NOT have additional properties, data should NOT have additional properties, data.subject should be array',
        });
    });
});

describe('Validating V3 resources', () => {
    const validatorV3 = new Validator('3.0.1');
    test('No error when validating valid v3 resource', () => {
        const response = validatorV3.validate('Account', validV3Account);
        expect(response).toEqual({ success: true, message: 'Success' });
    });

    test('Show error when validating invalid resource', () => {
        const response = validatorV3.validate('Patient', invalidPatient);
        expect(response).toEqual({
            success: false,
            message:
                "data.text should have required property 'div', data.gender should be equal to one of the allowed values",
        });
    });
});
