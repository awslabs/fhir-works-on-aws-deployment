import { FhirConfig } from '../src/interface/fhirConfig';
import stubs from '../src/stubs';

const config: FhirConfig = {
    orgName: 'Organization Name',
    auth: {
        strategy: {
            oauthUrl: 'http://example.com',
            service: 'OAuth',
        },
        authorization: stubs.passThroughAuthz,
    },
    server: {
        url: 'http://example.com',
    },
    logging: {
        level: 'debug',
    },
    profile: {
        version: '3.0.1',
        systemOperations: ['transaction'],
        bundle: stubs.bundle,
        systemSearch: stubs.search,
        systemHistory: stubs.history,
        genericResource: {
            operations: ['read', 'create', 'update', 'vread', 'search-type'],
            excludedR4Resources: ['Organization', 'Account', 'Patient'],
            excludedR3Resources: ['ActivityDefinition', 'AllergyIntolerance'],
            versions: ['4.0.1', '3.0.1'],
            persistence: stubs.persistence,
            typeSearch: stubs.search,
            typeHistory: stubs.history,
        },
    },
};

export default config;
