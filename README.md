# FhirSolution MVP Installation (v 0.5.0)

## Introduction

### Purpose

These instructions accompany an MVP version of the AWS FHIR Server for Lambda package. This MVP is available through a package delivered as a zip File.

These instructions will enable you to deploy a serverless implementation of the FHIR APIs, together with a FHIR persistence layer, using AWS services.

### API capabilities

These APIs provide interactions on all FHIR Resources defined for both the STU3 and R4 releases of FHIR, including Patient, Bundle and Observation. The FHIR server will have its own FHIR-conformant data repository (with the current exception of binary data where the payload is stored to S3 directly) and will support only JSON as the supported content format, over the HTTP REST interface. Supported interactions for this release include the ability to Post a bundle (a collection of Observations associated with a Patient), Search Patient and Observations, Update and Read a Patient Resource. Additional interactions will be supported in future releases. Additionally, the deployment will support the generation of a capability statement for computational verification of the server’s conformance with the FHIR standard.

#### API Customization

To change what this FHIR server supports please check out the [config.ts](src/config.ts) file. Ways of customization:

- `profile.version` is where you set the FHIR version this API will use
- `profile.genericResource` is where you will define this FHIR server's resources & operations
  - `genericResource.searchParam` enables exact match searching on any parameter of the resource
  - `genericResource.interactions` is the list of valid operations this FHIR server will support
  - `genericResource.excluded<Version>Resources` removes these resources from being supported for the specified \<Version\>
  - `genericResource.versions` is the FHIR versions that this genericResource definition supports.

### Architecture

The system architecture consists of multiple layers of AWS serverless services. The endpoints are hosted using API Gateway. The database and storage layer consists of Amazon DynamoDB and S3, with ElasticSearch as the search index for the data written to DynamoDB. The endpoints are secured by Cognito for user-level authentication and user-group authorization, with API keys for anonymous service level access. The diagram below shows the FHIR server’s system architecture components and how they are related.
![Architecture](resources/architecture.png)

## Prerequisites

- **AWS Account**: The FHIR Server is designed to use AWS services for data storage and API access. An AWS account is hence required in order to deploy and run the necessary components.
- **AWS CLI (Unix only)**: ![AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) is required for Linux and OSX installations.
- **Homebrew (OSX Only)**: OSX Installation uses ![Homebrew](https://brew.sh/) to install dependencies.
- **Windows Powershell for AWS (Windows Only)**: Windows installation has been tested in ![AWSPowershell](https://docs.aws.amazon.com/powershell/latest/userguide/pstools-getting-set-up-windows.html#ps-installing-awswindowspowershell).

## Initial Installation

This installation guide covers a basic installation on Windows or Unix-like systems. The Unix installation has been tested on OSX Catalina, CentOS (Amazon Linux 2), and Ubuntu (18.04 LTS), and the Windows installation has been tested on Windows Server 2019. If you encounter any problems installing in this way, please see the "Known Issues" section, or refer to the Manual Installation section.

### Unix Installation
In a Terminal application or command shell, navigate to the directory containing the package’s code.

Run the following lines of code:

```sh
chmod +x ./scripts/install.sh
sudo ./scripts/install.sh
```

The `sudo` command may prompt you for your password, after which installation will commence. Follow the directions in the script to finish installation. See the following section for details on optional installation settings.
The `stage` and `region` values are set by default to `dev` and `us-west-2`, but they can be changed with commandline arguments as follows:
```sh
sudo ./scripts/install.sh --region <REGION> --stage <STAGE>
```
You can also use their abbreviations:
```sh
sudo ./scripts/install.sh -r <REGION> -s <STAGE>
```

### Windows Installation
Open Windows Powershell for AWS as Administrator, and navigate to the directory containing the package's code.

Run the following lines of code:
```sh
Set-ExecutionPolicy RemoteSigned
.\scripts\win-install.ps1
```
Follow the directions in the script to finish installation. See the following section for details on optional installation settings.

The `stage` and `region` values are set by default to `dev` and `us-west-2`, but they can be changed with commandline arguments as follows:
```sh
.\scripts\win-install.ps1 -Region <REGION> -Stage <STAGE>
```

### Docker Installation
Install Docker (if you do not have it already) by following instructions on https://docs.docker.com/get-docker/

```sh
docker build -t fhir-server-install -f docker/Dockerfile .
docker run -it -l install-container fhir-server-install
```
Follow the directions in the script to finish installation. See the following section for details on optional installation settings.

The `stage` and `region` values are set by default to `dev` and `us-west-2`, but they can be changed with commandline arguments as follows:
```sh
docker run -it -l install-container fhir-server-install --region <REGION> --stage <STAGE>
```
You can also use their abbreviations:
```sh
docker run -it -l install-container fhir-server-install -r <REGION> -s <STAGE>
```
If you would like to retrieve `Info_Output.yml` file from the container, issue the following commands:
```sh
container_id=$(docker ps -f "label=install-container" --format "{{.ID}}")
docker cp ${container_id}:/home/node/aws-fhir-solution/Info_Output.yml .
```
To remove container:
```sh
container_id=$(docker ps -f "label=install-container" --format "{{.ID}}")
docker rm ${container_id}
```

### Optional Installation Configurations

#### ElasticSearch Kibana Server
The Kibana server allows you to explore data inside your ElasticSearch instance through a web UI. This server is automatically created if 'stage' is set to `dev`.

Accessing the Kibana server requires you to set up a cognito user. The installation script can help you set up a cognito user, or you can do it manually through the AWS Cognito Console.

The installation script will print the URL to the Kibana server after setup completes. Navigate to this URL and enter your login credentials to access the Kibana server.

If you lose this URL, it can be found in the `INFO_OUTPUT.yml` file under the "ElasticSearchDomainKibanaEndpoint" entry.

#### DynamoDB Table Backups

Daily DynamoDB Table back-ups can be optionally deployed via an additional 'fhir-server-backups' stack. The installation script will deploy this stack automatically by if indicated during installation.

The reason behind multiple stacks is that backup vaults can be deleted only if they are empty, and you can't delete a stack that includes backup vaults if they contain any recovery points. With separate stacks it is easier for you to operate.

These back-ups work by using tags. In the [serverless.yaml](./serverless.yaml) you can see ResourceDynamoDBTable has a `backup - daily` & `service - fhir` tag. Anything with these tags will be backed-up daily at 5:00 UTC.

#### Audit Log Mover
Audit Logs are placed into CloudWatch Logs at <CLOUDWATCH_EXECUTION_LOG_GROUP>. The Audit Logs includes information about request/responses coming to/from your API Gateway. It also includes the Cognito user that made the request.

In addition, if you would like to archive logs older than 7 days into S3 and delete those logs from Cloudwatch Logs, please follow the instructions below.

From the root directory
 ```$sh
cd auditLogMover
serverless deploy --aws-profile <AWS PROFILE> --stage <STAGE> --region <AWS_REGION>
```

### Known Installation Issues

- Installation can fail if your computer already possesses an installation of Python 3 earlier than version 3.3.x.
- Linux installation has only been tested on CentOS and Ubuntu (version 18). Other Linux distributions may not work properly, and will likely require manual installation of dependencies.
- Windows installation has been tested when run from Windows Powershell for AWS. Running the install script from a regular powershell may fail.

## Usage Instructions

### User Variables
After installation, all user-specific variables (such as `USER_POOL_APP_CLIENT_ID`) can be found in the `INFO_OUTPUT.yml` file. You can also retrieve these values by running `serverless info --verbose --aws-profile FHIR-Solution`.
If you used a `stage` and/or `dev` values different than the default, you'll need to use the command `serverless info --verbose --aws-profile FHIR-Solution --region <REGION> --stage <STAGE>`.

### Authorizing a user

The FHIR solution uses RBAC to determine what interactions and what resources the requesting user has access too. The default ruleset can be found here: [RBACRules.ts](src\authorization\RBACRules.ts). For users to access the API they must use an OAuth access token in their request to the FHIR API. This access token must include scopes of either:

- `openid profile` Must have both
- `aws.cognito.signin.user.admin`

Using either of these scopes will include the user groups in the access token and without the user groups the FHIR solution is unable to do authorization.

#### Retrieving an access token via script (scope = aws.cognito.signin.user.admin)

In order to access the FHIR API, a COGNITO_AUTH_TOKEN is required. This can be obtained using the following command substituting all variables with their values from `INFO_OUTPUT.yml` or the previously mentioned `serverless info` command.

For Windows:

```sh
scripts/init-auth.py <USER_POOL_APP_CLIENT_ID> <REGION>
```

For Mac:

```sh
python3 scripts/init-auth.py <USER_POOL_APP_CLIENT_ID> <REGION>
```

The return value is the COGNITO_AUTH_TOKEN to be used for access to the FHIR APIs

#### Retrieving access token via postman (scope = openid profile)

In order to access the FHIR API, a COGNITO_AUTH_TOKEN is required. This can be obtained following the below steps within postman:

1. Open postman and click on the interaction you would like to take (i.e. `GET Patient`)
2. In the main screen click on the `Authorization` tab
3. Using the TYPE drop down choose `OAuth 2.0`
4. You should now see a button `Get New Access Token`; Click it
5. For 'Grant Type' choose `Implicit`
6. For 'Callback URL' use `http://localhost`
7. For 'Auth URL' use `https://<USER_POOL_APP_CLIENT_ID>.auth.<REGION>.amazoncognito.com/oauth2/authorize` which should look like: `https://42ulhdsc7q3l73mqm0u4at1pm8.auth.us-east-1.amazoncognito.com/oauth2/authorize`
8. For 'Client ID' use your USER_POOL_APP_CLIENT_ID which should look like: `42ulhdsc7q3l73mqm0u4at1pm8`
9. For 'Scope' use `profile openid`
10. For 'State' use a random string like `123`
11. Click `Request Token`
12. A sign in page should pop up where you should put in your username and password (if you don't know it look at the [init-auth.py](scripts\init-auth.py) script)
13. Once signed in the access token will be set and you will have access for ~1 hour

### Accessing the FHIR APIs

The APIs can be accessed through the API_URL using REST syntax as defined by FHIR here

> http://hl7.org/fhir/http.html

using this command

```sh
curl -H "Accept: application/json" -H "Authorization:<COGNITO_AUTH_TOKEN>" -H "x-api-key:<API_KEY>" <API_URL>
```

Other means of accessing the API are valid as well, such as Postman. More details for using Postman are detailed below in the _Using POSTMAN to make API Requests_ section.

#### Using POSTMAN to make API Requests

[POSTMAN](https://www.postman.com/) is an API Client for RESTful services that can run on your development desktop for making requests to the FHIR Server.

Included in this code package, under the folder “postman”, are JSON definitions for some requests that you can make against the server. To import these requests into your POSTMAN application, you can follow the directions [here](https://kb.datamotion.com/?ht_kb=postman-instructions-for-exporting-and-importing). Be sure to import the file

> Fhir.postman_collection.json.

After you import the example requests, you need to set up your environment. You can set up a local environment, a dev environment, and a prod environment. Each environment should have the correct values configured for it. For example the _API_URL_ for the local environment might be _localhost:3000_ while the _API_URL_ for the dev environment would be your API Gateway’s endpoint.

Instructions for importing the environment JSON is located [here](https://thinkster.io/tutorials/testing-backend-apis-with-postman/managing-environments-in-postman). The three environment files are:

- Fhir_Local_Env.json
- Fhir_Dev_Env.json
- Fhir_Prod_Env.json

The COGNITO_AUTH_TOKEN required for each of these files can be obtained by following the instructions under [Retrieving an authentication token](#authorizing-a-user).
Other parameters required can be found by running `serverless info --verbose`

### Accessing Binary resources

Binary resources are FHIR resources that consist of binary/unstructured data of any kind. This could be images, PDF, Video or other files. The implementation of the FHIR APIs is has a dependency on the API Gateway and Lambda services, which currently have limitations in package sizes of 10 and 6MB respectively. The intermediate workaround to this limitation is the hybrid approach of storing a binary resource’s _metadata_, using the response from the API’s PUT request against the resource. The response object contains a pre-signed S3 URL, which can be used to store the file directly in S3.

To test this with CURL, use the following command after issuing the PUT request and receiving the pre-signed URL in the response object:

```sh
curl -v -T "<LOCATION_OF_FILE_TO_UPLOAD>" "<PRESIGNED_PUT_URL>"
```

### Adding Encryption to S3 Bucket policy (Optional)

To encrypt all objects being stored in the S3 bucket as Binary resources, add the following yaml to the Resources' bucket policy:

```yaml
ForceEncryption:
  Type: AWS::S3::BucketPolicy
  DependsOn: FHIRBinaryBucket
  Properties:
    Bucket: !Ref FHIRBinaryBucket
    PolicyDocument:
      Version: '2012-10-17'
      Statement:
        - Sid: DenyUnEncryptedObjectUploads
          Effect: Deny
          Principal: ''
          Action:
            - s3:PutObject
          Resource:
            - !Join ['', ['arn:aws:s3:::', !Ref FHIRBinaryBucket, '/']]
          Condition:
            'Null':
              's3:x-amz-server-side-encryption': true
        - Sid: DenyIncorrectEncryptionHeader
          Effect: Deny
          Principal: ''
          Action:
            - s3:PutObject
          Resource:
            - !Join ['', ['arn:aws:s3:::', !Ref FHIRBinaryBucket, '/']]
          Condition:
            StringNotEquals:
              's3:x-amz-server-side-encryption': 'aws:kms'
```

#### Making requests to S3 buckets with added Encryption policy

S3 bucket policies can only examine request headers. When we set the Encryption parameters in the getSignedUrlPromise those parameters are added to the URL, not the HEADER. Therefore the bucket policy would block the request with encryption parameters in the URL. The workaround to add this bucket policy to the S3 bucket is have your client add the headers to the request as in the following example:

```sh
curl -v -T ${S3_UPLOAD_FILE} ${S3_PUT_URL} -H "x-amz-server-side-encryption: ${S3_SSEC_ALGORITHM}" -H "x-amz-server-side-encryption-aws-kms-key-id: ${KMS_SSEC_KEY}"
```

## Code Development and testing

### Prerequisites for development

The Code for FHIR Service is written in TypeScript. This requires your IDE to be able to handle and work with TypeScript. Make sure your IDE displays TS properly

> https://medium.com/@netczuk/even-faster-code-formatting-using-eslint-22b80d061461

### Deployment (general)

When doing development based on the code provided, any changes must be recompiled and deployed. It is important to note that an initial installation like that above must have been executed at least once in order to have all required users, databases and buckets available for use. There are two ways to achieve a subsequent deployment.

### AWS Cloud deployment

In order to re-build and re-deploy services to AWS after changes were made, rerun the `install.sh` or `win-install.ps1` script. If you used the Manual Installation instructions, follow the instructions in **AWS service deployment**.

### Local deployment

It can be quicker to deploy the FHIR API locally to test instead of running a complete Cloud based deployment. This deployment is temporary and will not be listening to further connection attempts once the local service is stopped. Deploy locally using

```sh
ACCESS_KEY=<AWS_ACCESS_KEY> SECRET_KEY=<AWS_SECRET_KEY> OFFLINE_BINARY_BUCKET=<FHIR_SERVER_BINARY_BUCKET> OFFLINE_ELASTICSEARCH_DOMAIN_ENDPOINT=<ELASTIC_SEARCH_DOMAIN_ENDPOINT> sls offline start
```

Once you start the server locally, take note of the API Key that is generated. When making a request to the local server, you will need that key for the header _x-api-key_. The key is defined in the output as

```sh
Key with token: <API_KEY>
```

## Direct ElasticSearch Access

### Running an ES command

In order to run a command directly in Elasticsearch, make sure you are in the folder

> scripts

and execute the following command:

```sh
ACCESS_KEY=<ACCESS_KEY> SECRET_KEY=<SECRET_KEY> ES_DOMAIN_ENDPOINT=<ES_DOMAIN_ENDPOINT> node elasticsearch-operations.js <REGION> "<function to execute>" "<optional additional params>"
```
These parameters can be found by checking the `INFO_OUTPUT.yml` file generated by the installation script, or by running the previously mentioned `serverless info --verbose` command.

## Manual Installation Prerequisites

Prerequisites for deployment and use of the FHIR service are the same across different client platforms. The installation examples are provided specifically for Mac OSX, if not otherwise specified. The required steps for installing the prerequisites on other client platforms may therefore vary from these.

#### AWS account

The FHIR Server is designed to use AWS services for data storage and API access. An AWS account is hence required in order to deploy and run the necessary components.

#### Node.JS

Node is used as the Lambda runtime. To install node, we recommend the use of nvm (the Node Version Manager):

> https://github.com/nvm-sh/nvm

If you'd rather just install Node 12.x by itself:

> https://nodejs.org/en/download/

### Python

Python is used for a few scripts to instantiate a Cognito user and could be regarded as optional. To install Python browse to:

> https://www.python.org/downloads/

### boto3 AWS Python SDK

Boto3 is the AWS Python SDK running as a Python import. The installation is platform-agnostic but requires Python and Pip to function:

```sh
pip install boto3
```

### yarn

Yarn is a node package management tool similar to npm. Instructions for installing Yarn are provided for different platforms here:

> https://classic.yarnpkg.com/en/docs/install

```sh
brew install yarn
```

### serverless CLI

Serverless is a tool used to deploy Lambda functions and associated resources to the target AWS account.
Instructions for installing Serverless are provided for different platforms here:

> https://serverless.com/framework/docs/getting-started/

```sh
curl -o- -L https://slss.io/install | bash
```

## Manual Installation

### AWS Credentials

Log into your AWS account, navigate to the IAM service, and create a new User. This will be required for deployment to the Dev environment. Add this IAM policy to the IAM user that you create:

### IAM Policy
This policy is also located in `scripts/iam_policy.json`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:*",
        "dynamodb:*",
        "events:*",
        "iam:*",
        "lambda:*",
        "logs:*",
        "s3:*",
        "xray:PutTelemetryRecords",
        "xray:PutTraceSegments",
        "tag:GetResources",
        "logs:*",
        "cognito-identity:*",
        "cognito-idp:*",
        "cognito-sync:*",
        "es:*",
        "cloudformation:*",
        "kms:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["apigateway:*"],
      "Resource": "arn:aws:apigateway:*::/*"
    }
  ]
}
```

Note down the below IAM user’s properties for further use later in the process.

- ACCESS_KEY
- SECRET-KEY
- IAM USER ARN

Use these credentials to create a new profile in the AWS credentials file based on these instructions:

> https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html

```sh
vi ~/.aws/credentials
```

You can use any available name for your AWS Profile (section name in []). Note down the name of the AWS profile for further use later in the process.

### Working directory selection

In a Terminal application or command shell, navigate to the directory containing the package’s code

### Package dependencies (Required)

Use Yarn to install all package dependencies and compile & test the code:

```sh
yarn install
yarn run release
```

### IAM User ARN

Create a new file in the package's root folder named

> serverless_config.json

In the _serverless_config.json_ file, add the following, using the previously noted IAM USER ARN.

```json
{
  "devAwsUserAccountArn": "<IAM USER ARN>"
}
```

### AWS service deployment

Using the previously noted AWS Profile, deploy the required AWS services to your AWS account using the default setting of stage: dev and region: us-west-2. To change the default stage/region look for the stage/region variable in the [serverless.yaml](./serverless.yaml) file under the provider: object.

```sh
serverless deploy --aws-profile <AWS PROFILE>
```

Or you can deploy with a custom stage (default: dev) and/or region (default: us-west-2)

```sh
serverless deploy --aws-profile <AWS PROFILE> --stage <STAGE> --region <AWS_REGION>
```

Retrieve auto-generated IDs or instance names using: (If you have provided non-default values for --stage and --region during `serverless deploy`, you will need to provide the same here as well)

```sh
serverless info --verbose --aws-profile <AWS PROFILE> --stage <STAGE> --region <AWS_REGION>
```

From the command’s output note down the following data

- REGION
  - from Service Information: region
- API_KEY
  - from Service Information: api keys: developer-key
- API_URL
  - from Service Information:endpoints: ANY
- USER_POOL_ID
  - from Stack Outputs: UserPoolId
- USER_POOL_APP_CLIENT_ID
  - from Stack Outputs: UserPoolAppClientId
- FHIR_SERVER_BINARY_BUCKET
  - from Stack Outputs: FHIRBinaryBucket
- ELASTIC_SEARCH_DOMAIN_ENDPOINT (dev stage ONLY)
  - from Stack Outputs: ElasticSearchDomainEndpoint
- ELASTIC_SEARCH_DOMAIN_KIBANA_ENDPOINT (dev stage ONLY)
  - from Stack Outputs: ElasticSearchDomainKibanaEndpoint
- ELASTIC_SEARCH_KIBANA_USER_POOL_ID (dev stage ONLY)
  - from Stack Outputs: ElasticSearchKibanaUserPoolId
- ELASTIC_SEARCH_KIBANA_USER_POOL_APP_CLIENT_ID (dev stage ONLY)
  - from Stack Outputs: ElasticSearchKibanaUserPoolAppClientId
- CLOUDWATCH_EXECUTION_LOG_GROUP
  - from Stack Outputs: CloudwatchExecutionLogGroup:

### Deploying Audit Log Mover
Audit Logs are placed into CloudWatch Logs at <CLOUDWATCH_EXECUTION_LOG_GROUP>. The Audit Logs includes information about request/responses coming to/from your API Gateway. It also includes the Cognito user that made the request.

In addition, if you would like to archive logs older than 7 days into S3 and delete those logs from Cloudwatch Logs, please follow the instructions below.

From the root directory
 ```$sh
cd auditLogMover
serverless deploy --aws-profile <AWS PROFILE> --stage <STAGE> --region <AWS_REGION>
```

### Initialize Cognito

Initially, AWS Cognito is set up supporting OAuth2 requests in order to support authentication and authorization. When first created there will be no users. This step creates a `workshopuser` and assigns the user to the `practitioner` User Group.

Execute the following command substituting all variables with previously noted
values:

For Windows:
First declare the following environment variables on your machine:
| Name | Value |
| --- | --- |
| AWS_ACCESS_KEY_ID | <ACCESS_KEY> |
| AWS_SECRET_ACCESS_KEY | <SECRET_KEY> |

Restart your terminal.

```sh
scripts/provision-user.py <USER_POOL_ID> <USER_POOL_APP_CLIENT_ID> <REGION>
```

For Mac:

```sh
AWS_ACCESS_KEY_ID=<ACCESS_KEY> AWS_SECRET_ACCESS_KEY=<SECRET_KEY> python3 scripts/provision-user.py <USER_POOL_ID> <USER_POOL_APP_CLIENT_ID> <REGION>
```

This will create a user in your Cognito User Pool. The return value will be an access token that can be used for authentication with the FHIR API.

### Accessing ElasticSearch Kibana Server

> NOTE: Kibana is only deployed in the default 'dev' stage; if you want Kibana set up in other stages, like 'production', please remove `Condition: isDev` from [elasticsearch.yaml](./cloudformation/elasticsearch.yaml)

The Kibana server allows you to explore data inside your ElasticSearch instance through a web UI.

In order to be able to access the Kibana server for your ElasticSearch Service Instance, you need to create and confirm a cognito user. Run the below command or create a user from the Cognito console.

```sh
# Find ELASTIC_SEARCH_KIBANA_USER_POOL_APP_CLIENT_ID in the printout
serverless info --verbose

# Create new user
aws cognito-idp sign-up \
  --region <REGION> \
  --client-id <ELASTIC_SEARCH_KIBANA_USER_POOL_APP_CLIENT_ID> \
  --username <youremail@address.com> \
  --password <TEMP_PASSWORD> \
  --user-attributes Name="email",Value="<youremail@address.com>"

# Find ELASTIC_SEARCH_KIBANA_USER_POOL_ID in the printout
# Notice this is a different ID from the one used in the last step
serverless info --verbose

# Confirm new user
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id <ELASTIC_SEARCH_KIBANA_USER_POOL_ID> \
  --username <youremail@address.com> \
  --region <REGION>

# Example
aws cognito-idp sign-up \
  --region us-west-2 \
  --client-id 4rcsm4o7lnmb3aoc2h64nv1324 \
  --username jane@amazon.com \
  --password Passw0rd! \
  --user-attributes Name="email",Value="jane@amazon.com"

aws cognito-idp admin-confirm-sign-up \
  --user-pool-id us-west-2_sOmeStRing \
  --username jane@amazon.com \
  --region us-west-2
```

#### Get Kibana Url

After the cognito user is created and confirmed you can now log in with the username and password, at the ELASTIC_SEARCH_DOMAIN_KIBANA_ENDPOINT (found with the `serverless info --verbose` command). **Note** Kibana will be empty at first and have no indices, they will be created once the FHIR server writes resources to the DynamoDB

### DynamoDB Table Back-ups (Optional)

If you are interested in having daily DynamoDB Table back-ups you must deploy an additional 'fhir-server-backups' stack. The reason behind this is, backup vaults can be deleted only if they are empty, and you can't delete a stack that includes backup vaults if they contain any recovery points. With separate stacks it is easier for you to operate.

These back-ups work by using tags. In the [serverless.yaml](./serverless.yaml) you can see ResourceDynamoDBTable has a `backup - daily` & `service - fhir` tag. Anything with these tags will be backed-up daily at 5:00 UTC.

To deploy the stack and start daily backups:

```sh
aws cloudformation create-stack --stack-name fhir-server-backups --template-body file://<file location of backup.yaml> --capabilities CAPABILITY_NAMED_IAM
# Example
aws cloudformation create-stack --stack-name fhir-server-backups --template-body file:///mnt/c/ws/src/FhirSolutionLambda/cloudformation/backup.yaml --capabilities CAPABILITY_NAMED_IAM
```

## Gotchas/Troubleshooting

- If changes are required for the elastic search instances you may have to do a replacement deployment. Meaning that it will blow away your elastic search cluster and build you a new one. The trouble with that is the data inside is also blown away. In future iterations we will create a one-off lambda that can redrive the data from dynamo to elastic search. A couple of options to work through this currently are:

  1. You can manually redrive the dynamo data to elastic search by creating a lambda
  1. You can refresh your dynamo table with a back-up
  1. You can remove all data from the dynamo table and that will create parity between elastic search and dynamo

- Support for STU3 and R4 releases of FHIR is based on the JSON schema provided by HL7. The schema for [R4](https://www.hl7.org/fhir/validation.html) is more restrictive that for [STU3](http://hl7.org/fhir/STU3/validation.html). The STU3 schema doesn’t restrict appending additional fields into the POST/PUT requests of a resource, whereas the R4 schema has a strict definition of what is permitted in the request.

## Feedback

We'd love to hear from you! Please reach out to [Steven](mailto:stevehj@amazon.com) or [Angus](mailto:angusgm@amazon.com) for any feedback.
