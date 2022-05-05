import {
    AccountRecovery,
    CfnUserPoolClient,
    CfnUserPoolDomain,
    CfnUserPoolGroup,
    StringAttribute,
    UserPool,
} from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export default class CognitoResources {
    userPool: UserPool;

    userPoolClient: CfnUserPoolClient;

    userPoolDomain: CfnUserPoolDomain;

    practitionerUserGroup: CfnUserPoolGroup;

    nonPractitionerUserGroup: CfnUserPoolGroup;

    auditorUserGroup: CfnUserPoolGroup;

    constructor(scope: Construct, stackName: string, cognitoOAuthDefaultRedirectURL: string) {
        this.userPool = new UserPool(scope, 'userPool', {
            accountRecovery: AccountRecovery.EMAIL_ONLY,
            autoVerify: {
                email: true,
            },
            userPoolName: stackName,
            standardAttributes: {
                email: {
                    required: true,
                },
            },
            customAttributes: {
                cc_confirmed: new StringAttribute({ mutable: true }),
                tenantId: new StringAttribute({ mutable: true }),
            },
        });

        this.userPoolClient = new CfnUserPoolClient(scope, 'userPoolClient', {
            allowedOAuthFlows: ['code', 'implicit'],
            allowedOAuthFlowsUserPoolClient: true,
            allowedOAuthScopes: ['email', 'openid', 'profile'],
            clientName: `${stackName}-UserPool`,
            userPoolId: this.userPool.userPoolId,
            callbackUrLs: [cognitoOAuthDefaultRedirectURL],
            defaultRedirectUri: cognitoOAuthDefaultRedirectURL,
            explicitAuthFlows: ['ALLOW_USER_PASSWORD_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
            supportedIdentityProviders: ['COGNITO'],
            preventUserExistenceErrors: 'ENABLED',
        });

        this.userPoolDomain = new CfnUserPoolDomain(scope, 'userPoolDomain', {
            userPoolId: this.userPool.userPoolId,
            domain: this.userPoolClient.ref,
        });

        this.practitionerUserGroup = new CfnUserPoolGroup(scope, 'practitionerUserGroup', {
            description: 'This is a member of the hospital staff, who directly helps patients',
            groupName: 'pracititioner',
            precedence: 0,
            userPoolId: this.userPool.userPoolId,
        });

        this.nonPractitionerUserGroup = new CfnUserPoolGroup(scope, 'nonPractitionerUserGroup', {
            description: 'This is a member of the hospital staff who needs access to non-medical record',
            groupName: 'non-practitioner',
            precedence: 1,
            userPoolId: this.userPool.userPoolId,
        });

        this.auditorUserGroup = new CfnUserPoolGroup(scope, 'auditorUserGroup', {
            description: 'Someone who needs read, v_read and search access on patients',
            groupName: 'auditor',
            precedence: 2,
            userPoolId: this.userPool.userPoolId,
        });
    }
}
