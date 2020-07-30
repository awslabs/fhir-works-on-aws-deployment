/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export type IssueSeverity = 'fatal' | 'error' | 'warning' | 'information';

// Codes defined here= https://www.hl7.org/fhir/valueset-issue-type.html
export type IssueCode =
    // Invalid can be seen as a parent essentially to these, see Level on above url
    // This means structure, required, value, and invariant, are all also invalid
    // you can send invalid back or something more specific
    | 'invalid'
    | 'structure'
    | 'required'
    | 'value'
    | 'invariant'
    // Security is parent of login, unknown, expired, forbidden, and surpressed
    | 'security'
    | 'login'
    | 'unknown'
    | 'expired'
    | 'forbidden'
    | 'surpressed'
    // Procesing has no parent/children
    | 'processing'
    // Not Supported is parent of duplicate, not found, and too long
    | 'not-supported'
    | 'duplicate'
    | 'not-found'
    | 'too-long'
    // Code invalid is parent of extension, too costly, business rule, conflict, and incomplete
    | 'code-invalid'
    | 'extension'
    | 'too-costly'
    | 'business-rule'
    | 'conflict'
    | 'incomplete'
    // Transient is parent of lock error, no store, exception, timeout, and throttled
    | 'transient'
    | 'lock-error'
    | 'no-store'
    | 'exception'
    | 'timeout'
    | 'throttled'
    // Informational has no parent/children
    | 'informational';

/**
 * Type Operations
 * https://www.hl7.org/fhir/valueset-type-restful-interaction.html
 */
export type TypeOperation =
    | 'create'
    | 'read'
    | 'vread'
    | 'update'
    | 'delete'
    | 'patch'
    | 'history-type'
    | 'history-instance'
    | 'search-type';

/**
 * System Operations
 * https://www.hl7.org/fhir/valueset-system-restful-interaction.html
 */
export type SystemOperation = 'transaction' | 'batch' | 'search-system' | 'history-system';

/**
 * The version of the fhir configuration being used
 */
export type ConfigVersion = 1.0;

/**
 * These are currently the only versions we support
 */
export type FhirVersion = '3.0.1' | '4.0.1';

export type R4Resource =
    | R3Resource
    | 'BiologicallyDerivedProduct'
    | 'BodyStructure'
    | 'CatalogEntry'
    | 'ChargeItemDefinition'
    | 'CoverageEligibilityRequest'
    | 'CoverageEligibilityResponse'
    | 'DeviceDefinition'
    | 'EffectEvidenceSynthesis'
    | 'EventDefinition'
    | 'Evidence'
    | 'EvidenceVariable'
    | 'ExampleScenario'
    | 'ImmunizationEvaluation'
    | 'InsurancePlan'
    | 'Invoice'
    | 'MedicationKnowledge'
    | 'MedicinalProduct'
    | 'MedicinalProductAuthorization'
    | 'MedicinalProductContraindication'
    | 'MedicinalProductIndication'
    | 'MedicinalProductIngredient'
    | 'MedicinalProductOperation'
    | 'MedicinalProductManufactured'
    | 'MedicinalProductPackaged'
    | 'MedicinalProductPharmaceutical'
    | 'MedicinalProductUndesirableEffect'
    | 'MolecularSequence'
    | 'ObservationDefinition'
    | 'OrganizationAffiliation'
    | 'ResearchDefinition'
    | 'ResearchElementDefinition'
    | 'RiskEvidenceSynthesis'
    | 'ServiceRequest'
    | 'SpecimenDefinition'
    | 'SubstancePolymer'
    | 'SubstanceProtein'
    | 'SubstanceReferenceInformation'
    | 'SubstanceSpecification'
    | 'SubstanceSourceMaterial'
    | 'TerminologyCapabilities'
    | 'VerificationResult';

export type R3Resource =
    | 'Account'
    | 'ActivityDefinition'
    | 'AdverseEvent'
    | 'AllergyIntolerance'
    | 'Appointment'
    | 'AppointmentResponse'
    | 'AuditEvent'
    | 'Basic'
    | 'Binary'
    | 'BodySite'
    | 'Bundle'
    | 'CapabilityStatement'
    | 'CarePlan'
    | 'CareTeam'
    | 'ChargeItem'
    | 'Claim'
    | 'ClaimResponse'
    | 'ClinicalImpression'
    | 'CodeSystem'
    | 'Communication'
    | 'CommunicationRequest'
    | 'CompartmentDefinition'
    | 'Composition'
    | 'ConceptMap'
    | 'Condition'
    | 'Consent'
    | 'Contract'
    | 'Coverage'
    | 'DataElement'
    | 'DetectedIssue'
    | 'Device'
    | 'DeviceComponent'
    | 'DeviceMetric'
    | 'DeviceRequest'
    | 'DeviceUseStatement'
    | 'DiagnosticReport'
    | 'DocumentManifest'
    | 'DocumentReference'
    | 'EligibilityRequest'
    | 'EligibilityResponse'
    | 'Encounter'
    | 'Endpoint'
    | 'EnrollmentRequest'
    | 'EnrollmentResponse'
    | 'EpisodeOfCare'
    | 'ExpansionProfile'
    | 'ExplanationOfBenefit'
    | 'FamilyMemberHistory'
    | 'Flag'
    | 'Goal'
    | 'GraphDefinition'
    | 'Group'
    | 'GuidanceResponse'
    | 'HealthcareService'
    | 'ImagingManifest'
    | 'ImagingStudy'
    | 'Immunization'
    | 'ImmunizationRecommendation'
    | 'ImplementationGuide'
    | 'Library'
    | 'Linkage'
    | 'List'
    | 'Location'
    | 'Measure'
    | 'MeasureReport'
    | 'Media'
    | 'Medication'
    | 'MedicationAdministration'
    | 'MedicationDispense'
    | 'MedicationRequest'
    | 'MedicationStatement'
    | 'MessageDefinition'
    | 'MessageHeader'
    | 'NamingSystem'
    | 'NutritionOrder'
    | 'Observation'
    | 'OperationDefinition'
    | 'OperationOutcome'
    | 'Organization'
    | 'Parameters'
    | 'Patient'
    | 'PaymentNotice'
    | 'PaymentReconciliation'
    | 'Person'
    | 'PlanDefinition'
    | 'Practitioner'
    | 'PractitionerRole'
    | 'Procedure'
    | 'ProcedureRequest'
    | 'ProcessRequest'
    | 'ProcessResponse'
    | 'Provenance'
    | 'Questionnaire'
    | 'QuestionnaireResponse'
    | 'ReferralRequest'
    | 'RelatedPerson'
    | 'RequestGroup'
    | 'ResearchStudy'
    | 'ResearchSubject'
    | 'RiskAssessment'
    | 'Schedule'
    | 'SearchParameter'
    | 'Sequence'
    | 'ServiceDefinition'
    | 'Slot'
    | 'Specimen'
    | 'StructureDefinition'
    | 'StructureMap'
    | 'Subscription'
    | 'Substance'
    | 'SupplyDelivery'
    | 'SupplyRequest'
    | 'Task'
    | 'TestScript'
    | 'TestReport'
    | 'ValueSet'
    | 'VisionPrescription';
