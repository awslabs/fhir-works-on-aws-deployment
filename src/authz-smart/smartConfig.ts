/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { TypeOperation, SystemOperation } from 'fhir-works-on-aws-interface';

export interface SMARTConfig {
    version: number;
    scopeKey: string;
    scopeValueType: 'array' | 'space';
    scopeRule: ScopeRule;
    expectedAudValue: string;
    expectedIssValue: string;
    expectedFhirUserClaimKey: string;
    fhirUserClaimRegex: RegExp;
    authZUserInfoUrl: string;
}

export type AccessModifier = 'read' | 'write';
export type ScopeType = 'patient' | 'user' | 'system';
export type LaunchType = 'patient' | 'encounter';

export type ScopeRule = {
    [scopeType in ScopeType]: AccessRule;
} & {
    launch: LaunchRule;
};
export type AccessRule = {
    [accessType in AccessModifier]: (TypeOperation | SystemOperation)[];
};
export type LaunchRule = {
    [launchType in LaunchType]: (TypeOperation | SystemOperation)[];
} & {
    launch: (TypeOperation | SystemOperation)[];
};
export type SupportRule = {};
