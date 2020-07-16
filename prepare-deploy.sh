#!/bin/bash
#Usage: ./prepare-deploy.sh
# Because Yarn treats these local packages as a real dependency it means it will really install it to your local node_modules/ directory,
# so if you make changes on the npm module, they won’t be reflected on the installed version you have in the Node.js project.

echo "removing interface node"
cd aws-fhir-interface
rm -rf node_modules

echo "removing rbac node"
cd ../aws-fhir-rbac
rm -rf node_modules

echo "removing search node"
cd ../aws-fhir-search-es
rm -rf node_modules

echo "removing persistence node"
cd ../aws-fhir-persistence
rm -rf node_modules

echo "removing routing node"
cd ../aws-fhir-routing
rm -rf node_modules

echo "Updating deployment node_modules"
cd ../aws-fhir-deployment
rm -rf node_modules
yarn install