/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { RBACConfig } from 'fhir-works-on-aws-authz-rbac';

export const financialResources: string[] = [
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

const RBACRules = (baseResources: string[]): RBACConfig => {
    return {
        version: 1.0,
        groupRules: {
            practitioner: {
                operations: ['create', 'read', 'update', 'delete', 'vread', 'search-type', 'transaction'],
                resources: baseResources,
            },
            'non-practitioner': {
                operations: ['read', 'vread', 'search-type'],
                resources: financialResources,
            },
            auditor: {
                operations: ['read', 'vread', 'search-type'],
                resources: ['Patient'],
            },
        },
    };
};

export default RBACRules;
