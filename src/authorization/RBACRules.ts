import { RBACConfig } from './RBACConfig';
import { SUPPORTED_R4_RESOURCES } from '../constants';
import { R4Resource } from '../interface/constants';

export const financialResources: R4Resource[] = [
    'Coverage',
    'CoverageEligibilityRequest',
    'CoverageEligibilityResponse',
    'EnrollmentRequest',
    'EnrollmentResponse',
    'Claim',
    'ClaimResponse',
    'Invoice',
    'PaymentNotice',
    'PaymentReconciliation',
    'Account',
    'ChargeItem',
    'ChargeItemDefinition',
    'Contract',
    'ExplanationOfBenefit',
    'InsurancePlan',
];

const RBACRules: RBACConfig = {
    version: 1.0,
    groupRules: {
        practitioner: {
            operations: ['create', 'read', 'update', 'delete', 'vread', 'type-search', 'bundle'],
            resources: SUPPORTED_R4_RESOURCES,
        },
        'non-practitioner': {
            operations: ['read', 'vread', 'type-search'],
            resources: financialResources,
        },
        auditor: {
            operations: ['read', 'vread', 'type-search'],
            resources: ['Patient'],
        },
    },
};

export default RBACRules;
