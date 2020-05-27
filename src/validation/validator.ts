import Ajv from 'ajv';
// @ts-ignore
import schemaDraft06 from 'ajv/lib/refs/json-schema-draft-06.json';
import schemaDraft04 from 'ajv/lib/refs/json-schema-draft-04.json';

// @ts-ignore
import fhirV4Schema from '../../schemas/fhir.schema.v4.json';
import fhirV3Schema from '../../schemas/fhir.schema.v3.json';
import ValidationResponse from './validationResponse';
import { VERSION } from '../constants';

export default class Validator {
    private ajv: any;

    constructor(fhirVersion: VERSION) {
        const ajv = new Ajv({ schemaId: 'auto', allErrors: true });
        if (fhirVersion === VERSION.R4_0_1) {
            ajv.addMetaSchema(schemaDraft06);
            ajv.addSchema(fhirV4Schema);
        }
        if (fhirVersion === VERSION.R3_0_1) {
            ajv.addMetaSchema(schemaDraft04);
            ajv.addSchema(fhirV3Schema);
        }
        this.ajv = ajv;
    }

    validate(definitionName: string, data: any) {
        const referenceName = `#/definitions/${definitionName}`;
        try {
            const result = this.ajv.validate(referenceName, data);
            let validationResponse = new ValidationResponse(true);
            if (!result) {
                validationResponse = new ValidationResponse(false, this.ajv.errorsText());
            }
            return validationResponse;
        } catch (e) {
            const message = `Failed to validate ${definitionName}.`;
            console.error(message, e);
            return new ValidationResponse(false, message);
        }
    }
}
