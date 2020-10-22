#!/bin/bash -e

packages=(
"fhir-works-on-aws-persistence-facade"
"fhir-works-on-aws-routing"
"fhir-works-on-aws-search-es"
"fhir-works-on-aws-authz-rbac"
)

cd fhir-works-on-aws-interface
yarn link
yarn install
cd ..

for i in "${packages[@]}"
do
    cd $i
    yarn link
    yarn link fhir-works-on-aws-interface
    yarn install
    cd ..
done

cd fhir-works-on-aws-deployment
yarn link fhir-works-on-aws-interface
for i in "${packages[@]}"
do
  yarn link $i
done
yarn install

cd ..

printf "\nRun 'yarn watch' in the folder of each package that you're developing in. This will pick up live changes from the package. You can then run this command in the deployment package to run the code locally. 'AWS_ACCESS_KEY_ID=<Access-Key> AWS_SECRET_ACCESS_KEY=<Secret-Key> sls offline start"
