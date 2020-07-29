/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import Ajv from 'ajv';
// @ts-ignore
import schemaDraft06 from 'ajv/lib/refs/json-schema-draft-06.json';
import schemaDraft04 from 'ajv/lib/refs/json-schema-draft-04.json';

// @ts-ignore
import fhirV4Schema from '../../../schemas/fhir.schema.v4.json';
import fhirV3Schema from '../../../schemas/fhir.schema.v3.json';
import GenericResponse from '../../interface/genericResponse';
import { FhirVersion } from '../../interface/constants';

export default class Validator {
    private ajv: any;

    constructor(fhirVersion: FhirVersion) {
        const ajv = new Ajv({ schemaId: 'auto', allErrors: true });
        if (fhirVersion === '4.0.1') {
            ajv.addMetaSchema(schemaDraft06);
            ajv.addSchema(fhirV4Schema);
        }
        if (fhirVersion === '3.0.1') {
            ajv.addMetaSchema(schemaDraft04);
            ajv.addSchema(fhirV3Schema);
        }
        this.ajv = ajv;
    }

    validate(definitionName: string, data: any): GenericResponse {
        const referenceName = `#/definitions/${definitionName}`;
        try {
            const result = this.ajv.validate(referenceName, data);
            if (!result) {
                return { success: false, message: this.ajv.errorsText() };
            }
            return { success: true, message: 'Success' };
        } catch (e) {
            const message = `Failed to validate ${definitionName}.`;
            console.error(message, e);
            return { success: false, message };
        }
    }
}
