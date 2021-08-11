"""
 Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 SPDX-License-Identifier: Apache-2.0
"""

import boto3
import sys
import json

'''
example run:
python3 provision-user.py <UserPoolId> <ClientId> <Region>
python3 provision-user.py us-west-2_yk8jbgpWM 12pgvi3gsl32qp9h8lg130arr0 us-west-2
'''

client = boto3.client('cognito-idp', region_name=sys.argv[3])

USERNAME = 'workshopuser'

response = client.admin_create_user(
    UserPoolId=sys.argv[1],
    Username=USERNAME,
    UserAttributes=[
        {
            'Name': 'email',
            'Value': 'dummy@email.com'
        },
        {
            'Name': 'email_verified',
            'Value': 'True'
        },
        {
            'Name': 'custom:tenantId',
            'Value': 'tenant1'
        }

    ],
    ValidationData=[
        {
            'Name': 'email',
            'Value': 'dummy@email.com'
        }
    ],
    TemporaryPassword='Master123!',
    MessageAction='SUPPRESS'
)

response = client.initiate_auth(
    AuthFlow='USER_PASSWORD_AUTH',
    AuthParameters={
        'USERNAME': USERNAME,
        'PASSWORD': 'Master123!'
    },

    ClientId=sys.argv[2]
)
sessionid = response['Session']

response = client.respond_to_auth_challenge(
    ClientId=sys.argv[2],
    ChallengeName='NEW_PASSWORD_REQUIRED',
    Session=sessionid,
    ChallengeResponses={
        'USERNAME': USERNAME,
        'NEW_PASSWORD': 'Master123!'
    }
)

response = client.admin_add_user_to_group(
    UserPoolId=sys.argv[1],
    Username=USERNAME,
    GroupName='practitioner'
)

response = client.initiate_auth(
    AuthFlow='USER_PASSWORD_AUTH',
    AuthParameters={
        'USERNAME': USERNAME,
        'PASSWORD': 'Master123!'
    },

    ClientId=sys.argv[2]
)

id_token = response['AuthenticationResult']['IdToken']
print(id_token)
