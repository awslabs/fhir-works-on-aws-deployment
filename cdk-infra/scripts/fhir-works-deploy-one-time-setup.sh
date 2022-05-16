#!/bin/bash 

yalc 
# Yalc is used as a local package registry to allow your packages to be packages together and compiled. This allows serverless to correctly package everything together and deploy to AWS
if [ $? -ne 0 ] 
then
   printf "\nPlease install yalc. You can run this command to install yalc: 'npm i yalc -g'"
   exit 1
fi

packages=(
"fhir-works-on-aws-authz-rbac"
"fhir-works-on-aws-persistence-ddb"
"fhir-works-on-aws-routing"
"fhir-works-on-aws-search-es"
"fhir-works-on-aws-interface"
)

printf "\nPublish packages to yalc local package registry"
for i in "${packages[@]}"
do
    cd $i
    yarn install
    yalc publish
    cd ..
done