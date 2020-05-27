import { Auth } from '../FHIRServerConfig';

export default function makeSecurity(authConfig: Auth) {
    // TODO verify if this is enough
    if (authConfig.strategy.cognito) {
        return {
            cors: false,
            service: [
                {
                    coding: [
                        {
                            system: 'https://www.hl7.org/fhir/codesystem-restful-security-service.html',
                            code: 'Basic',
                            display: 'Cognito',
                        },
                    ],
                    text:
                        'See https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html',
                },
            ],
            description: 'Uses Cognito User-Pools as a way to authentication and authorize users',
        };
    }

    return {
        cors: false,
        description: 'No authentication has been set up',
    };
}
