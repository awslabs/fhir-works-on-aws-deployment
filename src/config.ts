/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
    FhirConfig,
    FhirVersion,
    stubs,
    BASE_R4_RESOURCES,
    BASE_STU3_RESOURCES,
    Validator,
} from 'fhir-works-on-aws-interface';
import { ElasticSearchService } from 'fhir-works-on-aws-search-es';
import { RBACHandler } from 'fhir-works-on-aws-authz-rbac';
import {
    DynamoDb,
    DynamoDbDataService,
    DynamoDbBundleService,
    S3DataService,
    DynamoDbUtil,
} from 'fhir-works-on-aws-persistence-ddb';
import JsonSchemaValidator from 'fhir-works-on-aws-routing/lib/router/validation/jsonSchemaValidator';
import HapiFhirLambdaValidator from 'fhir-works-on-aws-routing/lib/router/validation/hapiFhirLambdaValidator';
import SubscriptionValidator from 'fhir-works-on-aws-routing/lib/router/validation/subscriptionValidator';
import getAllowListedSubscriptionEndpoints from './subscriptions/allowList';
import RBACRules from './RBACRules';
import { loadImplementationGuides } from './implementationGuides/loadCompiledIGs';

const { IS_OFFLINE, ENABLE_MULTI_TENANCY, ENABLE_SUBSCRIPTIONS } = process.env;

const enableMultiTenancy = ENABLE_MULTI_TENANCY === 'true';
const enableSubscriptions = ENABLE_SUBSCRIPTIONS === 'true';

export const fhirVersion: FhirVersion = '4.0.1';
const baseResources = fhirVersion === '4.0.1' ? BASE_R4_RESOURCES : BASE_STU3_RESOURCES;
const authService = IS_OFFLINE ? stubs.passThroughAuthz : new RBACHandler(RBACRules(baseResources), fhirVersion);
const dynamoDbDataService = new DynamoDbDataService(DynamoDb, false, { enableMultiTenancy });
const dynamoDbBundleService = new DynamoDbBundleService(DynamoDb, undefined, undefined, {
    enableMultiTenancy,
});

// Configure the input validators. Validators run in the order that they appear on the array. Use an empty array to disable input validation.
const validators: Validator[] = [];
if (
    process.env.VALIDATOR_LAMBDA_ALIAS &&
    process.env.VALIDATOR_LAMBDA_ALIAS !== '[object Object]' &&
    process.env.VALIDATOR_LAMBDA_ALIAS !== ''
) {
    // The HAPI FHIR Validator must be deployed separately. It is the recommended choice when using implementation guides.
    validators.push(new HapiFhirLambdaValidator(process.env.VALIDATOR_LAMBDA_ALIAS));
} else if (process.env.OFFLINE_VALIDATOR_LAMBDA_ALIAS) {
    // Allows user to run sls offline with custom provided HAPI Lambda
    validators.push(new HapiFhirLambdaValidator(process.env.OFFLINE_VALIDATOR_LAMBDA_ALIAS));
} else {
    // The JSON Schema Validator is simpler and is a good choice for testing the FHIR server with minimal configuration.
    validators.push(new JsonSchemaValidator(fhirVersion));
}

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
    loadImplementationGuides('fhir-works-on-aws-search-es'),
    undefined,
    { enableMultiTenancy },
);

const s3DataService = new S3DataService(dynamoDbDataService, fhirVersion, { enableMultiTenancy });

const OAuthUrl =
    process.env.OAUTH2_DOMAIN_ENDPOINT === '[object Object]' || process.env.OAUTH2_DOMAIN_ENDPOINT === undefined
        ? 'https://OAUTH2.com'
        : process.env.OAUTH2_DOMAIN_ENDPOINT;

export const getFhirConfig = async (): Promise<FhirConfig> => {
    if (enableSubscriptions) {
        const subscriptionAllowList = await getAllowListedSubscriptionEndpoints();
        validators.push(
            new SubscriptionValidator(esSearch, dynamoDbDataService, subscriptionAllowList, { enableMultiTenancy }),
        );
    }
    return {
        configVersion: 1.0,
        productInfo: {
            orgName: 'Organization Name',
        },
        auth: {
            authorization: authService,
            // Used in Capability Statement Generation only
            strategy: {
                service: 'OAuth',
                oauthPolicy: {
                    authorizationEndpoint: `${OAuthUrl}/authorize`,
                    tokenEndpoint: `${OAuthUrl}/token`,
                },
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
        validators,
        profile: {
            systemOperations: ['transaction'],
            bundle: dynamoDbBundleService,
            compiledImplementationGuides: loadImplementationGuides('fhir-works-on-aws-routing'),
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
        multiTenancyConfig: enableMultiTenancy
            ? {
                  enableMultiTenancy: true,
                  useTenantSpecificUrl: true,
                  tenantIdClaimPath: 'custom:tenantId',
              }
            : undefined,
    };
};

export const genericResources = baseResources;
