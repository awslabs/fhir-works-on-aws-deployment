/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { SMARTConfig, ScopeRule, IntrospectionOptions } from 'fhir-works-on-aws-authz-smart';
import { kmsDecrypt } from './configUtils';

const enableTokenIntrospection = process.env.ENABLE_TOKEN_INTROSPECTION === 'true';

// if they have a system level operation then you need * as resourceType

export const scopeRule: ScopeRule = {
    patient: {
        read: ['read', 'vread', 'search-type', 'search-system', 'history-instance', 'history-type', 'history-system'],
        write: ['create', 'transaction'],
    },
    user: {
        read: ['read', 'vread', 'search-type', 'search-system', 'history-instance', 'history-type', 'history-system'],
        write: ['update', 'patch', 'create', 'delete', 'transaction'],
    },
    system: {
        // "read" allows system export and group export
        read: ['read'],
        write: [],
    },
};

export async function getIntrospectionOptions(): Promise<IntrospectionOptions | undefined> {
    let introspectionOptions;
    if (enableTokenIntrospection) {
        introspectionOptions = {
            clientId: (await kmsDecrypt(process.env.INTROSPECTION_CLIENT_ID)) ?? '',
            clientSecret: (await kmsDecrypt(process.env.INTROSPECTION_CLIENT_SECRET)) ?? '',
            introspectUrl: `${process.env.INTROSPECTION_ENDPOINT}/oauth2/introspect`,
        };
    }
    return introspectionOptions;
}

export async function createAuthZConfig(
    expectedAudValue: string | RegExp,
    expectedIssValue: string,
    jwksEndpoint: string,
): Promise<SMARTConfig> {
    return {
        version: 1.0,
        scopeKey: 'scp',
        scopeRule,
        expectedAudValue,
        expectedIssValue,
        fhirUserClaimPath: 'fhirUser',
        launchContextPathPrefix: 'launch_response_',
        jwksEndpoint,
        tokenIntrospection: await getIntrospectionOptions(),
    };
}
