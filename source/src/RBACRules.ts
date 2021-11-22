/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { R4Resource } from 'fhir-works-on-aws-interface';
import { RBACConfig } from 'fhir-works-on-aws-authz-rbac';
import { SUPPORTED_R4_RESOURCES } from './constants';

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
            operations: ['create', 'read', 'update', 'delete', 'vread', 'search-type', 'transaction'],
            resources: SUPPORTED_R4_RESOURCES,
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

export default RBACRules;
