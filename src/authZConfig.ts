/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { SystemOperation, TypeOperation } from 'fhir-works-on-aws-interface';
import { SMARTConfig, ScopeRule } from './authz-smart';

const allReadOperations: (TypeOperation | SystemOperation)[] = [
    'read',
    'vread',
    'search-type',
    'search-system',
    'history-instance',
    'history-type',
    'history-system',
];

const allWriteOperations: (TypeOperation | SystemOperation)[] = [
    'create',
    'update',
    'delete',
    'patch',
    'transaction',
    'batch',
];

// if they have a system level operation then you need * as resourceType

export const scopeRule: ScopeRule = {
    patient: {
        read: allReadOperations,
        write: ['update', 'patch', 'create'],
    },
    user: {
        read: allReadOperations,
        write: [],
    },
    system: {
        read: allReadOperations,
        write: allWriteOperations,
    },
    launch: {
        launch: allReadOperations,
        patient: allReadOperations,
        encounter: allReadOperations,
    },
};

export function createAuthZConfig(expectedAudValue: string, expectedIssValue: string): SMARTConfig {
    return {
        version: 1.0,
        scopeKey: 'scp',
        scopeValueType: 'array',
        scopeRule,
        expectedAudValue,
        expectedIssValue,
        expectedFhirUserClaimKey: 'fhirUser',
        fhirUserClaimRegex: /(\w+)\/(\w+)/g,
        authZUserInfoUrl: `${expectedIssValue}/v1/userinfo`,
    };
}
