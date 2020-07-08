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
    //
    // Add any profiles you want to support.  Each profile can support multiple versions
    // This 'resource*' defaults to ALL resources not called out in excludedResources or resources array
    //
    profile: {
        version: '4.0.1',
        resources: {
            AllergyIntolerance: {
                operations: ['create', 'update'],
                versions: ['3.0.1'],
            },
            Organization: {
                operations: ['create', 'update'],
                versions: ['3.0.1', '4.0.1'],
            },
            Account: {
                operations: ['create', 'update'],
                versions: ['4.0.1'],
            },
            Patient: {
                operations: ['create', 'update'],
                versions: ['4.0.1'],
            },
        },
    },
};

export default config;
