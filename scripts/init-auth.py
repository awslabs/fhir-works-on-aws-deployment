import boto3
import sys

client = boto3.client('cognito-idp', region_name=sys.argv[2])
'''
example run:
python3 init-auth.py <ClientId> <Region>
python3 init-auth.py 12pgvi3gsl32qp9h8lg130arr0 us-west-2
'''
response = client.initiate_auth(
    AuthFlow='USER_PASSWORD_AUTH',
    AuthParameters={
        'USERNAME': 'workshopuser',
        'PASSWORD': 'Master123!'
    },

    ClientId=sys.argv[1]
)

sessionid = response['AuthenticationResult']['IdToken']
print(sessionid)
