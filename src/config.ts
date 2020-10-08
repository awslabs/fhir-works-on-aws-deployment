/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FhirConfig, FhirVersion, stubs } from 'fhir-works-on-aws-interface';
import { RBACHandler } from 'fhir-works-on-aws-authz-rbac';
import { ApiDataService } from 'fhir-works-on-aws-persistence-ddb';
import RBACRules from './RBACRules';
import { SUPPORTED_R4_RESOURCES, SUPPORTED_STU3_RESOURCES } from './constants';
import getIntegrationTransformConfig from './parameterStore';

const { IS_OFFLINE } = process.env;

const fhirVersion: FhirVersion = '4.0.1';
const authService = IS_OFFLINE ? stubs.passThroughAuthz : new RBACHandler(RBACRules);

export async function getConfig(): Promise<FhirConfig> {
    const { integrationTransformUrl, integrationTransformAwsRegion } = await getIntegrationTransformConfig();
    const apiDataService = new ApiDataService(integrationTransformUrl, integrationTransformAwsRegion);

    const fhirConfig: FhirConfig = {
        configVersion: 1.0,
        orgName: 'Organization Name',
        auth: {
            authorization: authService,
            // Used in Capability Statement Generation only
            strategy: {
                service: 'OAuth',
                oauthUrl:
                    process.env.OAUTH2_DOMAIN_ENDPOINT === '[object Object]' ||
                    process.env.OAUTH2_DOMAIN_ENDPOINT === undefined
                        ? 'https://OAUTH2.com'
                        : process.env.OAUTH2_DOMAIN_ENDPOINT,
            },
        },
        server: {
            // When running serverless offline, env vars are expressed as '[object Object]'
            // https://github.com/serverless/serverless/issues/7087
            // As of May 14, 2020, this bug has not been fixed and merged in
            // https://github.com/serverless/serverless/pull/7147
            url:
                process.env.API_URL === '[object Object]' || process.env.API_URL === undefined
                    ? 'https://API_URL.com'
                    : process.env.API_URL,
        },
        logging: {
            // Unused at this point
            level: 'error',
        },

        profile: {
            systemOperations: [],
            bundle: stubs.bundle,
            systemHistory: stubs.history,
            systemSearch: stubs.search,
            fhirVersion,
            genericResource: {
                operations: ['create', 'read', 'update'],
                fhirVersions: [fhirVersion],
                persistence: apiDataService,
                typeSearch: stubs.search,
                typeHistory: stubs.history,
            },
        },
    };

    return fhirConfig;
}
export const genericResources = fhirVersion === '4.0.1' ? SUPPORTED_R4_RESOURCES : SUPPORTED_STU3_RESOURCES;
