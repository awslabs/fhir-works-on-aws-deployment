import MetadataHandler from './metadataHandler';
import { makeInteraction } from './cap.rest.resource.template';
import r4FhirConfigGeneric from '../../sampleData/r4FhirConfigGeneric';
import r4FhirConfigWithExclusions from '../../sampleData/r4FhirConfigWithExclusions';
import r3FhirConfigWithExclusions from '../../sampleData/r3FhirConfigWithExclusions';
import r4FhirConfigNoGeneric from '../../sampleData/r4FhirConfigNoGeneric';

import { VERSION, R4_RESOURCE, R3_RESOURCE, INTERACTION } from '../constants';
import Validator from '../validation/validator';
import ValidationResponse from '../validation/validationResponse';
import OperationsGenerator from '../operationsGenerator';

const r4Validator = new Validator(VERSION.R4_0_1);
const r3Validator = new Validator(VERSION.R3_0_1);

test('R3: Asking for V4 when only supports V3', async () => {
    const metadataHandler: MetadataHandler = new MetadataHandler(r3FhirConfigWithExclusions);
    const response = await metadataHandler.generateCapabilityStatement(VERSION.R4_0_1);
    expect(response).toEqual(OperationsGenerator.generateError(`FHIR version ${VERSION.R4_0_1} is not supported`));
});

test('R3: FHIR Config V3 with 2 exclusions and search', async () => {
    const metadataHandler: MetadataHandler = new MetadataHandler(r3FhirConfigWithExclusions);
    const response = await metadataHandler.generateCapabilityStatement(VERSION.R3_0_1);
    const { genericResource } = r3FhirConfigWithExclusions.profile;
    const excludedResources = genericResource ? genericResource.excludedR3Resources || [] : [];
    const expectedSubset = {
        acceptUnknown: 'no',
        fhirVersion: VERSION.R3_0_1,
    };
    expect(response).toMatchObject(expectedSubset);
    expect(response.rest.length).toEqual(1);
    expect(response.rest[0].resource.length).toEqual(Object.keys(R3_RESOURCE).length - excludedResources.length);
    // see if just READ is chosen for generic
    let isExcludedResourceFound = false;
    response.rest[0].resource.forEach((resource: any) => {
        if (excludedResources.includes(resource.type)) {
            isExcludedResourceFound = true;
        }
        const expectedResourceSubset = {
            interaction: makeInteraction([INTERACTION.READ, INTERACTION.CREATE, INTERACTION.UPDATE, INTERACTION.VREAD]),
            updateCreate: true,
            searchParam: [
                {
                    name: 'ALL',
                    type: 'composite',
                    documentation: 'Support all fields.',
                },
            ],
        };
        expect(resource).toMatchObject(expectedResourceSubset);
    });
    expect(isExcludedResourceFound).toBeFalsy();
    expect(r3Validator.validate(R3_RESOURCE.CapabilityStatement, response)).toEqual(new ValidationResponse(true));
});

test('R4: Asking for V3 when only supports V4', async () => {
    const metadataHandler: MetadataHandler = new MetadataHandler(r4FhirConfigGeneric);
    const response = await metadataHandler.generateCapabilityStatement(VERSION.R3_0_1);
    expect(response).toEqual(OperationsGenerator.generateError(`FHIR version ${VERSION.R3_0_1} is not supported`));
});

test('R4: FHIR Config V4 with search', async () => {
    const metadataHandler: MetadataHandler = new MetadataHandler(r4FhirConfigGeneric);
    const response = await metadataHandler.generateCapabilityStatement(VERSION.R4_0_1);
    expect(response.acceptUnknown).toBeUndefined();
    expect(response.fhirVersion).toEqual(VERSION.R4_0_1);
    expect(response.rest.length).toEqual(1);
    expect(response.rest[0].resource.length).toEqual(Object.keys(R4_RESOURCE).length);
    // see if the four CRUD + vRead operations are chosen
    const expectedResourceSubset = {
        interaction: makeInteraction([
            INTERACTION.CREATE,
            INTERACTION.READ,
            INTERACTION.UPDATE,
            INTERACTION.DELETE,
            INTERACTION.VREAD,
        ]),
        updateCreate: true,
        searchParam: [
            {
                name: 'ALL',
                type: 'composite',
                documentation: 'Support all fields.',
            },
        ],
    };
    expect(response.rest[0].resource[0]).toMatchObject(expectedResourceSubset);
    expect(r4Validator.validate(R4_RESOURCE.CapabilityStatement, response)).toEqual(new ValidationResponse(true));
});

test('R4: FHIR Config V4 with 3 exclusions and AllergyIntollerance special', async () => {
    const metadataHandler: MetadataHandler = new MetadataHandler(r4FhirConfigWithExclusions);
    const response = await metadataHandler.generateCapabilityStatement(VERSION.R4_0_1);
    const { genericResource } = r4FhirConfigWithExclusions.profile;
    const excludedResources = genericResource ? genericResource.excludedR4Resources || [] : [];
    expect(response.acceptUnknown).toBeUndefined();
    expect(response.fhirVersion).toEqual(VERSION.R4_0_1);
    expect(response.rest.length).toEqual(1);
    expect(response.rest[0].resource.length).toEqual(Object.keys(R4_RESOURCE).length - excludedResources.length);
    // see if just READ is chosen for generic
    let isExclusionFound = false;
    response.rest[0].resource.forEach((resource: any) => {
        if (excludedResources.includes(resource.type)) {
            isExclusionFound = true;
        }

        let expectedResourceSubset = {};

        if (resource.type === 'AllergyIntolerance') {
            expectedResourceSubset = {
                interaction: makeInteraction([INTERACTION.CREATE, INTERACTION.UPDATE]),
                updateCreate: true,
            };
        } else {
            expectedResourceSubset = {
                interaction: makeInteraction([INTERACTION.READ]),
                updateCreate: false,
            };
        }
        expect(resource).toMatchObject(expectedResourceSubset);
        expect(resource.searchParam).toBeUndefined();
    });
    expect(isExclusionFound).toBeFalsy();
    expect(r4Validator.validate(R4_RESOURCE.CapabilityStatement, response)).toEqual(new ValidationResponse(true));
});

test('R4: FHIR Config V4 no generic set-up & mix of R3 & R4', async () => {
    const metadataHandler: MetadataHandler = new MetadataHandler(r4FhirConfigNoGeneric);
    const configResource: any = r4FhirConfigNoGeneric.profile.resources;
    const response = await metadataHandler.generateCapabilityStatement(VERSION.R4_0_1);
    expect(response.acceptUnknown).toBeUndefined();
    expect(response.fhirVersion).toEqual(VERSION.R4_0_1);
    expect(response.rest.length).toEqual(1);
    expect(response.rest[0].resource.length).toEqual(3);
    // see if just READ is chosen for generic
    let isR3ResourceFound = false;
    response.rest[0].resource.forEach((resource: any) => {
        if (resource.type === 'AllergyIntolerance') {
            isR3ResourceFound = true;
        }
        const expectedResourceSubset = {
            interaction: makeInteraction(configResource[resource.type].interactions),
            updateCreate: configResource[resource.type].interactions.includes(INTERACTION.UPDATE),
        };
        expect(resource).toMatchObject(expectedResourceSubset);
        expect(resource.searchParam).toBeUndefined();
    });
    expect(isR3ResourceFound).toBeFalsy();
    expect(r4Validator.validate(R4_RESOURCE.CapabilityStatement, response)).toEqual(new ValidationResponse(true));
});
// TODO add R3 tests once Tim merges in R3 schema changes
