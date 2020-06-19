#!/bin/bash
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

function install_dependencies(){
    #Dependencies:
        #   nodejs  ->  npm   -> serverless
        #           ->  yarn
        #   python3 ->  boto3

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        #Identify Linux distribution
        PKG_MANAGER=$( command -v yum || command -v apt-get )
        basepkg=`basename $PKG_MANAGER`

        #Update package manager
        sudo $PKG_MANAGER update
        sudo $PKG_MANAGER upgrade

        #Yarn depends on node version >= 12.0.0
        if [ "$basepkg" == "apt-get" ]; then
            curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
            sudo apt-get install nodejs -y
        elif [ "$PKG_MANAGER" == "yum" ]; then
            yum install nodejs12 -y
        fi

        type -a npm || sudo $PKG_MANAGER install npm -y
        type -a serverless || sudo npm install -g serverless </dev/null #without manipulating the stdin, it breaks everything

        type -a python3 || sudo $PKG_MANAGER install python3 -y
        type -a pip3 || sudo $PKG_MANAGER install python3-pip -y
        sudo pip3 install boto3
        
        type -a yarn 2>&1 >/dev/null
        if [ $? -ne 0 ]; then 
            if [ "$basepkg" == "apt-get" ]; then
                #This is a weird bug on Ubuntu, 'cmdtest' and 'yarn' have the same alias, so it always installs the wrong package
                sudo apt-get remove cmdtest
                sudo apt-get remove yarn
                curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
                echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
            elif [ "$PKG_MANAGER" == "yum" ]; then 
                curl --silent --location https://dl.yarnpkg.com/rpm/yarn.repo | sudo tee /etc/yum.repos.d/yarn.repo
            fi
            sudo $PKG_MANAGER update
            sudo $PKG_MANAGER install yarn -y
        fi
        
        sudo $PKG_MANAGER upgrade -y

    elif [[ "$OSTYPE" == "darwin"* ]]; then
        #sudo -u $SUDO_USER removes brew's error message that brew should not be run as 'sudo'
        type -a brew 2>&1 || ( echo "ERROR: brew is required to install packages." >&2 && return 1 )
        sudo -u $SUDO_USER brew install node
        sudo -u $SUDO_USER brew install python
        sudo -u $SUDO_USER brew install yarn
        sudo pip3 install boto3
        sudo npm install -g serverless
    else
        echo "ERROR: this install script is only supported on Linux or OSX."
        return 1
    fi

    echo "" >&2

    type -a node 2>&1 || ( echo "ERROR: package 'nodejs' failed to install." >&2 && return 1 )
    type -a npm 2>&1 || ( echo "ERROR: package 'npm' failed to install." >&2 && return 1 )
    type -a python3 2>&1 || ( echo "ERROR: package 'python3' failed to install." >&2 && return 1 )
    type -a pip3 2>&1 || ( echo "ERROR: package 'python3-pip' failed to install." >&2 && return 1 )
    type -a yarn 2>&1 || ( echo "ERROR: package 'yarn' failed to install." >&2 && return 1 )
    type -a serverless 2>&1 || ( echo "ERROR: package 'serverless' failed to install." >&2 && return 1 )

    return 0
}

#Function to parse YAML files
##Usage: eval $(parse_yaml <FILE_PATH> <PREFIX>)
##Output: adds variables from YAML file to namespace of script
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
function parse_yaml {
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
        read -p "Enter password: " s1
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
            read -p "Please confirm your password: " s2
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

if [ "$EUID" -ne 0 ]
    then echo "Error: installation requires elevated permissions. Please run as root using the 'sudo' command." >&2
    exit 1
fi

#These lines may not be needed
clear
echo "First we need make sure your AWS account is set up."
echo "We'll ask for your Access Key, Secret Key, Region, and preferred output format."
echo ""
echo "If you've already set up your AWS account, your Access and Secret Key can be found in ~/.aws/credentials"
echo "If you haven't, you'll need to set up your AWS account and obtain an access and secret key from the AWS console."
echo ""
echo "Enter your region for the Region prompt. If you're not sure, you can use 'us-west-2'. A full listing of regions is available online."
echo ""
echo "The 'preferred output format' entry can be left blank."
echo ""
echo -e "Enter your credentials below:\n"
aws configure 

echo -e "\nConfirming your credentials are valid..."
if ! `aws sts get-caller-identity >/dev/null`; then
    echo "ERROR: Credentials are invalid. Please double-check you have entered the correct credentials."
    exit 1
fi
echo -e "\nSuccess!\n\n"

#Check to make sure the server isn't already deployed
already_deployed=false
redep=`aws cloudformation describe-stacks --stack-name fhir-service-dev --output text 2>&1` && already_deployed=true
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
    select yn in "Yes" "No"; do
        case $yn in
            Yes )   echo -e "\nOkay, let's redeploy the server.\n";
                    break;;
            No )    if ! $fail; then
                                eval $( parse_yaml Info_Output.yml )
                                echo -e "\n\nSetup completed successfully."
                                echo -e "You can now access the FHIR APIs directly or through a service like POSTMAN.\n\n"
                                echo "For more information on setting up POSTMAN, please see the README file."
                                echo -e "All user details were stored in 'Info_Output.yml'.\n"
                                echo -e "You can obtain new Cognito authorization tokens by using the init-auth.py script.\n"
                                echo "Syntax: "
                                echo "AWS_ACCESS_KEY_ID=<ACCESS_KEY> AWS_SECRET_ACCESS_KEY=<SECRET-KEY> python3 init-auth.py <USER_POOL_APP_CLIENT_ID> <REGION>"
                                echo -e "\n\n"
                                echo "For the current User:"
                                echo "AWS_ACCESS_KEY_ID=$AccessKey AWS_SECRET_ACCESS_KEY=$SecretKey python3 init-auth.py $UserPoolAppClientId $Region"
                                echo -e "\n"
                    fi
                    exit 1;;
        esac
    done
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

echo -e "Setup will proceed with the following parameters: \n"
echo "  Stage: $stage"
echo "  Region: $region"
echo -e "\nAre these settings correct?\n"
select yn in "Yes" "No"; do
    case $yn in
        Yes )   break;;
        No )    echo "";
                usage;
                exit 1;;
    esac
done

echo -e "\nIn order to deploy the server, the following dependencies are required:"
echo -e "\t- nodejs\n\t- npm\n\t- python3\n\t- yarn\n\t- serverless"
echo -e "\nThese dependencies will be installed (if not already present).\nWould you like to continue?"
select yn in "Yes" "No"; do
    case $yn in
        Yes )   break;;
        No )    echo "Exiting...";
                exit 1;;
    esac
done
echo -e "\nInstalling dependencies...\n"
install_dependencies
result=$?
if [ "$result" != "0" ]; then
    echo "Error: Please use the correct script for Windows installation."
    exit 1
fi
echo "Done!"


#set up IAM user
if `aws cloudformation describe-stacks --stack-name FHIR-IAM --output text >/dev/null 2>&1`; then
    #stack already exists--check if the created user has the correct policy

    #Possible error: what if a stack "FHIR-IAM" already exists, but no IAM user was created?
    #$uname assignment fails, but script will try to attach a policy to the IAM user

    #Other possible error: user does not have permission to get info on IAM role (happens on a C9 instance)
    uname=`aws cloudformation describe-stacks --stack-name FHIR-IAM --query "Stacks[0].Outputs[?OutputKey=='IAMUserARN'].OutputValue" --output text | cut -d"/" -f2`
    if ! `aws iam get-user-policy --user-name "$uname" --policy-name FHIR_policy --output text >/dev/null 2>&1`; then
        echo "Error: FHIR-IAM user has already been setup, but lacks the correct policy."
        echo "Attaching policy now."
        aws iam put-user-policy --user-name "$uname" --policy-name FHIR_policy --policy-document file://iam_policy.json
    else
        echo "'FHIR-IAM' Stack already created successfully--proceeding without creating a new IAM user."
    fi
else
    echo -e "\n\nWe'll need to set up an IAM user to access the FHIR server with. You'll need to create a password."
    echo -e "\n\nEnter IAM User Password\n[Note. Password must be 8-20 Characters and have at least 1 of EACH of the following: Lowercase Character, Uppercase Character, Special Character and Number]:-"
    IAMUserPW=$(get_valid_pass)

    echo -e "\nCreating IAM User with username 'FHIRUser' and provided password..."
    ##  Run stack that includes IAM User and in-line Policy
    aws cloudformation create-stack --stack-name FHIR-IAM --template-body "file://CF-IAMUser.yaml" --parameters "ParameterKey=Password,ParameterValue=$IAMUserPW" --capabilities CAPABILITY_NAMED_IAM

    echo "Waiting for IAM User creation to complete..."
    ##  Wait for Stack Completion
    aws cloudformation wait stack-create-complete --stack-name FHIR-IAM
    echo "Complete!"
fi


##  Get Stack Outputs for AccessKey, SecretKey and IAMUserARN
#   It might be worth looking into a more robust way to do this
echo -e "\n\nGetting required information from created IAM user..."
keys=($(aws cloudformation describe-stacks --stack-name FHIR-IAM --query "Stacks[0].Outputs[].OutputValue" --output text))
IAMUserARN=${keys[0]}
SecretKey=${keys[1]}
Region=${keys[2]}
AccessKey=${keys[3]}


# Add above to credentials (if it's not already there)
if ! grep -Fxq "[FHIR-Solution]" ~/.aws/credentials; then
    echo -e "\n\n**WARNING: This script will modify your .aws/credentials file.**\n"
    echo "Your previous credentials file will be copied to ~/.aws/credentials.old"
    ## Copy old credentials file for backup
    cp ~/.aws/credentials ~/.aws/credentials.old
    echo -e "\n[FHIR-Solution]\naws_access_key_id=$AccessKey\naws_secret_access_key=$SecretKey\nregion=$Region" >> ~/.aws/credentials
fi


#TODO: how to stop if not all test cases passed?
cd ..
yarn install
yarn run release

touch serverless_config.json
if ! grep -Fq "devAwsUserAccountArn" serverless_config.json; then
    echo -e "{\n  \"devAwsUserAccountArn\": \"$IAMUserARN\"\n}" >> serverless_config.json
fi

echo -e "\n\nDeploying FHIR Server\n\n" 
## Deploy using profile and to stated region
serverless deploy --aws-profile FHIR-Solution --region $Region

## Output to console and to file Info_Output.yml.  tee not used as it removes the output highlighting.
echo -e "Deployed Successfully.\n"
touch Info_Output.yml
serverless info --verbose --aws-profile FHIR-Solution --region $Region && serverless info --verbose --aws-profile FHIR-Solution --region $Region > Info_Output.yml
#The double call to serverless info was a bugfix from Steven Johnston
    #(may not be needed)

#Read in variables from Info_Output.yml
eval $( parse_yaml Info_Output.yml )


## Cognito Init
cd scripts
echo "Setting up AWS Cognito with default user credentials to support authentication in the future..."
echo "This will output a token that you can use to access the FHIR API."
echo "(You can generate a new token at any time after setup using the included init-auth.py script)"
echo -e "\nACCESS TOKEN:"
echo -e "\n***\n"
AWS_ACCESS_KEY_ID=$AccessKey AWS_SECRET_ACCESS_KEY=$SecretKey python3 provision-user.py "$UserPoolId" "$UserPoolAppClientId" "$Region" >/dev/null 2>&1 ||
    echo -e "Warning: Cognito has already been initialized.\nIf you need to generate a new token, please use the init-auth.py script.\nContinuing..."
echo -e "\n***\n\n"


# #Set up Cognito user for Kibana server (only created if stage is dev)
if [ $stage == 'dev' ]; then
    echo "In order to be able to access the Kibana server for your ElasticSearch Service Instance, you need create a cognito user."
    echo -e "You can set up a cognito user automatically through this install script, \nor you can do it manually via the Cognito console.\n"
    echo -e "Do you want to set up a cognito user now?\n"
    select yn in "Yes" "No"; do
        case $yn in
            Yes )   resp=true;
                    break;;
            No )    resp=false;
                    break;;
        esac
    done
    while $resp; do
        echo ""
        echo "Okay, we'll need to create a cognito user using an email address and password."
        echo ""
        read -p "Enter your email address (<youremail@address.com>): " cognitoUsername
        echo -e "\n\nIs $cognitoUsername your correct email?\n"
        select yn in "Yes" "No"; do
            case $yn in
                Yes )   check=true;
                        break;;
                No )    check=false;
                        break;;
            esac
        done

        if $check; then
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
              --client-id "$UserPoolAppClientId" \
              --username "$cognitoUsername" \
              --password "$temp_cognito_p" \
              --user-attributes Name="email",Value="$cognitoUsername" &&
            echo -e "\nSuccess: Created a cognito user.\n\n \
                    You can now log into the Kibana server using the email address you provided (username) and your temporary password.\n \
                    You may have to verify your email address before logging in.\n \
                    The URL for the Kibana server can be found in ./Info_Output.yml in the 'ElasticSearchDomainKibanaEndpoint' entry.\n\n \
                    This URL will also be copied below:\n \
                    $ElasticSearchDomainKibanaEndpoint"
            break

        else
            echo -e "\nSorry about that--let's start over.\n"
            echo "Do you want to set up a cognito user now?"
            select yn in "Yes" "No"; do
                case $yn in
                    Yes )   resp=true;
                            break;;
                    No )    resp=false;
                            break;;
                esac
            done
        fi
    done
fi

#DynamoDB Table Backups
echo -e "\n\nWould you like to set up daily DynamoDB Table backups?\n"
echo "Selecting 'yes' below will set up backups using the default setup from the cloudformation/backups.yaml file."
echo -e "DynamoDB Table backups can also be set up later. See the README file for more information.\n"
echo "Note: This will deploy an additional stack, and can lead to increased costs to run this server."
echo ""
echo -e "Would you like to set up backups now?\n"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) cd ..;
              aws cloudformation create-stack --stack-name fhir-server-backups \
              --template-body file://cloudformation/backup.yaml \
              --capabilities CAPABILITY_NAMED_IAM \
              --profile FHIR-Solution || break
              echo "DynamoDB Table backups were set up successfully."
              echo "Backups are automatically performed at 5:00 UTC."
              break;;
        No )  break;;
    esac
done


echo -e "\n\nSetup completed successfully."
echo -e "You can now access the FHIR APIs directly or through a service like POSTMAN.\n\n"
echo "For more information on setting up POSTMAN, please see the README file."
echo -e "All user details were stored in 'Info_Output.yml'.\n"
echo -e "You can obtain new Cognito authorization tokens by using the init-auth.py script.\n"
echo "Syntax: "
echo "AWS_ACCESS_KEY_ID=<ACCESS_KEY> AWS_SECRET_ACCESS_KEY=<SECRET-KEY> python3 init-auth.py <USER_POOL_APP_CLIENT_ID> <REGION>"
echo -e "\n\n"
echo "For the current User:"
echo "AWS_ACCESS_KEY_ID=$AccessKey AWS_SECRET_ACCESS_KEY=$SecretKey python3 init-auth.py $UserPoolAppClientId $Region"
echo -e "\n"

