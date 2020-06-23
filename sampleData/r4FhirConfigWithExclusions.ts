import { VERSION, INTERACTION, R4_RESOURCE } from '../src/constants';
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
            searchParam: false,
            interactions: [INTERACTION.READ],
            excludedR4Resources: [R4_RESOURCE.Organization, R4_RESOURCE.Account, R4_RESOURCE.Patient],
            versions: [VERSION.R4_0_1],
        },
        resources: {
            AllergyIntolerance: {
                interactions: [INTERACTION.CREATE, INTERACTION.UPDATE],
                versions: [VERSION.R4_0_1],
            },
        },
    },
};

export default config;
