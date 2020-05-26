import Validator from './validator';
import ValidationResponse from './validationResponse';
import validPatient from '../../sampleData/validV4Patient.json';
import invalidPatient from '../../sampleData/invalidV4Patient.json';
import validV3Account from '../../sampleData/validV3Account.json';
import { VERSION, R4_RESOURCE } from '../constants';

describe('Validating V4 resources', () => {
    const validatorV4 = new Validator(VERSION.R4_0_1);
    test('No error when validating valid resource', () => {
        const response = validatorV4.validate(R4_RESOURCE.Patient, validPatient);
        expect(response).toEqual(new ValidationResponse(true));
    });

    test('Show error when validating invalid resource', () => {
        const response = validatorV4.validate(R4_RESOURCE.Patient, invalidPatient);
        expect(response).toEqual(
            new ValidationResponse(
                false,
                "data.text should have required property 'div', data.gender should be equal to one of the allowed values",
            ),
        );
    });

    test('Show error when checking for wrong version of FHIR resource', () => {
        const response = validatorV4.validate(R4_RESOURCE.Account, validV3Account);
        expect(response).toEqual(
            new ValidationResponse(
                false,
                'data should NOT have additional properties, data should NOT have additional properties, data should NOT have additional properties, data.subject should be array',
            ),
        );
    });
});

describe('Validating V3 resources', () => {
    const validatorV3 = new Validator(VERSION.R3_0_1);
    test('No error when validating valid v3 resource', () => {
        const response = validatorV3.validate(R4_RESOURCE.Account, validV3Account);
        expect(response).toEqual(new ValidationResponse(true, ''));
    });

    test('Show error when validating invalid resource', () => {
        const response = validatorV3.validate(R4_RESOURCE.Patient, invalidPatient);
        expect(response).toEqual(
            new ValidationResponse(
                false,
                "data.text should have required property 'div', data.gender should be equal to one of the allowed values",
            ),
        );
    });
});
