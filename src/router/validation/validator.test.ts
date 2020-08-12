/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import Validator from './validator';
import validPatient from '../../../sampleData/validV4Patient.json';
import invalidPatient from '../../../sampleData/invalidV4Patient.json';
import validV3Account from '../../../sampleData/validV3Account.json';
import InvalidResourceError from '../../interface/errors/InvalidResourceError';

describe('Validating V4 resources', () => {
    const validatorV4 = new Validator('4.0.1');
    test('No error when validating valid resource', () => {
        const response = validatorV4.validate('Patient', validPatient);
        expect(response).toEqual({ success: true, message: 'Success' });
    });

    test('Show error when validating invalid resource', () => {
        expect(() => validatorV4.validate('Patient', invalidPatient)).toThrowError(
            new InvalidResourceError(
                "data.text should have required property 'div', data.gender should be equal to one of the allowed values",
            ),
        );
    });

    test('Show error when checking for wrong version of FHIR resource', () => {
        expect(() => validatorV4.validate('Account', validV3Account)).toThrowError(
            new InvalidResourceError(
                'data should NOT have additional properties, data should NOT have additional properties, data should NOT have additional properties, data.subject should be array',
            ),
        );
    });
});

describe('Validating V3 resources', () => {
    const validatorV3 = new Validator('3.0.1');
    test('No error when validating valid v3 resource', () => {
        const response = validatorV3.validate('Account', validV3Account);
        expect(response).toEqual({ success: true, message: 'Success' });
    });

    // TODO: Validator does not validate v3 Bundles correctly
    test.skip('No error when validating valid v3 Bundle', () => {
        const bundle = {
            resourceType: 'Bundle',
            type: 'transaction',
            entry: [
                {
                    resource: {
                        resourceType: 'Patient',
                        name: [{ family: 'Smith', given: ['John'] }],
                        gender: 'male',
                    },
                    request: { method: 'POST', url: 'Patient' },
                },
            ],
        };

        const response = validatorV3.validate('Bundle', bundle);
        expect(response).toEqual({ success: true, message: 'Success' });
    });

    test('Show error when validating invalid resource', () => {
        expect(() => validatorV3.validate('Patient', invalidPatient)).toThrowError(
            new InvalidResourceError(
                "data.text should have required property 'div', data.gender should be equal to one of the allowed values",
            ),
        );
    });
});
