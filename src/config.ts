/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FhirConfig, FhirVersion, stubs } from 'fhir-works-on-aws-interface';
import { ElasticSearchService } from 'fhir-works-on-aws-search-es';
import {
    DynamoDb,
    DynamoDbDataService,
    DynamoDbBundleService,
    S3DataService,
    DynamoDbUtil,
} from 'fhir-works-on-aws-persistence-ddb';
import { SMARTHandler } from 'fhir-works-on-aws-authz-smart';
import { createAuthZConfig } from './authZConfig';
import { SUPPORTED_R4_RESOURCES, SUPPORTED_STU3_RESOURCES } from './constants';

const { IS_OFFLINE } = process.env;

// When running serverless offline, env vars are expressed as '[object Object]'
// https://github.com/serverless/serverless/issues/7087
// As of May 14, 2020, this bug has not been fixed and merged in
// https://github.com/serverless/serverless/pull/7147
const OAuthUrl =
    process.env.OAUTH2_DOMAIN_ENDPOINT === '[object Object]' || process.env.OAUTH2_DOMAIN_ENDPOINT === undefined
        ? 'https://OAUTH2.com'
        : process.env.OAUTH2_DOMAIN_ENDPOINT;
const apiUrl =
    process.env.API_URL === '[object Object]' || process.env.API_URL === undefined
        ? 'https://API_URL.com'
        : process.env.API_URL;

const fhirVersion: FhirVersion = '4.0.1';
const authService = IS_OFFLINE ? stubs.passThroughAuthz : new SMARTHandler(createAuthZConfig(apiUrl, OAuthUrl));
const dynamoDbDataService = new DynamoDbDataService(DynamoDb);
const dynamoDbBundleService = new DynamoDbBundleService(DynamoDb);
const esSearch = new ElasticSearchService(
    [{ match: { documentStatus: 'AVAILABLE' } }],
    DynamoDbUtil.cleanItem,
    fhirVersion,
);
const s3DataService = new S3DataService(dynamoDbDataService, fhirVersion);

export const fhirConfig: FhirConfig = {
    configVersion: 1.0,
    orgName: 'Organization Name',
    auth: {
        authorization: authService,
        // Used in Capability Statement Generation only
        strategy: {
            service: 'SMART-on-FHIR',
            oauthPolicy: {
                authorizationEndpoint: `${OAuthUrl}/authorize`,
                tokenEndpoint: `${OAuthUrl}/token`,
                introspectionEndpoint: `${OAuthUrl}/introspect`,
                revocationEndpoint: `${OAuthUrl}/revoke`,
                capabilities: [
                    'context-ehr-patient',
                    'context-ehr-encounter',
                    'context-standalone-patient',
                    'context-standalone-encounter',
                    'permission-patient',
                    'permission-user',
                ], // https://www.hl7.org/fhir/valueset-smart-capabilities.html
            },
        },
    },
    server: {
        url: apiUrl,
    },
    logging: {
        // Unused at this point
        level: 'error',
    },

    profile: {
        systemOperations: ['transaction'],
        bundle: dynamoDbBundleService,
        systemHistory: stubs.history,
        systemSearch: stubs.search,
        fhirVersion,
        genericResource: {
            operations: ['create', 'read', 'update', 'delete', 'vread', 'search-type'],
            fhirVersions: [fhirVersion],
            persistence: dynamoDbDataService,
            typeSearch: esSearch,
            typeHistory: stubs.history,
        },
        resources: {
            Binary: {
                operations: ['create', 'read', 'update', 'delete', 'vread'],
                fhirVersions: [fhirVersion],
                persistence: s3DataService,
                typeSearch: stubs.search,
                typeHistory: stubs.history,
            },
        },
    },
};

export const genericResources = fhirVersion === '4.0.1' ? SUPPORTED_R4_RESOURCES : SUPPORTED_STU3_RESOURCES;
