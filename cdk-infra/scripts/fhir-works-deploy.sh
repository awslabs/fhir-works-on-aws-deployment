#!/bin/bash -e

packages=(
"fhir-works-on-aws-authz-rbac"
"fhir-works-on-aws-persistence-ddb"
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
rm -rf node_modules build/* dist/*  .yalc
yalc add fhir-works-on-aws-interface
for i in "${packages[@]}"
do
  yalc add $i
done
sed -i.bak 's#file:.yalc#./.yalc#g' package.json && rm package.json.bak
yarn install

printf "\nYou can now go to your deployment package and deploy using serverless. You can deploy using the command 'serverless deploy --aws-profile <PROFILE> --stage <STAGE>'"

cd ..