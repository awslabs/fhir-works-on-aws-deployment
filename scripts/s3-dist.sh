#!/bin/bash -e

#
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
#
# This script should be run from the repo's root directory (same directory as serverless.yaml)
# cd fhir-works-on-aws-deployment
# chmod +x ./scripts/s3-dist.sh && ./scripts/s3-dist.sh <BUCKET_NAME> <BUCKET_REGION>

# Package output directory is assumed to be default (.serverless). Passing -p flag to `sls package` can break this script.
# Dependencies: npm, aws CLI (configured), sed, jq
if [ -z "$1" ] || [ -z "$2" ]; then
    echo Please provide both the prefix and region for the bucket
    echo For example: "$0" solutions us-east-1
    exit 1
fi

# Bucket name is assumed to be $BUCKET_PREFIX-$BUCKET_REGION (e.g. solutions-us-east-1)
BUCKET_PREFIX=$1
BUCKET_REGION=$2

function cleanup(){
    echo Removing deploymentBucket from serverless.yaml
    sed -i -e '20d' serverless.yaml
}

echo Installing dependencies
npm install -g serverless && npm install

echo Using region: "$BUCKET_REGION"
echo Adding provider.deploymentBucket to serverless.yaml
sed -i '19 a \ \ deploymentBucket: '"$BUCKET_PREFIX"'-'"$BUCKET_REGION"'' serverless.yaml
trap cleanup EXIT

sls package --region "$BUCKET_REGION"
echo Package completed, modifying template, and uploading Lambda code and template
BASE_LAMBDA_CODE_KEY_PATH=$(cat .serverless/cloudformation-template-update-stack.json | jq -r '.Resources.FhirServerLambdaFunction.Properties.Code.S3Key')
CUSTOM_RESOURCE_LAMBDA_CODE_KEY_PATH=$(cat .serverless/cloudformation-template-update-stack.json | jq -r '.Resources.CustomDashresourceDashapigwDashcwDashroleLambdaFunction.Properties.Code.S3Key')
aws s3 cp .serverless/custom-resources.zip s3://$BUCKET_PREFIX-$BUCKET_REGION/$CUSTOM_RESOURCE_LAMBDA_CODE_KEY_PATH
aws s3 cp .serverless/fhir-service.zip s3://"$BUCKET_PREFIX"-"$BUCKET_REGION"/"$BASE_LAMBDA_CODE_KEY_PATH"
aws s3 cp .serverless/cloudformation-template-update-stack.json s3://"$BUCKET_PREFIX"-"$BUCKET_REGION"/