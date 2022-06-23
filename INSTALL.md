# FHIR Works on AWS Deployment Installation

## Prerequisites

- **AWS Account**: The FHIR Server is designed to use AWS services for data storage and API access. An AWS account is hence required in order to deploy and run the necessary components.
- **RAM Requirements**: 1 GB or RAM or less will result in out of memory errors. We recommend using a computer with at least 4 GB of RAM.
- **AWS CLI (Linux & macOS only)**: [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) is required for Linux and macOS installations.
- **Homebrew (macOS Only)**: macOS Installation uses [Homebrew](https://brew.sh/) to install dependencies.
- **Windows PowerShell for AWS (Windows Only)**: Windows installation has been tested in [AWSPowerShell](https://docs.aws.amazon.com/powershell/latest/userguide/pstools-getting-set-up-windows.html#ps-installing-awswindowspowershell).
- **ARM64 not supported**: If this is a blocker for you please let us know [fhir-works-on-aws-dev](mailto:fhir-works-on-aws-dev@amazon.com).

You'll need an IAM User with sufficient permissions to deploy this solution.
You can use an existing User with AdministratorAccess or you can [create an IAM User](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html) with the following policy [scripts/iam_policy.json](./scripts/iam_policy.json)

## Manual installation prerequisites

Prerequisites for deployment and use of the FHIR service are the same across different client platforms. The installation examples are provided specifically for Mac OSX, if not otherwise specified. The required steps for installing the prerequisites on other client platforms may therefore vary from these.

### AWS account

The FHIR Server is designed to use AWS services for data storage and API access. An AWS account is hence required in order to deploy and run the necessary components.

### Node.JS

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

### CDK CLI
AWS CDK (Cloud Development Kit) is a framework for defining cloud infrastructure such as Lambda functions and associated resources in code and provisioning it in the target AWS Account through AWS CloudFormation.
Instructions for installing CDK are provided for different platforms here:

> https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html

### serverless CLI (LEGACY)

Serverless is a tool used to deploy Lambda functions and associated resources to the target AWS account.
Instructions for installing Serverless are provided for different platforms here:

> https://serverless.com/framework/docs/getting-started/

```sh
curl -o- -L https://slss.io/install | bash
```

## Manual installation

### AWS credentials

Log into your AWS account, navigate to the IAM service, and create a new User. This will be required for deployment to the Dev environment. Add the IAM policy located at [scripts/iam_policy.json](./scripts/iam_policy.json) to the IAM user that you create.

Note down the below IAM user’s properties for further use later in the process.

- ACCESS_KEY
- SECRET_KEY
- IAM_USER_ARN

Use these credentials to create a new profile in the AWS credentials file based on these instructions:

> https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html

```sh
vi ~/.aws/credentials
```

You can use any available name for your AWS Profile (section name in []). Note down the name of the AWS profile for further use later in the process.

### Working directory selection

In a Terminal application or command shell, navigate to the directory containing the package’s code

### Package dependencies (required)

Use Yarn to install all package dependencies and compile & test the code:

```sh
yarn install
yarn run release
```

### IAM User ARN

Create a new file in the package's root folder named

> serverless_config.json

In the _serverless_config.json_ file, add the following, using the previously noted IAM_USER_ARN.

```json
{
  "devAwsUserAccountArn": "<IAM_USER_ARN>"
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
  - from Stack Outputs: ElasticsearchDomainEndpoint
- ELASTIC_SEARCH_DOMAIN_KIBANA_ENDPOINT (dev stage ONLY)
  - from Stack Outputs: ElasticsearchDomainKibanaEndpoint
- ELASTIC_SEARCH_KIBANA_USER_POOL_ID (dev stage ONLY)
  - from Stack Outputs: ElasticsearchKibanaUserPoolId
- ELASTIC_SEARCH_KIBANA_USER_POOL_APP_CLIENT_ID (dev stage ONLY)
  - from Stack Outputs: ElasticsearchKibanaUserPoolAppClientId
- CLOUDWATCH_EXECUTION_LOG_GROUP
  - from Stack Outputs: CloudwatchExecutionLogGroup:

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

### Enable Elasticsearch logging

We recommend you to add Elasticsearch logging for production workflows. For steps on how to enable them please see our the [AWS guide](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-createdomain-configure-slow-logs.html)

### Direct Elasticsearch access

#### Running an ES command

In order to run a command directly in Elasticsearch, make sure you are in the folder

> scripts

and execute the following command:

```sh
ACCESS_KEY=<ACCESS_KEY> SECRET_KEY=<SECRET_KEY> ES_DOMAIN_ENDPOINT=<ES_DOMAIN_ENDPOINT> node elasticsearch-operations.js <REGION> "<function to execute>" "<optional additional params>"
```

These parameters can be found by checking the `Info_Output.log` file generated by the installation script, or by running the previously mentioned `serverless info --verbose` command.

### Optional installation configurations

#### Elasticsearch Kibana server

The Kibana server allows you to explore data inside your Elasticsearch instance through a web UI. This server is automatically created if 'stage' is set to `dev`.

Accessing the Kibana server requires you to set up a Cognito user. The installation script can help you set up a Cognito user, or you can do it manually through the AWS Cognito Console. Please ensure your Kibana Cognito user has an associated email address.

The installation script will print the URL to the Kibana server after setup completes. Navigate to this URL and enter your login credentials to access the Kibana server.

If you lose this URL, it can be found in the `Info_Output.log` file under the "ElasticsearchDomainKibanaEndpoint" entry.

##### Accessing Elasticsearch Kibana server

> NOTE: Kibana is only deployed in the default 'dev' stage; if you want Kibana set up in other stages, like 'production', please remove `Condition: isDev` from [elasticsearch.yaml](./cloudformation/elasticsearch.yaml)

The Kibana server allows you to explore data inside your Elasticsearch instance through a web UI.

In order to be able to access the Kibana server for your Elasticsearch Service Instance, you need to create and confirm a Cognito user. This Cognito user must also have an email address associated with it. Run the below command or create a user from the Cognito console.

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

###### Get Kibana url

After the Cognito user is created and confirmed you can now log in with the username and password, at the ELASTIC_SEARCH_DOMAIN_KIBANA_ENDPOINT (found with the `serverless info --verbose` command). **Note** Kibana will be empty at first and have no indices, they will be created once the FHIR server writes resources to the DynamoDB

#### DynamoDB table backups

Daily DynamoDB Table back-ups can be optionally deployed via an additional 'fhir-server-backups' stack. The installation script will deploy this stack automatically if indicated during installation.

The reason behind multiple stacks is that backup vaults can be deleted only if they are empty, and you can't delete a stack that includes backup vaults if they contain any recovery points. With separate stacks it is easier for you to operate.

These back-ups work by using tags. In the [serverless.yaml](./serverless.yaml) you can see ResourceDynamoDBTableV2 has a `backup - daily` & `service - fhir` tag. Anything with these tags will be backed-up daily at 5:00 UTC.

To deploy the stack and start daily backups (outside of the install script):

```sh
aws cloudformation create-stack --stack-name fhir-server-backups --template-body file://<file location of backup.yaml> --capabilities CAPABILITY_NAMED_IAM
# Example
aws cloudformation create-stack --stack-name fhir-server-backups --template-body file:///mnt/c/ws/src/fhir-works-on-aws-deployment/cloudformation/backup.yaml --capabilities CAPABILITY_NAMED_IAM
```

#### Audit log mover

Audit Logs are placed into CloudWatch Logs at <CLOUDWATCH_EXECUTION_LOG_GROUP>. The Audit Logs includes information about request/responses coming to/from your API Gateway. It also includes the Cognito user that made the request.

In addition, if you would like to archive logs older than 7 days into S3 and delete those logs from Cloudwatch Logs, please follow the instructions below.

From the root directory

```sh
cd auditLogMover
yarn install
serverless deploy --aws-profile <AWS PROFILE> --stage <STAGE> --region <AWS_REGION>
```

#### Adding encryption to S3 bucket policy (Optional)

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

##### Making requests to S3 buckets with added encryption policy

S3 bucket policies can only examine request headers. When we set the encryption parameters in the getSignedUrlPromise those parameters are added to the URL, not the HEADER. Therefore the bucket policy would block the request with encryption parameters in the URL. The workaround to add this bucket policy to the S3 bucket is have your client add the headers to the request as in the following example:

```sh
curl -v -T ${S3_UPLOAD_FILE} ${S3_PUT_URL} -H "x-amz-server-side-encryption: ${S3_SSEC_ALGORITHM}" -H "x-amz-server-side-encryption-aws-kms-key-id: ${KMS_SSEC_KEY}"
```

### Overall Troubleshooting

- During installation if you encounter this error

`An error occurred: DynamodbKMSKey - Exception=[class software.amazon.awssdk.services.kms.model.MalformedPolicyDocumentException] ErrorCode=[MalformedPolicyDocumentException], ErrorMessage=[Policy contains a statement with one or more invalid principals.]`

Then serverless has generated an invalid Cloudformation template.

1. Check that `serverless_config.json` has the correct `IAMUserArn`. You can get the arn by running `$(aws sts get-caller-identity --query "Arn" --output text)`
2. Go to your AWS account and delete the `fhir-service-<stage>` Cloudformation template if it exist.
3. Run `sudo ./scripts/install.sh` again

If you still get the same error after following the steps above, try removing the `fhir-works-on-aws-deployment` repository and downloading it again. Then proceed from step 2.

- During installation if you're on a Linux machine and using Docker

If Docker is erroring out while running `apt-get`, it might be because it's unable to reach the Debian server to get software updates. Try running the build command with `--network=host`.
Run `docker build -t fhir-server-install --network=host -f docker/Dockerfile .`

Note: This issue was seen on a Fedora 32 machine.

## Initial installation (LEGACY)

This installation guide covers a basic installation on Windows, Unix-like systems, or through Docker. The Linux installation has been tested on macOS Catalina, CentOS (Amazon Linux 2), and Ubuntu (18.04 LTS), and the Windows installation has been tested on Windows Server 2019 and Windows 10. If you encounter any problems installing in this way, please see the [Known Installation Issues](#known-installation-issues), or refer to the [Manual Installation](#manual-installation).

### Linux or macOS installation

In a Terminal application or command shell, navigate to the directory containing the package’s code.

Configure your AWS Credentials:

```sh
aws configure
```

Run the following lines of code:

```sh
chmod +x ./scripts/install.sh
sudo ./scripts/install.sh
```

The `sudo` command may prompt you for your password, after which installation will commence. Follow the directions in the script to finish installation. See the following section for details on optional installation settings.
The `stage` and `region` values are set by default to `dev` and `us-west-2`, but they can be changed with command line arguments as follows:

```sh
sudo ./scripts/install.sh --region <REGION> --stage <STAGE>
```

You can also use their abbreviations:

```sh
sudo ./scripts/install.sh -r <REGION> -s <STAGE>
```

#### Linux or macOS Troubleshooting

If your PATH or environment variables are not accessible to the root/sudo user, you can try to use this command:

```sh
sudo "PATH=$PATH" -E ./scripts/install.sh
```

You also may have to set `AWS_CONFIG_FILE` and `AWS_SHARED_CREDENTIALS_FILE` variables, even if the files are at their default locations :

```sh
export AWS_CONFIG_FILE=~/.aws/config
export AWS_SHARED_CREDENTIALS_FILE=~/.aws/credentials
sudo -E ./scripts/install.sh
```

If you are using AWS Named Profiles, please use the `AWS_PROFILE` environment variable to set it, and use the `-E` sudo flag :

```sh
export AWS_PROFILE=myprofile
sudo -E ./scripts/install.sh
```

### Windows installation

Open Windows PowerShell for AWS as Administrator, and navigate to the directory containing the package's code.

Configure your AWS Credentials:

```powershell
Initialize-AWSDefaultConfiguration -AccessKey <aws_access_key_id> -SecretKey <aws_secret_access_key> -ProfileLocation $HOME\.aws\credentials"
```

**Note:** The `-ProfileLocation $HOME\.aws\credentials` is required. The installation script uses the nodejs aws-sdk and it requires credentials to be located on the SharedCredentialsFile

Run the following lines of code:

```powershell
Set-ExecutionPolicy RemoteSigned
.\scripts\win_install.ps1
```

`Set-ExecutionPolicy RemoteSigned` is used to make the script executable on your machine. In the event this command cannot be executed (this often happens on managed computers), you can still try to execute `.\scripts\win_install.ps1`, as your computer may already be set up to allow the script to be executed. If this fails, you can install using Docker, install in the cloud via EC2 (running Amazon Linux 2) or Cloud9 (running Amazon Linux 2 or Ubuntu), or install manually.

Follow the directions in the script to finish installation. See the Optional Installation Configurations section for more details.

The `stage` and `region` values are set by default to `dev` and `us-west-2`, but they can be changed with command line arguments as follows:

```powershell
.\scripts\win_install.ps1 -Region <REGION> -Stage <STAGE>
```

#### Windows Troubleshooting

When installing the service locally, please install the service on the C drive. We have had [reported issues](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/195) of installing on the D drive.

### Docker installation

Install Docker (if you do not have it already) by following instructions on https://docs.docker.com/get-docker/

Configure your AWS Credentials:

```sh
aws configure
```

```sh
docker build -t fhir-server-install -f docker/Dockerfile .
docker run -v ~/.aws/credentials:/home/node/.aws/credentials:ro -it -l install-container fhir-server-install
```

Follow the directions in the script to finish installation. See the following section for details on optional installation settings.

The `stage` and `region` values are set by default to `dev` and `us-west-2`, but they can be changed with command line arguments as follows:

```sh
docker run -it -l install-container fhir-server-install --region <REGION> --stage <STAGE>
```

You can also use their abbreviations:

```sh
docker run -it -l install-container fhir-server-install -r <REGION> -s <STAGE>
```

If you would like to retrieve `Info_Output.log` file from the container, use the following commands:

```sh
container_id=$(docker ps -f "label=install-container" --format "{{.ID}}")
docker cp ${container_id}:/home/node/fhir-works-on-aws-deployment/Info_Output.log .
```

To remove container:

```sh
container_id=$(docker ps -f "label=install-container" --format "{{.ID}}")
docker rm ${container_id}
```

### Known installation issues

- Installation can fail if your computer already possesses an installation of Python 3 earlier than version 3.3.x.
- Linux installation has only been tested on CentOS and Ubuntu (version 18). Other Linux distributions may not work properly, and will likely require manual installation of dependencies.
- Windows installation has been tested when run from Windows PowerShell for AWS. Running the install script from a regular PowerShell may fail.
- Cloud9 installation may fail (when using Amazon Linux 2 instance) with the following error message:

```sh
Error: Package: 1:npm-3.10.10-1.6.17.1.1.el7.x86_64 (@epel)
           Requires: nodejs = 1:6.17.1-1.el7
(additional lines are omitted)
```

If you encounter this error run `sudo yum erase npm` and then re-run installation script.
