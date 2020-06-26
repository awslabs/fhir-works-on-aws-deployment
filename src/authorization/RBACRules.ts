import { RBACConfig } from './RBACConfig';
import { SUPPORTED_R4_RESOURCES } from '../constants';

export const financialResources: Hearth.R4Resource[] = [
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
            operations: ['create', 'read', 'update', 'delete', 'vread', 'history', 'search', 'transaction'],
            resources: SUPPORTED_R4_RESOURCES,
        },
        'non-practitioner': {
            operations: ['read', 'vread', 'search'],
            resources: financialResources,
        },
        auditor: {
            operations: ['read', 'vread', 'search'],
            resources: ['Patient'],
        },
    },
};

export default RBACRules;
