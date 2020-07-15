import MetadataHandler from './metadataHandler';
import { makeOperation } from './cap.rest.resource.template';
import r4FhirConfigGeneric from '../../../sampleData/r4FhirConfigGeneric';
import r4FhirConfigWithExclusions from '../../../sampleData/r4FhirConfigWithExclusions';
import r3FhirConfigWithExclusions from '../../../sampleData/r3FhirConfigWithExclusions';
import r4FhirConfigNoGeneric from '../../../sampleData/r4FhirConfigNoGeneric';
import Validator from '../validation/validator';
import OperationsGenerator from '../operationsGenerator';
import ConfigHandler from '../../configHandler';

const r4Validator = new Validator('4.0.1');
const r3Validator = new Validator('3.0.1');

export const SUPPORTED_R4_RESOURCES = [
    'Account',
    'ActivityDefinition',
    'AdverseEvent',
    'AllergyIntolerance',
    'Appointment',
    'AppointmentResponse',
    'AuditEvent',
    'Basic',
    'Binary',
    'BiologicallyDerivedProduct',
    'BodyStructure',
    'Bundle',
    'CapabilityStatement',
    'CarePlan',
    'CareTeam',
    'CatalogEntry',
    'ChargeItem',
    'ChargeItemDefinition',
    'Claim',
    'ClaimResponse',
    'ClinicalImpression',
    'CodeSystem',
    'Communication',
    'CommunicationRequest',
    'CompartmentDefinition',
    'Composition',
    'ConceptMap',
    'Condition',
    'Consent',
    'Contract',
    'Coverage',
    'CoverageEligibilityRequest',
    'CoverageEligibilityResponse',
    'DetectedIssue',
    'Device',
    'DeviceDefinition',
    'DeviceMetric',
    'DeviceRequest',
    'DeviceUseStatement',
    'DiagnosticReport',
    'DocumentManifest',
    'DocumentReference',
    'EffectEvidenceSynthesis',
    'Encounter',
    'Endpoint',
    'EnrollmentRequest',
    'EnrollmentResponse',
    'EpisodeOfCare',
    'EventDefinition',
    'Evidence',
    'EvidenceVariable',
    'ExampleScenario',
    'ExplanationOfBenefit',
    'FamilyMemberHistory',
    'Flag',
    'Goal',
    'GraphDefinition',
    'Group',
    'GuidanceResponse',
    'HealthcareService',
    'ImagingStudy',
    'Immunization',
    'ImmunizationEvaluation',
    'ImmunizationRecommendation',
    'ImplementationGuide',
    'InsurancePlan',
    'Invoice',
    'Library',
    'Linkage',
    'List',
    'Location',
    'Measure',
    'MeasureReport',
    'Media',
    'Medication',
    'MedicationAdministration',
    'MedicationDispense',
    'MedicationKnowledge',
    'MedicationRequest',
    'MedicationStatement',
    'MedicinalProduct',
    'MedicinalProductAuthorization',
    'MedicinalProductContraindication',
    'MedicinalProductIndication',
    'MedicinalProductIngredient',
    'MedicinalProductOperation',
    'MedicinalProductManufactured',
    'MedicinalProductPackaged',
    'MedicinalProductPharmaceutical',
    'MedicinalProductUndesirableEffect',
    'MessageDefinition',
    'MessageHeader',
    'MolecularSequence',
    'NamingSystem',
    'NutritionOrder',
    'Observation',
    'ObservationDefinition',
    'OperationDefinition',
    'OperationOutcome',
    'Organization',
    'OrganizationAffiliation',
    'Parameters',
    'Patient',
    'PaymentNotice',
    'PaymentReconciliation',
    'Person',
    'PlanDefinition',
    'Practitioner',
    'PractitionerRole',
    'Procedure',
    'Provenance',
    'Questionnaire',
    'QuestionnaireResponse',
    'RelatedPerson',
    'RequestGroup',
    'ResearchDefinition',
    'ResearchElementDefinition',
    'ResearchStudy',
    'ResearchSubject',
    'RiskAssessment',
    'RiskEvidenceSynthesis',
    'Schedule',
    'SearchParameter',
    'ServiceRequest',
    'Slot',
    'Specimen',
    'SpecimenDefinition',
    'StructureDefinition',
    'StructureMap',
    'Subscription',
    'Substance',
    'SubstancePolymer',
    'SubstanceProtein',
    'SubstanceReferenceInformation',
    'SubstanceSpecification',
    'SubstanceSourceMaterial',
    'SupplyDelivery',
    'SupplyRequest',
    'Task',
    'TerminologyCapabilities',
    'TestReport',
    'TestScript',
    'ValueSet',
    'VerificationResult',
    'VisionPrescription',
];

export const SUPPORTED_R3_RESOURCES = [
    'Account',
    'ActivityDefinition',
    'AdverseEvent',
    'AllergyIntolerance',
    'Appointment',
    'AppointmentResponse',
    'AuditEvent',
    'Basic',
    'Binary',
    'BodySite',
    'Bundle',
    'CapabilityStatement',
    'CarePlan',
    'CareTeam',
    'ChargeItem',
    'Claim',
    'ClaimResponse',
    'ClinicalImpression',
    'CodeSystem',
    'Communication',
    'CommunicationRequest',
    'CompartmentDefinition',
    'Composition',
    'ConceptMap',
    'Condition',
    'Consent',
    'Contract',
    'Coverage',
    'DataElement',
    'DetectedIssue',
    'Device',
    'DeviceComponent',
    'DeviceMetric',
    'DeviceRequest',
    'DeviceUseStatement',
    'DiagnosticReport',
    'DocumentManifest',
    'DocumentReference',
    'EligibilityRequest',
    'EligibilityResponse',
    'Encounter',
    'Endpoint',
    'EnrollmentRequest',
    'EnrollmentResponse',
    'EpisodeOfCare',
    'ExpansionProfile',
    'ExplanationOfBenefit',
    'FamilyMemberHistory',
    'Flag',
    'Goal',
    'GraphDefinition',
    'Group',
    'GuidanceResponse',
    'HealthcareService',
    'ImagingManifest',
    'ImagingStudy',
    'Immunization',
    'ImmunizationRecommendation',
    'ImplementationGuide',
    'Library',
    'Linkage',
    'List',
    'Location',
    'Measure',
    'MeasureReport',
    'Media',
    'Medication',
    'MedicationAdministration',
    'MedicationDispense',
    'MedicationRequest',
    'MedicationStatement',
    'MessageDefinition',
    'MessageHeader',
    'NamingSystem',
    'NutritionOrder',
    'Observation',
    'OperationDefinition',
    'OperationOutcome',
    'Organization',
    'Parameters',
    'Patient',
    'PaymentNotice',
    'PaymentReconciliation',
    'Person',
    'PlanDefinition',
    'Practitioner',
    'PractitionerRole',
    'Procedure',
    'ProcedureRequest',
    'ProcessRequest',
    'ProcessResponse',
    'Provenance',
    'Questionnaire',
    'QuestionnaireResponse',
    'ReferralRequest',
    'RelatedPerson',
    'RequestGroup',
    'ResearchStudy',
    'ResearchSubject',
    'RiskAssessment',
    'Schedule',
    'SearchParameter',
    'Sequence',
    'ServiceDefinition',
    'Slot',
    'Specimen',
    'StructureDefinition',
    'StructureMap',
    'Subscription',
    'Substance',
    'SupplyDelivery',
    'SupplyRequest',
    'Task',
    'TestScript',
    'TestReport',
    'ValueSet',
    'VisionPrescription',
];

test('R3: Asking for V4 when only supports V3', async () => {
    const configHandler: ConfigHandler = new ConfigHandler(r3FhirConfigWithExclusions, SUPPORTED_R3_RESOURCES);
    const metadataHandler: MetadataHandler = new MetadataHandler(configHandler);
    const response = await metadataHandler.generateCapabilityStatement('4.0.1');
    expect(response).toEqual(OperationsGenerator.generateError(`FHIR version 4.0.1 is not supported`));
});

test('R3: FHIR Config V3 with 2 exclusions and search', async () => {
    const configHandler: ConfigHandler = new ConfigHandler(r3FhirConfigWithExclusions, SUPPORTED_R3_RESOURCES);
    const metadataHandler: MetadataHandler = new MetadataHandler(configHandler);
    const response = await metadataHandler.generateCapabilityStatement('3.0.1');
    const { genericResource } = r3FhirConfigWithExclusions.profile;
    const excludedResources = genericResource ? genericResource.excludedR3Resources || [] : [];
    const expectedSubset = {
        acceptUnknown: 'no',
        fhirVersion: '3.0.1',
    };
    expect(response).toMatchObject(expectedSubset);
    expect(response.rest.length).toEqual(1);
    expect(response.rest[0].resource.length).toEqual(SUPPORTED_R3_RESOURCES.length - excludedResources.length);
    // see if just READ is chosen for generic
    let isExcludedResourceFound = false;
    response.rest[0].resource.forEach((resource: any) => {
        if (excludedResources.includes(resource.type)) {
            isExcludedResourceFound = true;
        }
        const expectedResourceSubset = {
            interaction: makeOperation(['read', 'create', 'update', 'vread', 'search-type']),
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

    expect(response.rest[0].interaction).toEqual(makeOperation(r3FhirConfigWithExclusions.profile.systemOperations));
    expect(response.rest[0].searchParam).toBeUndefined();
    expect(r3Validator.validate('CapabilityStatement', response)).toEqual({ success: true, message: 'Success' });
});

test('R4: Asking for V3 when only supports V4', async () => {
    const configHandler: ConfigHandler = new ConfigHandler(r4FhirConfigGeneric, SUPPORTED_R4_RESOURCES);
    const metadataHandler: MetadataHandler = new MetadataHandler(configHandler);
    const response = await metadataHandler.generateCapabilityStatement('3.0.1');
    expect(response).toEqual(OperationsGenerator.generateError('FHIR version 3.0.1 is not supported'));
});

test('R4: FHIR Config V4 without search', async () => {
    const configHandler: ConfigHandler = new ConfigHandler(r4FhirConfigGeneric, SUPPORTED_R4_RESOURCES);
    const metadataHandler: MetadataHandler = new MetadataHandler(configHandler);
    const response = await metadataHandler.generateCapabilityStatement('4.0.1');
    expect(response.acceptUnknown).toBeUndefined();
    expect(response.fhirVersion).toEqual('4.0.1');
    expect(response.rest.length).toEqual(1);
    expect(response.rest[0].resource.length).toEqual(SUPPORTED_R4_RESOURCES.length);
    // see if the four CRUD + vRead operations are chosen
    const expectedResourceSubset = {
        interaction: makeOperation(['create', 'read', 'update', 'delete', 'vread', 'history-instance']),
        updateCreate: true,
    };
    expect(response.rest[0].resource[0]).toMatchObject(expectedResourceSubset);
    expect(response.rest[0].interaction).toEqual(makeOperation(r4FhirConfigGeneric.profile.systemOperations));
    expect(response.rest[0].searchParam).toBeUndefined();
    expect(r4Validator.validate('CapabilityStatement', response)).toEqual({ success: true, message: 'Success' });
});

test('R4: FHIR Config V4 with 3 exclusions and AllergyIntollerance special', async () => {
    const configHandler: ConfigHandler = new ConfigHandler(r4FhirConfigWithExclusions, SUPPORTED_R4_RESOURCES);
    const metadataHandler: MetadataHandler = new MetadataHandler(configHandler);
    const response = await metadataHandler.generateCapabilityStatement('4.0.1');
    const { genericResource } = r4FhirConfigWithExclusions.profile;
    const excludedResources = genericResource ? genericResource.excludedR4Resources || [] : [];
    expect(response.acceptUnknown).toBeUndefined();
    expect(response.fhirVersion).toEqual('4.0.1');
    expect(response.rest.length).toEqual(1);
    expect(response.rest[0].resource.length).toEqual(SUPPORTED_R4_RESOURCES.length - excludedResources.length);
    // see if just READ is chosen for generic
    let isExclusionFound = false;
    response.rest[0].resource.forEach((resource: any) => {
        if (excludedResources.includes(resource.type)) {
            isExclusionFound = true;
        }

        let expectedResourceSubset = {};

        if (resource.type === 'AllergyIntolerance') {
            expectedResourceSubset = {
                interaction: makeOperation(['create', 'update']),
                updateCreate: true,
            };
        } else {
            expectedResourceSubset = {
                interaction: makeOperation(['read', 'history-instance', 'history-type']),
                updateCreate: false,
            };
        }
        expect(resource).toMatchObject(expectedResourceSubset);
        expect(resource.searchParam).toBeUndefined();
    });
    expect(isExclusionFound).toBeFalsy();
    expect(response.rest[0].interaction).toEqual(makeOperation(r4FhirConfigWithExclusions.profile.systemOperations));
    expect(response.rest[0].searchParam).toBeDefined();
    expect(r4Validator.validate('CapabilityStatement', response)).toEqual({ success: true, message: 'Success' });
});

test('R4: FHIR Config V4 no generic set-up & mix of R3 & R4', async () => {
    const configHandler: ConfigHandler = new ConfigHandler(r4FhirConfigNoGeneric, SUPPORTED_R4_RESOURCES);
    const metadataHandler: MetadataHandler = new MetadataHandler(configHandler);
    const configResource: any = r4FhirConfigNoGeneric.profile.resources;
    const response = await metadataHandler.generateCapabilityStatement('4.0.1');
    expect(response.acceptUnknown).toBeUndefined();
    expect(response.fhirVersion).toEqual('4.0.1');
    expect(response.rest.length).toEqual(1);
    expect(response.rest[0].resource.length).toEqual(3);
    // see if just READ is chosen for generic
    let isR3ResourceFound = false;
    response.rest[0].resource.forEach((resource: any) => {
        if (resource.type === 'AllergyIntolerance') {
            isR3ResourceFound = true;
        }
        const expectedResourceSubset = {
            interaction: makeOperation(configResource[resource.type].operations),
            updateCreate: configResource[resource.type].operations.includes('update'),
        };
        expect(resource).toMatchObject(expectedResourceSubset);
        if (configResource[resource.type].operations.includes('search-type')) {
            expect(resource.searchParam).toBeDefined();
        } else {
            expect(resource.searchParam).toBeUndefined();
        }
    });
    expect(isR3ResourceFound).toBeFalsy();
    expect(response.rest[0].interaction).toEqual(makeOperation(r4FhirConfigNoGeneric.profile.systemOperations));
    expect(response.rest[0].searchParam).toBeDefined();
    expect(r4Validator.validate('CapabilityStatement', response)).toEqual({ success: true, message: 'Success' });
});
