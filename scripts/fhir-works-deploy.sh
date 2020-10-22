#!/bin/bash -e

read -n 1 -p "This script adds local dependencies to your 'fhir-works-on-aws-deployment' package during build. It will then revert your 'package.json' to the last version of the package in Git. Have you committed the 'package.json' file in your 'fhir-works-on-aws-deployment' package  to Git (y/n)?" answer
if [ $answer != "y" ]
then
  printf "\nPlease commit the package.json file in  your 'fhir-works-on-aws-deployment' package to Git"
  exit
fi

packages=(
"fhir-works-on-aws-authz-rbac"
"fhir-works-on-aws-persistence-facade"
"fhir-works-on-aws-routing"
"fhir-works-on-aws-search-es"
)

# Go into interface package, delete old pregenerated files, install all dependencies again, and then push the package to yalc
cd fhir-works-on-aws-interface
rm -rf node_modules build/* dist/* 
yarn install
yalc push

cd ..

printf "\nFor each package except for deployment and interface package, add interface package as a dependency, remove old pregenerated files, install all dependencies again, and push new packages to yalc\n"
for i in "${packages[@]}"
do
    cd $i
    rm -rf node_modules build/* dist/* 
    yalc add fhir-works-on-aws-interface
    yarn install
    yalc push
    yalc remove fhir-works-on-aws-interface
    cd ..
done

printf "\nFor deployment package, remove old pregenerated files, add all other packages as dependencies, install all dependencies again"
cd fhir-works-on-aws-deployment
rm -rf node_modules build/* dist/* 
yalc add fhir-works-on-aws-interface
for i in "${packages[@]}"
do
  yalc add $i
done
yarn install


printf "\nReverting package.json changes. Serverless pack does not play well with local dependencies added by yalc\n"

git checkout package.json

printf "\nYou can now go to your deployment package and deploy using serverless. You can deploy using the command 'serverless deploy --aws-profile <PROFILE> --stage <STAGE>'" 

cd ..