/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FhirConfig, FhirVersion, stubs, BASE_R4_RESOURCES, BASE_STU3_RESOURCES } from 'fhir-works-on-aws-interface';
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

const { IS_OFFLINE } = process.env;

// When running serverless offline, env vars are expressed as '[object Object]'
// https://github.com/serverless/serverless/issues/7087
// As of May 14, 2020, this bug has not been fixed and merged in
// https://github.com/serverless/serverless/pull/7147
const issuerEndpoint =
    process.env.ISSUER_ENDPOINT === '[object Object]' || process.env.ISSUER_ENDPOINT === undefined
        ? 'https://OAUTH2.com'
        : process.env.ISSUER_ENDPOINT;
const oAuth2ApiEndpoint =
    process.env.OAUTH2_API_ENDPOINT === '[object Object]' || process.env.OAUTH2_API_ENDPOINT === undefined
        ? 'https://OAUTH2.com'
        : process.env.OAUTH2_API_ENDPOINT;
const patientPickerEndpoint =
    process.env.PATIENT_PICKER_ENDPOINT === '[object Object]' || process.env.PATIENT_PICKER_ENDPOINT === undefined
        ? 'https://OAUTH2.com'
        : process.env.PATIENT_PICKER_ENDPOINT;
const apiUrl =
    process.env.API_URL === '[object Object]' || process.env.API_URL === undefined
        ? 'https://API_URL.com'
        : process.env.API_URL;

const fhirVersion: FhirVersion = '4.0.1';
const authService = IS_OFFLINE
    ? stubs.passThroughAuthz
    : new SMARTHandler(createAuthZConfig(apiUrl, issuerEndpoint, `${oAuth2ApiEndpoint}/keys`), apiUrl, fhirVersion);
const baseResources = fhirVersion === '4.0.1' ? BASE_R4_RESOURCES : BASE_STU3_RESOURCES;
const dynamoDbDataService = new DynamoDbDataService(DynamoDb);
const dynamoDbBundleService = new DynamoDbBundleService(DynamoDb);
const esSearch = new ElasticSearchService(
    [
        {
            key: 'documentStatus',
            value: ['AVAILABLE'],
            comparisonOperator: '==',
            logicalOperator: 'AND',
        },
    ],
    DynamoDbUtil.cleanItem,
    fhirVersion,
);
const s3DataService = new S3DataService(dynamoDbDataService, fhirVersion);

export const fhirConfig: FhirConfig = {
    configVersion: 1.0,
    productInfo: {
        orgName: 'Organization Name',
    },
    auth: {
        authorization: authService,
        // Used in Capability Statement Generation only
        strategy: {
            service: 'SMART-on-FHIR',
            oauthPolicy: {
                authorizationEndpoint: `${patientPickerEndpoint}/authorize`,
                tokenEndpoint: `${patientPickerEndpoint}/token`,
                introspectionEndpoint: `${oAuth2ApiEndpoint}/introspect`,
                revocationEndpoint: `${oAuth2ApiEndpoint}/revoke`,
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
        bulkDataAccess: dynamoDbDataService,
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

export const genericResources = baseResources;
