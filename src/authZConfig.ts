/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { SMARTConfig, ScopeRule } from 'fhir-works-on-aws-authz-smart';

// if they have a system level operation then you need * as resourceType

export const scopeRule: ScopeRule = {
    patient: {
        read: ['read', 'vread', 'search-type', 'search-system', 'history-instance', 'history-type', 'history-system'],
        write: ['create', 'transaction'],
    },
    user: {
        read: ['read', 'vread', 'search-type', 'search-system', 'history-instance', 'history-type', 'history-system'],
        write: ['update', 'patch', 'create', 'transaction'],
    },
};

export function createAuthZConfig(
    expectedAudValue: string,
    expectedIssValue: string,
    jwksEndpoint: string,
): SMARTConfig {
    return {
        version: 1.0,
        scopeKey: 'scp',
        scopeRule,
        expectedAudValue,
        expectedIssValue,
        fhirUserClaimKey: 'fhirUser',
        launchContextKeyPrefix: 'launch_response_',
        jwksEndpoint,
    };
}
