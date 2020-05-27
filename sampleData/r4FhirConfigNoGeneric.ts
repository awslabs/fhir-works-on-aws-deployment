import { VERSION, INTERACTION } from '../src/constants';
import { FhirConfig } from '../src/FHIRServerConfig';

const config: FhirConfig = {
    orgName: 'Organization Name',
    auth: {
        strategy: {
            cognito: true,
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
        version: VERSION.R4_0_1,
        resources: {
            AllergyIntolerance: {
                interactions: [INTERACTION.CREATE, INTERACTION.UPDATE],
                versions: [VERSION.R3_0_1],
            },
            Organization: {
                interactions: [INTERACTION.CREATE, INTERACTION.UPDATE],
                versions: [VERSION.R3_0_1, VERSION.R4_0_1],
            },
            Account: {
                interactions: [INTERACTION.CREATE, INTERACTION.UPDATE],
                versions: [VERSION.R4_0_1],
            },
            Patient: {
                interactions: [INTERACTION.CREATE, INTERACTION.UPDATE],
                versions: [VERSION.R4_0_1],
            },
        },
    },
};

export default config;
