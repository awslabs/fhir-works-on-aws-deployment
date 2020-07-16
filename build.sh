#!/bin/bash
#Usage: ./build.sh
function install_dependencies(){
  	yarn install
		yarn run release
		rm -rf node_modules

    return 0
}

echo "installing interface"
cd aws-fhir-interface
install_dependencies

echo "installing rbac"
cd ../aws-fhir-rbac
install_dependencies

echo "installing search"
cd ../aws-fhir-search-es
install_dependencies

echo "installing persistence"
cd ../aws-fhir-persistence
install_dependencies

echo "installing routing"
cd ../aws-fhir-routing
install_dependencies

echo "installing deployment"
cd ../aws-fhir-deployment
yarn install
yarn run release
