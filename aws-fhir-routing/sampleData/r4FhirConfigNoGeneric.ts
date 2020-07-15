import { FhirConfig, stubs } from 'aws-fhir-interface';

const config: FhirConfig = {
    orgName: 'Organization Name',
    auth: {
        strategy: {
            service: 'Basic',
        },
        authorization: stubs.passThroughAuthz,
    },
    server: {
        url: 'http://example.com',
    },
    logging: {
        level: 'warn',
    },
    profile: {
        version: '4.0.1',
        systemOperations: ['search-system', 'batch', 'history-system'],
        bundle: stubs.bundle,
        systemSearch: stubs.search,
        systemHistory: stubs.history,
        resources: {
            AllergyIntolerance: {
                operations: ['create', 'update'],
                versions: ['3.0.1'],
                persistence: stubs.persistence,
                typeSearch: stubs.search,
                typeHistory: stubs.history,
            },
            Organization: {
                operations: ['create', 'update', 'patch'],
                versions: ['3.0.1', '4.0.1'],
                persistence: stubs.persistence,
                typeSearch: stubs.search,
                typeHistory: stubs.history,
            },
            Account: {
                operations: ['create', 'update'],
                versions: ['4.0.1'],
                persistence: stubs.persistence,
                typeSearch: stubs.search,
                typeHistory: stubs.history,
            },
            Patient: {
                operations: ['create', 'update', 'search-type'],
                versions: ['4.0.1'],
                persistence: stubs.persistence,
                typeSearch: stubs.search,
                typeHistory: stubs.history,
            },
        },
    },
};

export default config;
