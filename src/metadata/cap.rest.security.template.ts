import { Auth } from '../interface/fhirConfig';

export default function makeSecurity(authConfig: Auth) {
    if (authConfig.strategy.oauthUrl) {
        return {
            cors: false,
            service: [
                {
                    coding: [
                        {
                            system: 'https://www.hl7.org/fhir/codesystem-restful-security-service.html',
                            code: 'OAuth',
                        },
                    ],
                    text: 'OAuth2 using RBAC',
                },
            ],
            extension: [
                {
                    url: 'https://www.hl7.org/fhir/smart-app-launch/StructureDefinition-oauth-uris.html',
                    extension: [
                        {
                            url: 'token',
                            valueUri: `${authConfig.strategy.oauthUrl}/token`,
                        },
                        {
                            url: 'authorize',
                            valueUri: `${authConfig.strategy.oauthUrl}/authorize`,
                        },
                    ],
                },
            ],
            description: 'Uses OAuth2 as a way to authentication & authorize users',
        };
    }

    return {
        cors: false,
        description: 'No authentication has been set up',
    };
}
