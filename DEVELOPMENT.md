# FHIR Works on AWS Development Instructions

In this guide we will go over how to develop and run the code locally. We will also go over how to deploy your local code packages to your AWS account.

## Prerequisites

- **Initial Install:** Please complete this [installation guide](./INSTALL.md) and get the initial `fhir-works-on-aws` code deployed to your AWS account.
- **Yalc**: We'll be using this to manage local packages, so please have [this package](https://github.com/whitecolor/yalc) installed on your system.

## Development

Please download all the `fhir-works-on-aws` package and place them inside one directory. Your parent directory should have these folders inside of them

```sh
./fhir-works-on-aws-deployment
./fhir-works-on-aws-interface
./fhir-works-on-aws-persistence-ddb
./fhir-works-on-aws-search-es
./fhir-works-on-aws-authz-rbac
./fhir-works-on-aws-routing
```

Copy these files to your parent directory

- [fhir-works-local-develop.sh](./scripts/fhir-works-local-develop.sh)
- [fhir-works-deploy.sh](./scripts/fhir-works-deploy.sh)
- [fhir-works-deploy-one-time-setup.sh](./scripts/fhir-works-deploy-one-time-setup.sh)

Run `./fhir-works-local-develop.sh` from the parent directory. This script will use `yarn` to link your `persistence`, `search`, `authz`, and `routing` package to your `interface` package. It will then link all five of those packages to your `deployment` package.

Once the script has finished running, you can run `yarn watch` in the directory of each package that you're developing in. This will pick up live changes from the packages. Then you can run this command in the `deployment` package directory to spin up your local environment:

`AWS_ACCESS_KEY_ID=<Access-Key> AWS_SECRET_ACCESS_KEY=<Secret-Key> OFFLINE_BINARY_BUCKET=<FHIRBinaryBucket> OFFLINE_ELASTICSEARCH_DOMAIN_ENDPOINT=<ElasticSearchDomainEndpoint> serverless offline start`

### Local Development with Implementation Guides

If you're using [Implementation Guides](./USING_IMPLEMENTATION_GUIDES.md), then follow these steps to run FHIR Works with IG locally. You'll need to provide the `OFFLINE_LAMBDA_VALIDATOR_ALIAS`.

Run this command in the `deployment` package directory to start your local environment:

`AWS_ACCESS_KEY_ID=<Access-Key> AWS_SECRET_ACCESS_KEY=<Secret-Key> OFFLINE_BINARY_BUCKET=<FHIRBinaryBucket> OFFLINE_ELASTICSEARCH_DOMAIN_ENDPOINT=<ElasticSearchDomainEndpoint> OFFLINE_VALIDATOR_LAMBDA_ALIAS=<ValidatorLambdaAlias> serverless offline start`

The command above runs the local FHIR server with the appropriate environment variables.

If you don't know the value for `OFFLINE_BINARY_BUCKET`,`OFFLINE_ELASTICSEARCH_DOMAIN_ENDPOINT`, and `OFFLINE_VALIDATOR_LAMBDA_ALIAS` value, run the following command in the deployment package directory: `serverless info --verbose`


## Deploy Local Packages to AWS

If you have made changes to the `fhir-works-on-aws` packages, and you would like to deploy those changes to your AWS account, follow the instructions below.

Before continuing with the rest of this section, be sure that you have followed the steps in the [**Development section**](#development) to set up your folder structure.

If this is your first time deploying your local changes to AWS, we will need to set up `yalc` to publish your packages to the local package registry. You can do that by running this command from the parent directory: `./fhir-works-deploy-one-time-setup.sh`

Once your packages have been published to the local package registry, run this command to package your code for deployment: `./fhir-works-deploy.sh`.

**Note:** Before running the deploy script, remember to add the latest version of the `deployment` package's `package.json` file into Git. The deploy script will make changes to the `deployment` package's `package.json` file.

The deploy script will push all of your packages, except for the `deployment` package to the local package registry. It will then go into your `deployment` folder, and add those local packages as dependencies. It then pulls those local packages into the `deployment` package so that you are ready to run `serverless deploy`

Run this command to deploy your code to AWS:
`serverless deploy --aws-profile <PROFILE> --stage <STAGE>`

## Troubleshooting

### Runtime.ImportModuleError on other FWoA package

If you run into error type `Runtime.ImportModuleError` with error message stating the offending method comes from another FWoA package, check the versions of local FWoA packages match the versions specified in `package.json`. If you see a mismatch, update the version number in `package.json` to match your local packages and commit the change should fix the issue.

As an example, if your local packages have versions specified as:

```sh
fhir-works-on-aws-authz-rbac@4.1.0+97caac97
fhir-works-on-aws-persistence-ddb@3.0.0+7f1d59ed
fhir-works-on-aws-routing@4.0.0+60259b47
fhir-works-on-aws-search-es@2.0.0+75ad6c2c
fhir-works-on-aws-interface@7.0.0+ceec8029
```

Then `package.json` should have the same versions specified as well:

```json
"dependencies": {
    "aws-sdk": "^2.785.0",
    "axios": "^0.21.1",
    "fhir-works-on-aws-authz-rbac": "4.1.0",
    "fhir-works-on-aws-interface": "7.0.0",
    "fhir-works-on-aws-persistence-ddb": "3.0.0",
    "fhir-works-on-aws-routing": "4.0.0",
    "fhir-works-on-aws-search-es": "2.0.0",
    "serverless-http": "^2.3.1"
  },
```

If you have a mismatch in `package.json`, say `fhir-works-on-aws-routing` was set to `4.1.0` instead of `4.0.0`. An error message

### Accessing Logs and Debugging on FWoA
Logs and Debugging are handled by [CloudWatch](https://docs.aws.amazon.com/cloudwatch/index.html). Detailed instructions on customizing CloudWatch to organize troubleshooting can be found [here](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html).

To access the logs generated by FWoA:
1. Log on to the AWS Console.
2. From the list of AWS services, select **CloudWatch**.
3. From the tab on the left, select **Log Groups**
4. From the list of log groups, select the Lambda Function or the APIGateway service that you would like to debug.
  * `/aws/lambda/fhir-service-{STAGE}-fhirServer` contains all the logs from the FWoA API server, including transactions and requests. This will be the log group to check when receiving errors from the FWoA server, in most cases.
  * `/aws/api-gateway/fhir-service-{STAGE}` contains all the logs related to the setup of the API Gateway for FWoA.
  * `/aws/lambda/fhir-service-{STAGE}-ddbtoES` contains all the logs from the process of writing DynamoDB resources to ElasticSearch.
  * `/aws-glue/jobs/output` contains all the logs related to the Bulk Export Glue Job execution.
  * `/aws/lambda/fhir-service-{STAGE}-getJobStatus` contains all the logs related to querying the status of a Bulk Export job.
  * `/aws/lambda/fhir-service-{STAGE}-startExportJob` contains all the logs related to starting a Bulk Export job.
  * `/aws/lambda/fhir-service-{STAGE}-stopExportJob` contains all the logs related to stopping a Bulk Export job.
  * `/aws/lambda/fhir-service-{STAGE}-updateStatus` contains all the logs related to updating a Bulk Export job.
  * `/aws/lambda/fhir-service-validator-{STAGE}-validator` contains all the logs pertaining to validation and implementation guides. These are useful in troubleshooting custom resources and implementation guides.
5. Select a stream to view the output for the function. If applicable, the version of the Lambda function will be prefixed in square brackets (`[]`) to help identify which stream corresponds to which version.
6. To further refine the output of the function, the events in a stream can be filtered using the options at the top of the list. In addition, you can perform broader searches through the **Log Insights** option on the tab on the left, underneath **Log Groups**. 
