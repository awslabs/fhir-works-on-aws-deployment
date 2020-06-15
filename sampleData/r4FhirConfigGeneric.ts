import { VERSION, INTERACTION } from '../src/constants';
import { FhirConfig } from '../src/FHIRServerConfig';

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
        version: VERSION.R4_0_1,
        genericResource: {
            searchParam: true,
            interactions: [
                INTERACTION.CREATE,
                INTERACTION.READ,
                INTERACTION.UPDATE,
                INTERACTION.DELETE,
                INTERACTION.VREAD,
            ],
            versions: [VERSION.R4_0_1],
        },
    },
};

export default config;
