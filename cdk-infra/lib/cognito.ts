import {
    AccountRecovery,
    CfnUserPool,
    CfnUserPoolClient,
    CfnUserPoolDomain,
    CfnUserPoolGroup,
    UserPool,
    UserPoolClient,
} from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class CognitoResources {
    userPool: CfnUserPool;

    userPoolClient: CfnUserPoolClient;

    userPoolDomain: CfnUserPoolDomain;

    practitionerUserGroup: CfnUserPoolGroup;

    nonPractitionerUserGroup: CfnUserPoolGroup;

    auditorUserGroup: CfnUserPoolGroup;

    constructor(scope: Construct, stackName: string, cognitoOAuthDefaultRedirectURL: string) {
        this.userPool = new CfnUserPool(scope, 'userPool', {
            accountRecoverySetting: {
                recoveryMechanisms: [
                    {
                        name: 'verified_email',
                        priority: 1,
                    },
                ],
            },
            adminCreateUserConfig: {
                allowAdminCreateUserOnly: true,
            },
            autoVerifiedAttributes: ['email'],
            userPoolName: stackName,
            schema: [
                {
                    attributeDataType: 'String',
                    name: 'email',
                },
                {
                    attributeDataType: 'String',
                    name: 'cc_confirmed',
                },
                {
                    attributeDataType: 'String',
                    name: 'tenantId',
                },
            ],
        });

        this.userPoolClient = new CfnUserPoolClient(scope, 'userPoolClient', {
            allowedOAuthFlows: ['code', 'implicit'],
            allowedOAuthFlowsUserPoolClient: true,
            allowedOAuthScopes: ['email', 'openid', 'profile'],
            clientName: `${stackName}-UserPool`,
            userPoolId: this.userPool.ref,
            callbackUrLs: [cognitoOAuthDefaultRedirectURL],
            defaultRedirectUri: cognitoOAuthDefaultRedirectURL,
            explicitAuthFlows: ['ALLOW_USER_PASSWORD_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
            supportedIdentityProviders: ['COGNITO'],
            preventUserExistenceErrors: 'ENABLED',
        });

        this.userPoolDomain = new CfnUserPoolDomain(scope, 'userPoolDomain', {
            userPoolId: this.userPool.ref,
            domain: this.userPoolClient.ref,
        });

        this.practitionerUserGroup = new CfnUserPoolGroup(scope, 'practitionerUserGroup', {
            description: 'This is a member of the hospital staff, who directly helps patients',
            groupName: 'pracititioner',
            precedence: 0,
            userPoolId: this.userPool.ref,
        });

        this.nonPractitionerUserGroup = new CfnUserPoolGroup(scope, 'nonPractitionerUserGroup', {
            description: 'This is a member of the hospital staff who needs access to non-medical record',
            groupName: 'non-practitioner',
            precedence: 1,
            userPoolId: this.userPool.ref,
        });

        this.auditorUserGroup = new CfnUserPoolGroup(scope, 'auditorUserGroup', {
            description: 'Someone who needs read, v_read and search access on patients',
            groupName: 'auditor',
            precedence: 2,
            userPoolId: this.userPool.ref,
        });
    }
}
