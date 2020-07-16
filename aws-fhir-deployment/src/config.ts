import { FhirConfig, FhirVersion, stubs } from 'aws-fhir-interface';
import { ElasticSearchService } from 'aws-fhir-search-es';
import { RBACHandler } from 'aws-fhir-rbac';
import { DynamoDb, DynamoDbDataService, DynamoDbBundleService, S3DataService } from 'aws-fhir-persistence';
import RBACRules from './RBACRules';
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
