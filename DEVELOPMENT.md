# FHIR Works on AWS Development Instructions

In this guide we will go over how to develop and run the code locally. We will also go over how to deploy your local code packages to your AWS account.

## Prerequisites

- **Initial Install:** Please complete this [installation guide](./INSTALL.md) and get the initial `fhir-works-on-aws` code deployed to your AWS account.
- **Yalc**: We'll be using this to manage local packages, so please have [this package](https://github.com/whitecolor/yalc) installed on your system.

## Development

Please download all the `fhir-works-on-aws` package and place them inside one directory. Your parent directory should have these folders inside of them

```
./fhir-works-on-aws-deployment
./fhir-works-on-aws-interface
./fhir-works-on-aws-persistence-ddb
./fhir-works-on-aws-search-es
./fhir-works-on-aws-authz-rbac
./fhir-works-on-aws-routing
```

Copy these files to your parent directory

- [fhir-works-local-develop.sh](./scripts/fhir-works-deploy.sh)
- [fhir-works-deploy.sh](./scripts/fhir-works-deploy.sh)
- [fhir-works-deploy-one-time-setup.sh](./scripts/fhir-works-deploy-one-time-setup.sh)

Run `./fhir-works-local-develop.sh` from the parent directory. This script will use `yarn` to link your `persistence`, `search`, `authz`, and `routing` package to your `interface` package. It will then link all five of those packages to your `deployment` package.

Once the script has finished running, you can run `yarn watch` in the directory of each package that you're developing in. This will pick up live changes from the packages. Then you can run this command in the `deployment` package directory to spin up your local environment:

`AWS_ACCESS_KEY_ID=<Access-Key> AWS_SECRET_ACCESS_KEY=<Secret-Key> OFFLINE_BINARY_BUCKET=<FHIRBinaryBucket> OFFLINE_ELASTICSEARCH_DOMAIN_ENDPOINT=<ElasticSearchDomainEndpoint> serverless offline start`

If you don't know the `OFFLINE_BINARY_BUCKET` and `OFFLINE_ELASTICSEARCH_DOMAIN_ENDPOINT` value, you can run `serverless info --verbose` in the deployment package directory.

## Deploy Local Packages to AWS

If you have made changes to the `fhir-works-on-aws` packages, and you would like to deploy those changes to your AWS account, follow the instructions below.

Before continuing with the rest of this section, be sure that you have followed the steps in the [**Development section**](#development) to set up your folder structure.

If this is your first time deploying your local changes to AWS, we will need to set up `yalc` to publish your packages to the local package registry. You can do that by running this command from the parent directory: `./fhir-works-deploy-one-time-setup.sh`

Once your packages have been published to the local package registry, run this command to package your code for deployment: `./fhir-works-deploy.sh`.

**Note:** Before running the deploy script, remember to add the latest version of the `deployment` package's `package.json` file into Git. The deploy script will make changes to the `deployment` package's `package.json` file.

The deploy script will push all of your packages, except for the `deployment` package to the local package registry. It will then go into your `deployment` folder, and add those local packages as dependencies. It then pulls those local packages into the `deployment` package so that you are ready to run `serverless deploy`

Run this command to deploy your code to AWS:
`serverless deploy --aws-profile <PROFILE> --stage <STAGE>`
