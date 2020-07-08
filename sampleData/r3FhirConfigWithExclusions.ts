import { FhirConfig } from '../src/interface/fhirConfig';

const config: FhirConfig = {
    orgName: 'Organization Name',
    auth: {
        strategy: {
            oauthUrl: 'http://example.com',
        },
    },
    server: {
        url: 'http://example.com',
    },
    logging: {
        level: 'DEBUG',
    },
    profile: {
        version: '3.0.1',
        genericResource: {
            searchParam: true,
            operations: ['read', 'create', 'update', 'vread'],
            excludedR4Resources: ['Organization', 'Account', 'Patient'],
            excludedR3Resources: ['ActivityDefinition', 'AllergyIntolerance'],
            versions: ['4.0.1', '3.0.1'],
        },
    },
};

export default config;
