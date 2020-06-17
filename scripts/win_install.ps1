#This script needs to be run from Windows Powershell for AWS

#all functions working--just need to test!
#TODO: Environment variables? Is there a workaround?
param (
    [string]$region = "us-west-2",
    [string]$stage = "dev",
    [switch]$help = $false
 )

##Usage information
function Usage {
    Write-Host ""
    Write-Host "Usage: $0 [optional arguments]"
    Write-Host ""
    Write-Host "Optional Parameters:`n"
    Write-Host "    -stage: Set stage for deploying AWS services (Default: 'dev')"
    Write-Host "    -region: Set region for deploying AWS services (Default: 'us-west-2')"
    Write-Host "    -help: Displays this message`n`n"
}

#Refreshes powershell environment without needing to reopen powershell
function Refresh-Environment {
    foreach($level in "Machine","User") {
       [Environment]::GetEnvironmentVariables($level).GetEnumerator() | % {
          # For Path variables, append the new values, if they're not already in there
          if($_.Name -match 'Path$') { 
             $_.Value = ($((Get-Content "Env:$($_.Name)") + ";$($_.Value)") -split ';' | Select -unique) -join ';'
          }
          $_
       } | Set-Content -Path { "Env:$($_.Name)" }
    }
}

function Install-Dependencies {
    #Dependencies:
        #   nodejs  ->  npm   -> serverless
        #           ->  yarn
        #   python3 ->  boto3
    if (-Not (Get-Command choco)){
        Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
    }
    choco install -y nodejs.install #also installs npm by default
    choco install -y python3
    choco install -y yarn
    choco install -y serverless

    #fix path issues
    $oldpath = (Get-ItemProperty -Path 'Registry::HKEY_LOCAL_MACHINE\System\CurrentControlSet\Control\Session Manager\Environment' -Name PATH).path
    $newpath = "$oldpath"
    if (-Not (Get-Command node)) {
        $newpath = "$newpath;C:\Program Files\nodejs"
    }
    if (-Not (Get-Command yarn)) { 
        $newpath = "$newpath;C:\Program Files (x86)\Yarn\bin"
    }
    if (-Not (Get-Command python)) { #this really should never happen
        $newpath = "$newpath;C:\Python38;C:\Python38\scripts" 
    }
    Set-ItemProperty -Path 'Registry::HKEY_LOCAL_MACHINE\System\CurrentControlSet\Control\Session Manager\Environment' -Name PATH -Value $newpath
    Refresh-Environment
    
    python -m pip install boto3
    Write-Host ""
    if (-Not (Get-Command node)) { Write-Host "ERROR: package 'nodejs' failed to install."; Exit }
    if (-Not (Get-Command python)) { Write-Host "ERROR: package 'python3' failed to install."; Exit }
    if (-Not (Get-Command yarn)) { Write-Host "ERROR: package 'yarn' failed to install."; Exit }
    if (-Not (Get-Command serverless)) { Write-Host "ERROR: package 'serverless' failed to install."; Exit }
    Write-Host "`n`nAll dependencies successfully installed!`n"
    return
}

#Function to get a value from YAML files
## Usage: GetFrom-Yaml "AttributeName"
##        GetFrom-Yaml "UserClientId"
## Output: value stored in YAML
## Note: This function only reads single lines of YAML files
function GetFrom-Yaml {
    Param($valName)
    gc Info_Output.yml | % { if($_ -match "^[`t` ]*$valName") {Return $_.split(": ")[-1]}}
}

#Get-ValidPass
function Get-ValidPass {
    $specialPattern = "[" + [regex]::Escape("~!@#$%^&()-.+=}{\/|;:<>?'*`"") + "]"

    $matched=$true
    for (;;) {
        #I broke this up into an if/elseif chain to give more detailed feedback to the user.
        #This could be condensed into a single large conditional check.
        if (-Not ($matched)) {
            Write-Host "`nERROR: Passwords did not match. Please try again.`n"
            $matched=$true           
        }
        $s1 = Read-Host "Enter Password: " 
        if  (($s1.length -lt 8) -Or ($s1.length -gt 20)){
            Write-Host "`n`n`n`n`n`n`n`n`n`n`n`n"
            Write-Host "`nERROR: Password does not meet required length (8-20 characters).`n`n"
        } elseif (-Not (($s1 -cmatch "[A-Z]") -And ($s1 -cmatch "[a-z]"))) {
            Write-Host "`n`n`n`n`n`n`n`n`n`n`n`n"
            Write-Host "`nERROR: Password must contain at least one uppercase and lowercase character.`n`n"
        } elseif (-Not ($s1 -match "\d")){
            Write-Host "`n`n`n`n`n`n`n`n`n`n`n`n"
            Write-Host "`nERROR: Password must contain at least one number.`n`n"
        } elseif (-Not ($s1 -match $specialPattern)){
            Write-Host "`n`n`n`n`n`n`n`n`n`n`n`n"
            Write-Host "`nERROR: Password must contain at least one special character.`nSpecial characters: ~!@#$%^&()-.+=}{\/|;:<>?'*`""
        } else {
            $s2 = Read-Host "Please confirm your password: "
            if (-Not ($s1 -eq $s2)){
                $matched=$false
                Continue
            } else {
                Break
            }
        }
        Write-Host "`nPassword must satisfy the following requirements: "
        Write-Host "  * 8-20 characters long"
        Write-Host "  * at least 1 lowercase character"
        Write-Host "  * at least 1 uppercase character"
        Write-Host "  * at least 1 special character (Any of the following: ~!@#$%^&()-.+=}{\/|;:<>?'*`")"
        Write-Host "  * at least 1 number character"
        Write-Host ""
    }

    Return $s1
}

#####################
## Start of Script ##
#####################
if ($help){
    Usage
    Exit
}

$options = '&Yes', '&No'
$default = 1  # 0=Yes, 1=No
#Change directory to that of the script (in case someone calls it from another folder)
cd "${0%/*}"

#These lines may not be needed
clear

if (-Not (Test-Path C:\Users\$Env:UserName\.aws)){
    mkdir C:\Users\$Env:UserName\.aws
}
fc >> C:\Users\$Env:UserName\.aws\credentials

$valid_AWS_profile = $false
Get-STSCallerIdentity
if ( $? ) { $valid_AWS_profile = $true }
else {
    Write-Host "`n`n**WARNING: This script may modify your .aws/credentials file.**`n"
    Write-Host "Your previous credentials file will be copied to ~/.aws/credentials.old"
    ## Copy old credentials file for backup
    Copy-Item C:\Users\$env:UserName\.aws\credentials C:\Users\$env:UserName\aws\credentials.old
}

while (-Not ($valid_AWS_profile)){
    Write-Host "Looks like your AWS Account hasn't been configured yet."
    Write-Host "`nLet's set up your default AWS Account."
    Write-Host "You'll need your AWS Access Key and AWS Secret Key."
    Write-Host "If you don't have these, you can obtain them at https://console.aws.amazon.com/iam/`n`n"
    $DEF_ACCESS_KEY = Read-Host "Enter your AWS Access Key "
    $DEF_SECRET_KEY = Read-Host "Enter your AWS Secret Access Key "
    $DEF_REGION = Read-Host "Enter your Region (ex. us-west-2)"
    Initialize-AWSDefaultConfiguration -AccessKey $DEF_ACCESS_KEY -SecretKey $DEF_SECRET_KEY -Region $DEF_REGION -ProfileLocation ~\.aws\credentials 
    Get-STSCallerIdentity
    if ( $? ) { $valid_AWS_profile = $true }
    else {
        rm C:\Users\$env:UserName\.aws\credentials
        fc >> mkdir C:\Users\$Env:UserName\.aws\credentials
        Write-Host "`n`nHm...Looks like those credentials aren't correct."
    }
}

Write-Host "AWS Credentials are configured. Installing FHIR Server..."
Write-Host "`n"

#Check to make sure the server isn't already deployed
$redep = (Get-CFNStack -StackName fhir-service-dev)
$already_deployed = $?

if ($already_deployed){

    if ( Write-Output "$redep" | Select-String "DELETE_FAILED" ){
        #This would happen if someone tried to delete the stack from the AWS Console
        #This leads to a situation where the stack is half-deleted, and needs to be removed with `serverless remove`
        $fail=$true
        $msg = "ERROR: FHIR Server already exists, but it seems to be corrupted.`nWould you like to remove the current installation and redeploy the FHIR Server?`n"

    } else {
        $fail=$false
        $msg = "Do you want to redeploy the server?"
    }

    do {
        $response = $Host.UI.PromptForChoice("FHIR Server Already Exists!", $msg, $options, $default)
        if ($response -eq 1) {
            Exit
        }
    } until ($response -eq 0)

    if ($fail) { serverless remove } 
}


Write-Host "Setup will proceed with the following parameters: `n"
Write-Host "  Stage: $stage"
Write-Host "  Region: $region`n`n"
do {
    $response = $Host.UI.PromptForChoice("", "Are these settings correct?", $options, $default)
    if ($response -eq 1) {
        Usage
        Exit
    }
} until ($response -eq 0)


Write-Host "`nInstalling dependencies...`n"
Install-Dependencies

#set up IAM user
$curuser = (Get-CFNStack -StackName FHIR-IAM)
if ( $? ){
    #stack already exists--check if the created user has the correct policy

    #Possible error: what if a stack "FHIR-IAM" already exists, but no IAM user was created?
    #$uname assignment fails, but script will try to attach a policy to the IAM user

    #Other possible error: user does not have permission to get info on IAM role (happens on a C9 instance)
    $uname = ( $curuser.Outputs[0].OutputValue.split("/")[1] )
    Get-IAMUserPolicy -PolicyName FHIR_policy -UserName $uname
    if (-Not ( $? )){ #it's backwards, but this is so the flow of win_install.ps1 is the same as the flow of install.sh
        Write-Host "Error: FHIR-IAM user has already been setup, but lacks the correct policy."
        Write-Host "Attaching policy now."
        Write-IAMUserPolicy -UserName $uname -PolicyName "FHIR_policy" -PolicyDocument (Get-Content -Raw iam_policy.json)
    } else {
        Write-Host "'FHIR-IAM' Stack already created successfully--proceeding without creating a new IAM user."
    }
} else {
    Write-Host "`n`nWe'll need to set up an IAM user to access the FHIR server with. You'll need to create a password."
    Write-Host "`n`nEnter IAM User Password`n[Note. Password must be 8-20 Characters and have at least 1 of EACH of the following: Lowercase Character, Uppercase Character, Special Character and Number]:-"
    $IAMUserPW=$(Get-ValidPass)

    Write-Host "`nCreating IAM User with username 'FHIRUser' and provided password..."
    ##  Run stack that includes IAM User and in-line Policy
    New-CFNStack -StackName FHIR-IAM -TemplateBody (Get-Content -Raw CF-IAMUser.yaml) -Parameter @{ ParameterKey="Password";ParameterValue="$IAMUserPW"} -Capability CAPABILITY_NAMED_IAM
    ##  Wait for Stack Completion
    Write-Host "Waiting for IAM User creation to complete..."
    Wait-CFNStack -StackName FHIR-IAM -Timeout 300 -Status CREATE_COMPLETE
    Write-Host "Complete!"
}
$curuser = (Get-CFNStack -StackName FHIR-IAM)

##  Get Stack Outputs for AccessKey, SecretKey and IAMUserARN
#   It might be worth looking into a more robust way to do this
Write-Host "`n`nGetting required information from created IAM user..."
$keys=$curuser.Outputs
$IAMUserARN=($keys[0].OutputValue)
$SecretKey=($keys[1].OutputValue)
$Region=($keys[2].OutputValue)
$AccessKey=($keys[3].OutputValue)

#For some reason this doesn't write the credentials to .aws/credentials
#not really a problem, since it can be pulled at any time from the stack
Set-AWSCredential -AccessKey $AccessKey -SecretKey $SecretKey -StoreAs FHIR-Solution
Set-AWSCredential -ProfileName FHIR-Solution

cd ..
yarn install
#yarn run release 
#eslint isnt working correctly on Windows. Currently investigating.
yarn run build
yarn run test


## Deploy using profile to stated region
fc >> serverless_config.json
$SEL = Select-String -Path serverless_config.json -Pattern "devAwsUserAccountArn"
if ($SEL -eq $null){
    Add-Content -Path serverless_config.json -Value "`n{`n  `"devAwsUserAccountArn`": `"$IAMUserARN`"`n}"
}

Write-Host "`n`nDeploying FHIR Server"
Write-Host "(This may take some time)`n`n" 
serverless deploy --region $Region

if (-Not ($?) ) {
    Write-Host "Setting up FHIR Server failed. Please try again later."
    Exit
}
Write-Host "Deployed Successfully.`n"

rm Info_Output.yml
fc >> Info_Output.yml
serverless info --verbose --region $Region | Out-File -FilePath .\Info_Output.yml

#Read in variables from Info_Output.yml
$UserPoolId = GetFrom-Yaml "UserPoolId"
$UserPoolAppClientId = GetFrom-Yaml "UserPoolAppClientId"
$Region = GetFrom-Yaml "Region"
$ElasticSearchDomainKibanaEndpoint = GetFrom-Yaml "ElasticSearchDomainKibanaEndpoint"

##Setting environemnt variables
[Environment]::SetEnvironmentVariable("AWS_ACCESS_KEY_ID", $AccessKey, "User")
[Environment]::SetEnvironmentVariable("AWS_SECRET_ACCESS_KEY", $SecretKey, "User")

#refresh environment variables without exiting script
Refresh-Environment

## Cognito Init
cd scripts
Write-Host "Setting up AWS Cognito with default user credentials to support authentication in the future..."
Write-Host "This will output a token that you can use to access the FHIR API."
Write-Host "(You can generate a new token at any time after setup using the included init-auth.py script)"
Write-Host "`nACCESS TOKEN:"
Write-Host "`n***`n"

#CHECK
python provision-user.py "$UserPoolId" "$UserPoolAppClientId" "$Region"
if (-Not ($?)){
    Write-Host "Warning: Cognito has already been initialized.`nIf you need to generate a new token, please use the init-auth.py script.`nContinuing..."
}
Write-Host "`n***`n`n"


# #Set up Cognito user for Kibana server
if ($stage -eq "dev"){
    Write-Host "In order to be able to access the Kibana server for your ElasticSearch Service Instance, you need create a cognito user."
    Write-Host "You can set up a cognito user automatically through this install script, `nor you can do it manually via the Cognito console.`n"
    for(;;) {
        $yn = $Host.UI.PromptForChoice("", "Do you want to set up a cognito user now?", $options, $default)
        if ($yn -eq 1) { #no
            $resp=$false
            Break
        } elseif ($yn -eq 0){ #yes
            $resp=$true
            Set-AWSCredential -ProfileName default
            Break
        }
    } 
    while ($resp){
        Write-Host ""
        Write-Host "Okay, we'll need to create a cognito user using an email address and password."
        Write-Host ""
        $cognitoUsername = Read-Host "Enter your email address (<youremail@address.com>): "
        
        for(;;) {
            $yn = $Host.UI.PromptForChoice("", "`n`nIs $cognitoUsername your correct email?`n", $options, $default)
            if ($yn -eq 1) { #no
                $check=$false
                Break
            } elseif ($yn -eq 0){ #yes
                $check=$true
                Break
            }
        }

        if ($check){
            Write-Host "`n`nPlease create a temporary password. Passwords must satisfy the following requirements: "
            Write-Host "  * 8-20 characters long"
            Write-Host "  * at least 1 lowercase character"
            Write-Host "  * at least 1 uppercase character"
            Write-Host "  * at least 1 special character (Any of the following: '!@#$%^\&*()[]_+-`")"
            Write-Host "  * at least 1 number character"
            Write-Host ""
            $temp_cognito_p = Get-ValidPass
            Write-Host ""
            Register-CGIPUserInPool -Username $cognitoUsername `
             -Password $temp_cognito_p -ClientId $UserPoolAppClientId `
             -Region $Region -UserAttribute @{Name="email";Value="$cognitoUsername"} 
            if ( $? ) {
                Write-Host "`nSuccess: Created a cognito user.`n`n \
                You can now log into the Kibana server using the email address you provided (username) and your temporary password.`n \
                You may have to verify your email address before logging in.`n \
                The URL for the Kibana server can be found in ./Info_Output.yml in the 'ElasticSearchDomainKibanaEndpoint' entry.`n`n \
                This URL will also be copied below:`n \
                $ElasticSearchDomainKibanaEndpoint"
            }
            Break

        } else {
            Write-Host "`nSorry about that--let's start over.`n"
            Write-Host "Do you want to set up a cognito user now?"
            for(;;) {
                $yn = $Host.UI.PromptForChoice("", "Do you want to set up a cognito user now?", $options, $default)
                if ($yn -eq 1) { #no
                    $resp=$false
                    Break
                } elseif ($yn -eq 0){ #yes
                    $resp=$true
                    Break
                }
            } 
        }
    }
}

Set-AWSCredential -ProfileName FHIR-Solution

#DynamoDB Table Backups
Write-Host "`n`nWould you like to set up daily DynamoDB Table backups?`n"
Write-Host "Selecting 'yes' below will set up backups using the default setup from the cloudformation/backups.yaml file."
Write-Host "DynamoDB Table backups can also be set up later. See the README file for more information.`n"
Write-Host "Note: This will deploy an additional stack, and can lead to increased costs to run this server."
Write-Host ""
Write-Host "Would you like to set up backups now?`n"
for(;;) {
    $yn = $Host.UI.PromptForChoice("", "Would you like to set up backups now?`n", $options, $default)
    if ($yn -eq 1) { #no
        Break
    } elseif ($yn -eq 0){ #yes
        New-CFNStack -StackName fhir-server-backups -TemplateBody (Get-Content -Raw cloudformation/backup.yaml) -Capability CAPABILITY_NAMED_IAM
        if ( $? ) {
            Write-Host "DynamoDB Table backups were set up successfully."
            Write-Host "Backups are automatically performed at 5:00 UTC."
        }
        Break
    }
} 


Write-Host "`n`nSetup completed successfully."
Write-Host "You can now access the FHIR APIs directly or through a service like POSTMAN.`n`n"
Write-Host "For more information on setting up POSTMAN, please see the README file."
Write-Host "All user details were stored in 'Info_Output.yml'.`n"
Write-Host "You can obtain new Cognito authorization tokens by using the init-auth.py script.`n"
Write-Host "Syntax: "
Write-Host "AWS_ACCESS_KEY_ID=<ACCESS_KEY> AWS_SECRET_ACCESS_KEY=<SECRET-KEY> python3 init-auth.py <USER_POOL_APP_CLIENT_ID> <REGION>"
Write-Host "`n`n"
Write-Host "For the current User:"
Write-Host "python3 init-auth.py $UserPoolAppClientId $Region"
Write-Host "`n"

Set-AWSCredential -ProfileName default
