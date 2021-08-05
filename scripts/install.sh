#!/bin/bash

#
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
#

#Usage: ./install.sh <OPTIONAL PARAMETERS>

#Bugs:
#   -What if someone doesn't have AWS CLI installed?
#   -What if nothing is entered in aws configure?

##Usage information
function usage(){
    echo ""
    echo "Usage: $0 [optional arguments]"
    echo ""
    echo "Optional Parameters:"
    echo ""
    echo "    --stage (-s): Set stage for deploying AWS services (Default: 'dev')"
    echo "    --region (-r): Set region for deploying AWS services (Default: 'us-west-2')"
    echo "    --help (-h): Displays this message"
    echo ""
    echo ""
}

function YesOrNo() {
        while :
        do
                read -p "$1 (yes/no): " answer
                case "${answer}" in
                    [yY]|[yY][eE][sS]) exit 0 ;;
                        [nN]|[nN][oO]) exit 1 ;;
                esac
        done
}

function install_dependencies(){
    #Dependencies:
        #   nodejs  ->  npm   -> serverless
        #           ->  yarn
        #   python3 ->  boto3

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        #Identify Linux distribution
        PKG_MANAGER=$( command -v yum || command -v apt-get )
        basepkg=`basename $PKG_MANAGER`

        # Identify kernel release
        KERNEL_RELEASE=$(uname -r)
        #Update package manager
        sudo $PKG_MANAGER update
        sudo $PKG_MANAGER upgrade

        #Yarn depends on node version >= 12.0.0
        if [ "$basepkg" == "apt-get" ]; then
            curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
            sudo apt-get install nodejs -y
        elif [ "$basepkg" == "yum" ]; then
            if [[ $KERNEL_RELEASE =~ amzn2.x86_64 ]]; then
                curl -sL https://rpm.nodesource.com/setup_12.x | bash -
                yum install nodejs -y
            else
                yum install nodejs12 -y
            fi
        fi

        type -a npm || sudo $PKG_MANAGER install npm -y

        type -a python3 || sudo $PKG_MANAGER install python3 -y
        type -a pip3 || sudo $PKG_MANAGER install python3-pip -y
        sudo pip3 install boto3

        type -a yarn 2>&1 >/dev/null
        if [ $? -ne 0 ]; then
            sudo npm install --global yarn@1.22.5
        fi

        sudo $PKG_MANAGER upgrade -y

    elif [[ "$OSTYPE" == "darwin"* ]]; then
        #sudo -u $SUDO_USER removes brew's error message that brew should not be run as 'sudo'
        type -a brew 2>&1 || { error_msg="ERROR: brew is required to install packages."; return 1; }
        sudo -u $SUDO_USER brew install node@12
        sudo -u $SUDO_USER brew install python3
        sudo npm install --global yarn@1.22.5
        sudo pip3 install boto3
    else
        error_msg="ERROR: this install script is only supported on Linux or macOS."
        return 1
    fi

    echo "" >&2

    type -a node 2>&1 || { error_msg="ERROR: package 'nodejs' failed to install."; return 1; }
    type -a npm 2>&1 || { error_msg="ERROR: package 'npm' failed to install."; return 1; }
    type -a python3 2>&1 || { error_msg="ERROR: package 'python3' failed to install."; return 1; }
    type -a pip3 2>&1 || { error_msg="ERROR: package 'python3-pip' failed to install."; return 1; }
    type -a yarn 2>&1 || { error_msg="ERROR: package 'yarn' failed to install."; return 1; }

    return 0
}

#Function to parse log files
##Usage: eval $(parse_log <FILE_PATH> <PREFIX>)
##Output: adds variables from log file to namespace of script
##          variable names are prefixed with <PREFIX>, if supplied
##          sublists are marked with _
##
##Example:
##          testLevel1:
##              testLevel2: 3
##
##Example Output:
##          testLeve1_testLevel2=3
##
function parse_log() {
   local prefix=$2
   local s='[[:space:]]*' w='[a-zA-Z0-9_]*' fs=$(echo @|tr @ '\034')
   sed -ne "s|^\($s\):|\1|" \
        -e "s|^\($s\)\($w\)$s:$s[\"']\(.*\)[\"']$s\$|\1$fs\2$fs\3|p" \
        -e "s|^\($s\)\($w\)$s:$s\(.*\)$s\$|\1$fs\2$fs\3|p"  $1 |
   awk -F$fs '{
      indent = length($1)/2;
      vname[indent] = $2;
      for (i in vname) {if (i > indent) {delete vname[i]}}
      if (length($3) > 0) {
         vn=""; for (i=0; i<indent; i++) {vn=(vn)(vname[i])("_")}
         printf("%s%s%s=\"%s\"\n", "'$prefix'",vn, $2, $3);
      }
   }'
}

function get_valid_pass(){
    matched=0
    while true; do
        if [ $matched == 1 ]; then
            echo -e "\nERROR: Passwords did not match. Please try again.\n" >&2
            matched=0
        fi
        read -s -p "Enter password: " s1
        if ! [[ ${#s1} -ge 8 && \
                ${#s1} -le 20 && \
                "$s1" == *[A-Z]* && \
                "$s1" == *[a-z]* && \
                "$s1" == *[0-9]* && \
                "$s1" == *['!'@#\$%^\&*\(\)_+""-\]\[]* ]]; then
            echo -e "\nERROR: Invalid password. Password must satisfy the following requirements: " >&2
            echo "  * 8-20 characters long" >&2
            echo "  * at least 1 lowercase character" >&2
            echo "  * at least 1 uppercase character" >&2
            echo "  * at least 1 special character (Any of the following: '!@#$%^\&*()[]_+-\")" >&2
            echo "  * at least 1 number character" >&2
            echo "" >&2
        else
            echo "" >&2
            read -s -p "Please confirm your password: " s2
            if [ "$s2" != "$s1" ]; then
                matched=1
            else
                break
            fi
        fi
    done

    echo "$s1"
}

#Change directory to that of the script (in case someone calls it from another folder)
cd "${0%/*}"
# Save parent directory
export PACKAGE_ROOT=${PWD%/*}

if [ "$DOCKER" != "true" -a "$EUID" -ne 0 ]
then
    echo "Error: installation requires elevated permissions. Please run as root using the 'sudo' command." >&2
    exit 1
fi

#Default values
stage="dev"
region="us-west-2"

#Parse commandline args
while [ "$1" != "" ]; do
    case $1 in
        -s | --stage )      shift
                            stage=$1
                            ;;
        -r | --region )     shift
                            region=$1
                            ;;
        -h | --help )       usage
                            exit
                            ;;
        * )                 usage
                            exit 1
    esac
    shift
done

clear

command -v aws >/dev/null 2>&1 || { echo >&2 "AWS CLI cannot be found. Please install or check your PATH.  Aborting."; exit 1; }

if ! `aws sts get-caller-identity >/dev/null 2>&1`; then
    echo "Could not find any valid AWS credentials. You can configure credentials by running 'aws configure'. If running this script with sudo you must configure your awscli with 'sudo aws configure'"
    echo "For more information about configuring the AWS CLI see: https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html"
    echo ""
    exit 1;
fi

echo -e "\nFound AWS credentials for the following User/Role:\n"
aws sts get-caller-identity
echo -e "\n"

if ! `YesOrNo "Is this the correct User/Role for this deployment?"`; then
  exit 1
fi

#Check to make sure the server isn't already deployed
already_deployed=false
redep=`aws cloudformation describe-stacks --stack-name fhir-service-$stage --region $region --output text 2>&1` && already_deployed=true
if $already_deployed; then
    if `echo "$redep" | grep -Fxq "DELETE_FAILED"`; then
        fail=true
        echo "ERROR: FHIR Server already exists, but it seems to be corrupted."
        echo -e "Would you like to redeploy the FHIR Server?\n"
    else
        fail=false
        echo "FHIR Server already exists!"
        echo -e "Would you like to remove the current server and redeploy?\n"
    fi

    if `YesOrNo "Do you want to continue with redeployment?"`; then
        echo -e "\nOkay, let's redeploy the server.\n"
    else
        if ! $fail; then
            eval $( parse_log Info_Output.log )
            echo -e "\n\nSetup completed successfully."
            echo -e "You can now access the FHIR APIs directly or through a service like POSTMAN.\n\n"
            echo "For more information on setting up POSTMAN, please see the README file."
            echo -e "All user details were stored in 'Info_Output.log'.\n"
            echo -e "You can obtain new Cognito authorization tokens by using the init-auth.py script.\n"
            echo "Syntax: "
            echo "AWS_ACCESS_KEY_ID=<ACCESS_KEY> AWS_SECRET_ACCESS_KEY=<SECRET-KEY> python3 scripts/init-auth.py <USER_POOL_APP_CLIENT_ID> <REGION>"
            echo -e "\n\n"
            echo "For the current User:"
            echo "python3 scripts/init-auth.py $UserPoolAppClientId $region"
            echo -e "\n"
        fi
        exit 1
    fi
fi

echo -e "Setup will proceed with the following parameters: \n"
echo "  Stage: $stage"
echo "  Region: $region"
echo ""
if ! `YesOrNo "Are these settings correct?"`; then
    echo ""
    usage
    exit 1
fi

if [ "$DOCKER" != "true" ]; then
    echo -e "\nIn order to deploy the server, the following dependencies are required:"
    echo -e "\t- nodejs\n\t- npm\n\t- python3\n\t- yarn"
    echo -e "\nThese dependencies will be installed (if not already present)."
    if ! `YesOrNo "Would you like to continue?"`; then
        echo "Exiting..."
        exit 1
    fi

    echo -e "\nInstalling dependencies...\n"
    install_dependencies
    result=$?
    if [ "$result" != "0" ]; then
        echo ${error_msg}
        exit 1
    fi
    echo "Done!"
fi

IAMUserARN=$(aws sts get-caller-identity --query "Arn" --output text)

#TODO: how to stop if not all test cases passed?
cd ${PACKAGE_ROOT}
yarn install --frozen-lockfile
yarn run release

touch serverless_config.json
if ! grep -Fq "devAwsUserAccountArn" serverless_config.json; then
    echo -e "{\n  \"devAwsUserAccountArn\": \"$IAMUserARN\"\n}" >> serverless_config.json
fi

echo -e "\n\nFHIR Works is deploying. A fresh install will take ~20 mins\n\n"
## Deploy to stated region
yarn run serverless deploy --region $region --stage $stage || { echo >&2 "Failed to deploy serverless application."; exit 1; }

## Output to console and to file Info_Output.log.  tee not used as it removes the output highlighting.
echo -e "Deployed Successfully.\n"
touch Info_Output.log
SLS_DEPRECATION_DISABLE=* yarn run serverless info --verbose --region $region --stage $stage && SLS_DEPRECATION_DISABLE=* yarn run serverless info --verbose --region $region --stage $stage > Info_Output.log
#The double call to serverless info was a bugfix from Steven Johnston
    #(may not be needed)

#Read in variables from Info_Output.log
eval $( parse_log Info_Output.log )


## Cognito Init
cd ${PACKAGE_ROOT}/scripts
echo "Setting up AWS Cognito with default user credentials to support authentication in the future..."
echo "This will output a token that you can use to access the FHIR API."
echo "(You can generate a new token at any time after setup using the included init-auth.py script)"
echo -e "\nACCESS TOKEN:"
echo -e "\n***\n"
python3 provision-user.py "$UserPoolId" "$UserPoolAppClientId" "$region" >/dev/null 2>&1 ||
    echo -e "Warning: Cognito has already been initialized.\nIf you need to generate a new token, please use the init-auth.py script.\nContinuing..."
echo -e "\n***\n\n"

# #Set up Cognito user for Kibana server (only created if stage is dev)
if [ $stage == 'dev' ]; then
    echo "In order to be able to access the Kibana server for your ElasticSearch Service Instance, you need create a cognito user."
    echo -e "You can set up a cognito user automatically through this install script, \nor you can do it manually via the Cognito console.\n"
    while `YesOrNo "Do you want to set up a cognito user now?"`; do
        echo ""
        echo "Okay, we'll need to create a cognito user using an email address and password."
        echo ""
        read -p "Enter your email address (<youremail@address.com>): " cognitoUsername
        echo -e "\n"
        if `YesOrNo "Is $cognitoUsername your correct email?"`; then
            echo -e "\n\nPlease create a temporary password. Passwords must satisfy the following requirements: "
            echo "  * 8-20 characters long"
            echo "  * at least 1 lowercase character"
            echo "  * at least 1 uppercase character"
            echo "  * at least 1 special character (Any of the following: '!@#$%^\&*()[]_+-\")"
            echo "  * at least 1 number character"
            echo ""
            temp_cognito_p=`get_valid_pass`
            echo ""
            aws cognito-idp sign-up \
              --region "$region" \
              --client-id "$ElasticSearchKibanaUserPoolAppClientId" \
              --username "$cognitoUsername" \
              --password "$temp_cognito_p" \
              --user-attributes Name="email",Value="$cognitoUsername" &&
            echo -e "\nSuccess: Created a cognito user.\n\n \
                    You can now log into the Kibana server using the email address you provided (username) and your temporary password.\n \
                    You may have to verify your email address before logging in.\n \
                    The URL for the Kibana server can be found in ./Info_Output.log in the 'ElasticSearchDomainKibanaEndpoint' entry.\n\n \
                    This URL will also be copied below:\n \
                    $ElasticSearchDomainKibanaEndpoint"
            break
        else
            echo -e "\nSorry about that--let's start over.\n"
        fi
    done
fi
cd ${PACKAGE_ROOT}
##Cloudwatch audit log mover

echo -e "\n\nAudit Logs are placed into CloudWatch Logs at <CLOUDWATCH_EXECUTION_LOG_GROUP>. \
The Audit Logs includes information about request/responses coming to/from your API Gateway. \
It also includes the Cognito user that made the request."

echo -e "\nYou can also set up the server to archive logs older than 7 days into S3 and delete those logs from Cloudwatch Logs."
echo "You can also do this later manually, if you would prefer."
echo ""
if `YesOrNo "Would you like to set the server to archive logs older than 7 days?"`; then
    cd ${PACKAGE_ROOT}/auditLogMover
    yarn install --frozen-lockfile
    yarn run serverless deploy --region $region --stage $stage
    cd ${PACKAGE_ROOT}
    echo -e "\n\nSuccess."
fi


#DynamoDB Table Backups
echo -e "\n\nWould you like to set up daily DynamoDB Table backups?\n"
echo "Selecting 'yes' below will set up backups using the default setup from the cloudformation/backups.yaml file."
echo -e "DynamoDB Table backups can also be set up later. See the README file for more information.\n"
echo "Note: This will deploy an additional stack, and can lead to increased costs to run this server."
echo ""
if `YesOrNo "Would you like to set up backups now?"`; then
    cd ${PACKAGE_ROOT}
    aws cloudformation create-stack --stack-name fhir-server-backups \
    --template-body file://cloudformation/backup.yaml \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $region
    echo "DynamoDB Table backups are being deployed. Please validate status of CloudFormation stack"
    echo "fhir-server-backups in ${region} region."
    echo "Backups are configured to be automatically performed at 5:00 UTC, if deployment succeeded."
fi


echo -e "\n\nSetup completed successfully."
echo -e "You can now access the FHIR APIs directly or through a service like POSTMAN.\n\n"
echo "For more information on setting up POSTMAN, please see the README file."
echo -e "All user details were stored in 'Info_Output.log'.\n"
echo -e "You can obtain new Cognito authorization tokens by using the init-auth.py script.\n"
echo "Syntax: "
echo "python3 scripts/init-auth.py <USER_POOL_APP_CLIENT_ID> <REGION>"
echo -e "\n\n"
echo "For the current User:"
echo "python3 scripts/init-auth.py $UserPoolAppClientId $region"
echo -e "\n"
