/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FhirConfig } from './interface/fhirConfig';
import DynamoDbDataService from './persistence/dataServices/dynamoDbDataService';
import { DynamoDb } from './persistence/dataServices/dynamoDb';
import ElasticSearchService from './search/elasticSearchService';
import stubs from './stubs';
import S3DataService from './persistence/objectStorageService/s3DataService';
import { FhirVersion } from './interface/constants';
import RBACRules from './authorization/RBACRules';
import RBACHandler from './authorization/RBACHandler';
import DynamoDbBundleService from './persistence/dataServices/dynamoDbBundleService';
import { SUPPORTED_R4_RESOURCES, SUPPORTED_R3_RESOURCES } from './constants';

const { IS_OFFLINE } = process.env;

const fhirVersion: FhirVersion = '4.0.1';
const authService = IS_OFFLINE ? stubs.passThroughAuthz : new RBACHandler(RBACRules);
const dynamoDbDataService = new DynamoDbDataService(DynamoDb);
const dynamoDbBundleService = new DynamoDbBundleService(DynamoDb);
const s3DataService = new S3DataService(dynamoDbDataService, fhirVersion);

export const fhirConfig: FhirConfig = {
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
        systemOperations: ['transaction'],
        bundle: dynamoDbBundleService,
        systemHistory: stubs.history,
        systemSearch: stubs.search,
        version: fhirVersion,
        genericResource: {
            operations: ['create', 'read', 'update', 'delete', 'vread', 'search-type'],
            excludedR4Resources: ['Organization', 'Account'],
            versions: [fhirVersion],
            persistence: dynamoDbDataService,
            typeSearch: ElasticSearchService,
            typeHistory: stubs.history,
        },
        resources: {
            Binary: {
                operations: ['create', 'read', 'update', 'delete', 'vread'],
                versions: [fhirVersion],
                persistence: s3DataService,
                typeSearch: stubs.search,
                typeHistory: stubs.history,
            },
        },
    },
};

export const genericResources = fhirVersion === '4.0.1' ? SUPPORTED_R4_RESOURCES : SUPPORTED_R3_RESOURCES;
