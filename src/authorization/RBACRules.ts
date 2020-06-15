import { INTERACTION, R4_RESOURCE } from '../constants';
import { RBACConfig } from './RBACConfig';

export const allResources: R4_RESOURCE[] = Object.keys(R4_RESOURCE).map(v => v as R4_RESOURCE);
export const financialResources: R4_RESOURCE[] = [
    R4_RESOURCE.Coverage,
    R4_RESOURCE.CoverageEligibilityRequest,
    R4_RESOURCE.CoverageEligibilityResponse,
    R4_RESOURCE.EnrollmentRequest,
    R4_RESOURCE.EnrollmentResponse,
    R4_RESOURCE.Claim,
    R4_RESOURCE.ClaimResponse,
    R4_RESOURCE.Invoice,
    R4_RESOURCE.PaymentNotice,
    R4_RESOURCE.PaymentReconciliation,
    R4_RESOURCE.Account,
    R4_RESOURCE.ChargeItem,
    R4_RESOURCE.ChargeItemDefinition,
    R4_RESOURCE.Contract,
    R4_RESOURCE.ExplanationOfBenefit,
    R4_RESOURCE.InsurancePlan,
];

const RBACRules: RBACConfig = {
    version: 1.0,
    groupRules: {
        practitioner: {
            interactions: [
                INTERACTION.CREATE,
                INTERACTION.READ,
                INTERACTION.UPDATE,
                INTERACTION.DELETE,
                INTERACTION.VREAD,
                INTERACTION.HISTORY,
                INTERACTION.SEARCH,
                INTERACTION.TRANSACTION,
            ],
            resources: allResources,
        },
        'non-practitioner': {
            interactions: [INTERACTION.READ, INTERACTION.VREAD, INTERACTION.SEARCH],
            resources: financialResources,
        },
        auditor: {
            interactions: [INTERACTION.READ, INTERACTION.VREAD, INTERACTION.SEARCH],
            resources: [R4_RESOURCE.Patient],
        },
    },
};

export default RBACRules;
