#!/bin/bash -e

set -x

#
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
#
# This script is used to generate and upload a standalone CloudFormation template to a provided S3 bucket,
# using an existing serverless.yaml configuration (from the Serverless Framework).
# Lambda code assets that are output from `sls package` are also uploaded for use.
#
# This script should be run from the repo's root directory (same directory as serverless.yaml)
# chmod +x ./deployment/build-s3-dist.sh && ./deployment/build-s3-dist.sh <BUCKET_NAME> <VERSION_CODE> <REGION> <SOLUTION_NAME>


# Package output directory is assumed to be default (.serverless). Passing -p flag to `sls package` can break this script.
# Dependencies: npm, aws CLI (configured), sed, jq
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo Please provide all three parameters
    echo For example: "$0" solutions v1.0.0 us-east-1
    exit 1
fi

BUCKET_NAME=$1
VERSION_CODE=$2
REGION=$3
SOLUTION_NAME=$4

# Get reference for all important folders
DEPLOYMENT_DIR="$PWD/deployment"
SOURCE_DIR="$PWD/source"
GLOBAL_DIR="$DEPLOYMENT_DIR/global-s3-assets"
REGIONAL_DIR="$DEPLOYMENT_DIR/regional-s3-assets"

# Clean and remake directories
rm -rf $GLOBAL_DIR
rm -rf $REGIONAL_DIR
mkdir -p $GLOBAL_DIR # For template
mkdir -p $REGIONAL_DIR # For Lambda assets (zip files)

function cleanup(){
    # $1: The line number to remove
    echo Removing deploymentBucket from serverless.yaml from line "$1"
    sed -i -e ''"$1"'d' serverless.yaml
}

cd $SOURCE_DIR
echo In directory: $(pwd)
echo Installing dependencies
npm install --global yarn@1.22.5 && yarn install --frozen-lockfile

echo Using region: "$REGION"
echo Adding provider.deploymentBucket to serverless.yaml
PROVIDER_LINE=$(sed -n '/provider:/=' serverless.yaml | sort | head -1) # Looks for first instance of 'provider:'
DEPLOYMENT_BUCKET_LINE=$(("$PROVIDER_LINE" + 1))
sed -i ''"$DEPLOYMENT_BUCKET_LINE"' a \ \ deploymentBucket: '"$BUCKET_NAME"'' serverless.yaml
trap 'cleanup $(("$DEPLOYMENT_BUCKET_LINE" + 1))' EXIT

SERVERLESS_OUTPUT_PATH=$DEPLOYMENT_DIR/.serverless/
mkdir -p $SERVERLESS_OUTPUT_PATH # Put the output of sls package in this directory so it doesn't delete everything else that is already in the deployment folder
yarn run serverless package --region "$REGION" --package $SERVERLESS_OUTPUT_PATH
echo Package completed, modifying template

cd $DEPLOYMENT_DIR
echo In directory: $(pwd)
TEMPLATE_PATH=./.serverless/cloudformation-template-update-stack.json
FHIR_SERVICE_LAMBDA_CODE_PATH="$SOLUTION_NAME"/"$VERSION_CODE"/fhir-service.zip
CUSTOM_RESOURCE_LAMBDA_CODE_PATH="$SOLUTION_NAME"/"$VERSION_CODE"/custom-resources.zip
S3_BUCKET_FIND_IN_MAP='{"Fn::Join":["-",[{"Fn::FindInMap":["SourceCode","General","S3Bucket"]},{"Ref":"AWS::Region"}]]}'
MAPPINGS_SECTION_FORMAT='{"Mappings":{"SourceCode":{"General":{"S3Bucket":"%s"}}}}'
MAPPINGS_SECTION=$(printf $MAPPINGS_SECTION_FORMAT $BUCKET_NAME)

# Add mappings section to template
cat $TEMPLATE_PATH | jq --argjson mappings $MAPPINGS_SECTION '. + $mappings' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

# Update template description
cat $TEMPLATE_PATH | jq ".Description = \"(SO0128) - $VERSION_CODE - Solution - Primary Template - This template creates all the necessary resources to deploy FHIR Works on AWS; a framework to deploy a FHIR server on AWS.
\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

# Add API Gateway log settings
DEPLOYMENT_RESOURCE_NAME=$(cat $TEMPLATE_PATH | jq '.Resources | keys[] | select( . | startswith("ApiGatewayDeployment"))') # Name of the deployment resource is dynamic
DEV_STAGE='{
      "Type": "AWS::ApiGateway::Stage",
      "Properties": {
        "StageName": "dev",
        "Description": "dev Stage",
        "RestApiId": {
            "Ref": "ApiGatewayRestApi"
        },
        "DeploymentId": { "Ref":'$DEPLOYMENT_RESOURCE_NAME'},
        "AccessLogSetting": {
          "DestinationArn" : {
            "Fn::GetAtt": [
              "ApiGatewayLogGroup",
              "Arn"
            ]
          },
          "Format" : "{\"authorizer.claims.sub\":\"$context.authorizer.claims.sub\",\"error.message\":\"$context.error.message\",\"extendedRequestId\":\"$context.extendedRequestId\",\"httpMethod\":\"$context.httpMethod\",\"identity.sourceIp\":\"$context.identity.sourceIp\",\"integration.error\":\"$context.integration.error\",\"integration.integrationStatus\":\"$context.integration.integrationStatus\",\"integration.latency\":\"$context.integration.latency\",\"integration.requestId\":\"$context.integration.requestId\",\"integration.status\":\"$context.integration.status\",\"path\":\"$context.path\",\"requestId\":\"$context.requestId\",\"responseLatency\":\"$context.responseLatency\",\"responseLength\":\"$context.responseLength\",\"stage\":\"$context.stage\",\"status\":\"$context.status\"}"
        }
      }
    }'
cat $TEMPLATE_PATH | jq --argjson devstage "$DEV_STAGE" '.Resources = .Resources + {Dev: $devstage}' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq '.Resources.ApiGatewayApiKey1.DependsOn = [.Resources.ApiGatewayApiKey1.DependsOn, "Dev"]' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq '.Resources.ApiGatewayUsagePlan.DependsOn = [.Resources.ApiGatewayUsagePlan.DependsOn, "Dev"]' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq --argjson deployment "$DEPLOYMENT_RESOURCE_NAME" 'del(.Resources[$deployment].Properties.StageName)' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq --argjson deployment "$DEPLOYMENT_RESOURCE_NAME" --argjson metadata '{"cfn_nag":{"rules_to_suppress":[{"id": "W68","reason":"Usage plan is associated with stage name dev"},{"id":"W45", "reason":"Updated via custom resource after resource creation"}]}}' '.Resources[$deployment] = .Resources[$deployment] + {Metadata: $metadata}' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq --argjson metadata '{"cfn_nag":{"rules_to_suppress":[{"id": "W64","reason":"Usage plan is associated with stage name dev"}]}}' '.Resources.Dev = .Resources.Dev + {Metadata: $metadata}' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

# Update bucket names
cat $TEMPLATE_PATH | jq --argjson mapping $S3_BUCKET_FIND_IN_MAP '.Resources.FhirServerLambdaFunction.Properties.Code.S3Bucket = $mapping' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq --argjson mapping $S3_BUCKET_FIND_IN_MAP '.Resources.DdbToEsLambdaFunction.Properties.Code.S3Bucket = $mapping' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq --argjson mapping $S3_BUCKET_FIND_IN_MAP '.Resources.CustomDashresourceDashapigwDashcwDashroleLambdaFunction.Properties.Code.S3Bucket = $mapping' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH


cat $TEMPLATE_PATH | jq --argjson mapping $S3_BUCKET_FIND_IN_MAP '.Resources.StartExportJobLambdaFunction.Properties.Code.S3Bucket = $mapping' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq --argjson mapping $S3_BUCKET_FIND_IN_MAP '.Resources.StopExportJobLambdaFunction.Properties.Code.S3Bucket = $mapping' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq --argjson mapping $S3_BUCKET_FIND_IN_MAP '.Resources.GetJobStatusLambdaFunction.Properties.Code.S3Bucket = $mapping' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq --argjson mapping $S3_BUCKET_FIND_IN_MAP '.Resources.UpdateStatusLambdaFunction.Properties.Code.S3Bucket = $mapping' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq --argjson mapping $S3_BUCKET_FIND_IN_MAP '.Resources.UploadGlueScriptsLambdaFunction.Properties.Code.S3Bucket = $mapping' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

cat $TEMPLATE_PATH | jq --argjson mapping $S3_BUCKET_FIND_IN_MAP '.Outputs.ServerlessDeploymentBucketName.Value = $mapping' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

# Update code keys and custom_user_agent
cat $TEMPLATE_PATH | jq ".Resources.FhirServerLambdaFunction.Properties.Code.S3Key = \"$FHIR_SERVICE_LAMBDA_CODE_PATH\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq ".Resources.FhirServerLambdaFunction.Properties.Environment.Variables.CUSTOM_USER_AGENT = \""AwsSolution/SO0128/$VERSION_CODE"\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

cat $TEMPLATE_PATH | jq ".Resources.DdbToEsLambdaFunction.Properties.Code.S3Key = \"$FHIR_SERVICE_LAMBDA_CODE_PATH\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq ".Resources.DdbToEsLambdaFunction.Properties.Environment.Variables.CUSTOM_USER_AGENT = \""AwsSolution/SO0128/$VERSION_CODE"\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

cat $TEMPLATE_PATH | jq ".Resources.StartExportJobLambdaFunction.Properties.Code.S3Key = \"$FHIR_SERVICE_LAMBDA_CODE_PATH\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq ".Resources.StartExportJobLambdaFunction.Properties.Environment.Variables.CUSTOM_USER_AGENT = \""AwsSolution/SO0128/$VERSION_CODE"\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

cat $TEMPLATE_PATH | jq ".Resources.StopExportJobLambdaFunction.Properties.Code.S3Key = \"$FHIR_SERVICE_LAMBDA_CODE_PATH\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq ".Resources.StopExportJobLambdaFunction.Properties.Environment.Variables.CUSTOM_USER_AGENT = \""AwsSolution/SO0128/$VERSION_CODE"\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

cat $TEMPLATE_PATH | jq ".Resources.GetJobStatusLambdaFunction.Properties.Code.S3Key = \"$FHIR_SERVICE_LAMBDA_CODE_PATH\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq ".Resources.GetJobStatusLambdaFunction.Properties.Environment.Variables.CUSTOM_USER_AGENT = \""AwsSolution/SO0128/$VERSION_CODE"\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

cat $TEMPLATE_PATH | jq ".Resources.UpdateStatusLambdaFunction.Properties.Code.S3Key = \"$FHIR_SERVICE_LAMBDA_CODE_PATH\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq ".Resources.UpdateStatusLambdaFunction.Properties.Environment.Variables.CUSTOM_USER_AGENT = \""AwsSolution/SO0128/$VERSION_CODE"\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

cat $TEMPLATE_PATH | jq ".Resources.UploadGlueScriptsLambdaFunction.Properties.Code.S3Key = \"$FHIR_SERVICE_LAMBDA_CODE_PATH\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq ".Resources.UploadGlueScriptsLambdaFunction.Properties.Environment.Variables.CUSTOM_USER_AGENT = \""AwsSolution/SO0128/$VERSION_CODE"\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

cat $TEMPLATE_PATH | jq ".Resources.CustomDashresourceDashapigwDashcwDashroleLambdaFunction.Properties.Code.S3Key = \"$CUSTOM_RESOURCE_LAMBDA_CODE_PATH\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq ".Resources.CustomDashresourceDashapigwDashcwDashroleLambdaFunction.Properties.Environment.Variables.CUSTOM_USER_AGENT = \""AwsSolution/SO0128/$VERSION_CODE"\"" > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

cat $TEMPLATE_PATH | jq --argjson metadata '{"cfn_nag":{"rules_to_suppress":[{"id":"W59","reason":"FHIR specification allows for no auth on /metadata"}]}}' '.Resources.ApiGatewayMethodMetadataGet = .Resources.ApiGatewayMethodMetadataGet + {Metadata: $metadata}' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq --argjson metadata '{"cfn_nag":{"rules_to_suppress":[{"id":"W59","reason":"FHIR specification allows for no auth on /tenant/{tenantId}/metadata"}]}}' '.Resources.ApiGatewayMethodTenantTenantidVarMetadataGet = .Resources.ApiGatewayMethodTenantTenantidVarMetadataGet + {Metadata: $metadata}' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH
cat $TEMPLATE_PATH | jq --argjson metadata '{"cfn_nag":{"rules_to_suppress":[{"id": "W28","reason":"API key name must be known before sls package is run"}]}}' '.Resources.ApiGatewayApiKey1 = .Resources.ApiGatewayApiKey1 + {Metadata: $metadata}' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

# CustomDashresourceDashapigwDashcwDashroleLambdaFunction Nag exceptions
cat $TEMPLATE_PATH | jq --argjson metadata '{"cfn_nag":{"rules_to_suppress":[{"id":"W89","reason":"We do not want a VPC for CustomDashresourceDashapigwDashcwDashroleLambdaFunction. This lambda is used during deployment to set up infra"}, {"id":"W92","reason":"We do not want to define ReservedConcurrentExecutions since this function is used during deployment to set up infra"}]}}' '.Resources.CustomDashresourceDashapigwDashcwDashroleLambdaFunction = .Resources.CustomDashresourceDashapigwDashcwDashroleLambdaFunction + {Metadata: $metadata}' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

# FhirServerLambdaFunction Nag exceptions
cat $TEMPLATE_PATH | jq --argjson metadata '{"cfn_nag":{"rules_to_suppress":[{"id":"W89","reason":"We do not want a VPC for FhirServerLambdaFunction. We are controlling access to the lambda using IAM roles"}, {"id":"W92","reason":"We do not want to define ReservedConcurrentExecutions since we want to allow this function to scale up"}]}}' '.Resources.FhirServerLambdaFunction = .Resources.FhirServerLambdaFunction + {Metadata: $metadata}' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

# DdbToEsLambdaFunction Nag exceptions
cat $TEMPLATE_PATH | jq --argjson metadata '{"cfn_nag":{"rules_to_suppress":[{"id":"W89","reason":"We do not want a VPC for DdbToEsLambdaFunction. We are controlling access to the lambda using IAM roles"}, {"id":"W92","reason":"We do not want to define ReservedConcurrentExecutions since we want to allow this function to scale up"}]}}' '.Resources.DdbToEsLambdaFunction = .Resources.DdbToEsLambdaFunction + {Metadata: $metadata}' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

# StartExportJobLambdaFunction Nag exceptions
cat $TEMPLATE_PATH | jq --argjson metadata '{"cfn_nag":{"rules_to_suppress":[{"id":"W89","reason":"We do not want a VPC for StartExportJobLambdaFunction. We are controlling access to the lambda using IAM roles"}, {"id":"W92","reason":"We do not want to define ReservedConcurrentExecutions since we want to allow this function to scale up"}]}}' '.Resources.StartExportJobLambdaFunction = .Resources.StartExportJobLambdaFunction + {Metadata: $metadata}' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

# StopExportJobLambdaFunction Nag exceptions
cat $TEMPLATE_PATH | jq --argjson metadata '{"cfn_nag":{"rules_to_suppress":[{"id":"W89","reason":"We do not want a VPC for StopExportJobLambdaFunction. We are controlling access to the lambda using IAM roles"}, {"id":"W92","reason":"We do not want to define ReservedConcurrentExecutions since we want to allow this function to scale up"}]}}' '.Resources.StopExportJobLambdaFunction = .Resources.StopExportJobLambdaFunction + {Metadata: $metadata}' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

# GetJobStatusLambdaFunction Nag exceptions
cat $TEMPLATE_PATH | jq --argjson metadata '{"cfn_nag":{"rules_to_suppress":[{"id":"W89","reason":"We do not want a VPC for GetJobStatusLambdaFunction. We are controlling access to the lambda using IAM roles"}, {"id":"W92","reason":"We do not want to define ReservedConcurrentExecutions since we want to allow this function to scale up"}]}}' '.Resources.GetJobStatusLambdaFunction = .Resources.GetJobStatusLambdaFunction + {Metadata: $metadata}' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

# UpdateStatusLambdaFunction Nag exceptions
cat $TEMPLATE_PATH | jq --argjson metadata '{"cfn_nag":{"rules_to_suppress":[{"id":"W89","reason":"We do not want a VPC for UpdateStatusLambdaFunction. We are controlling access to the lambda using IAM roles"}, {"id":"W92","reason":"We do not want to define ReservedConcurrentExecutions since we want to allow this function to scale up"}]}}' '.Resources.UpdateStatusLambdaFunction = .Resources.UpdateStatusLambdaFunction + {Metadata: $metadata}' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

# UploadGlueScriptsLambdaFunction Nag exceptions
cat $TEMPLATE_PATH | jq --argjson metadata '{"cfn_nag":{"rules_to_suppress":[{"id":"W89","reason":"We do not want a VPC for UploadGlueScriptsLambdaFunction. We are controlling access to the lambda using IAM roles"}, {"id":"W92","reason":"We do not want to define ReservedConcurrentExecutions since we want to allow this function to scale up"}]}}' '.Resources.UploadGlueScriptsLambdaFunction = .Resources.UploadGlueScriptsLambdaFunction + {Metadata: $metadata}' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

# CustomDashresourceDashapigwDashcwDashroleLambdaFunction requires permission to write CloudWatch Logs
NEW_POLICY_DOCUMENT=$(cat $TEMPLATE_PATH | jq '.Resources.IamRoleCustomResourcesLambdaExecution.Properties.Policies[0].PolicyDocument | .Statement[.Statement | length] |= . + {"Effect":"Allow","Action":["logs:CreateLogStream","logs:CreateLogGroup","logs:PutLogEvents"],"Resource":{"Fn::Sub":"arn:${AWS::Partition}:logs:*:*"}}')
cat $TEMPLATE_PATH | jq --argjson new "$NEW_POLICY_DOCUMENT" '.Resources.IamRoleCustomResourcesLambdaExecution.Properties.Policies[0].PolicyDocument = $new' > $TEMPLATE_PATH.tmp
mv $TEMPLATE_PATH.tmp $TEMPLATE_PATH

echo Modification complete, restructuring assets
mv $TEMPLATE_PATH $GLOBAL_DIR/$SOLUTION_NAME.template
mv $SERVERLESS_OUTPUT_PATH/fhir-service.zip $REGIONAL_DIR
mv $SERVERLESS_OUTPUT_PATH/custom-resources.zip $REGIONAL_DIR
rm -rf SERVERLESS_OUTPUT_PATH

cd $SOURCE_DIR # So cleanup can finish
echo Finished at: $(date)
