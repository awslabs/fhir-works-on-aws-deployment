import { VERSION, INTERACTION, R4_RESOURCE, R3_RESOURCE } from '../src/constants';
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
    profile: {
        version: VERSION.R3_0_1,
        genericResource: {
            searchParam: true,
            interactions: [INTERACTION.READ, INTERACTION.CREATE, INTERACTION.UPDATE, INTERACTION.VREAD],
            excludedR4Resources: [R4_RESOURCE.Organization, R4_RESOURCE.Account, R4_RESOURCE.Patient],
            excludedR3Resources: [R3_RESOURCE.ActivityDefinition, R3_RESOURCE.AllergyIntolerance],
            versions: [VERSION.R4_0_1, VERSION.R3_0_1],
        },
    },
};

export default config;
