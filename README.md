## Black Pear README

Attached are the 'packages' broken out.

- aws-fhir-interface – responsible for defining the below responsibilities and interfaces between all packages
- aws-fhir-routing – responsible for taking a FHIR request and passing it to the correct component
- aws-fhir-persistence – responsible for persisting the FHIR resources
- aws-fhir-search-es – responsible for the elastic search searching code
- aws-fhir-rbac – responsible for controlling role based access control to resources
- aws-fhir-deployment – this is the where we will package together the above packages into a single deployable unit

### Assumptions

- You are working on a unix-based shell (Mac or Linux)
- You have previously set up your environment with yarn, npm, serverless & aws cli

If you need further set-up help please checkout the README in aws-fhir-deployment directory

### Deploying the code

NOTE: Since the code is just being strapped together locally; combining the packages is painful, time consuming and **not fool-proof**.

1. From root run `./build.sh` shell script this will install all dependencies required
1. cd to aws-fhir-deployment directory
1. Deploy the code to AWS with serverless: `serverless deploy --aws-profile <AWS PROFILE> --stage <STAGE> --region <AWS_REGION>`
1. Create a cognito user by running this script: `AWS_ACCESS_KEY_ID=<ACCESS_KEY> AWS_SECRET_ACCESS_KEY=<SECRET_KEY> python3 scripts/provision-user.py <USER_POOL_ID> <USER_POOL_APP_CLIENT_ID> <REGION>`
   1. you should be able to get the above parameters from the serverless output: `serverless info --verbose --stage <STAGE> --region <AWS_REGION>`
   1. FYI output is a valid 'access token' that can be used

FYI: Initial deployments can take ~30 minutes

### Using POSTMAN to make API Requests

[POSTMAN](https://www.postman.com/) is an API Client for RESTful services that can run on your development desktop for making requests to the FHIR Server.

Included in this code package, under the folder “aws-fhir-deployment/postman”, are JSON definitions for some requests that you can make against the server. To import these requests into your POSTMAN application, you can follow the directions [here](https://kb.datamotion.com/?ht_kb=postman-instructions-for-exporting-and-importing). Be sure to import the file

> Fhir.postman_collection.json.

After you import the example requests, you need to set up your environment. You can set up a local environment, a dev environment, and a prod environment. Each environment should have the correct values configured for it. For example the _API_URL_ for the local environment might be _localhost:3000_ while the _API_URL_ for the dev environment would be your API Gateway’s endpoint.

Instructions for importing the environment JSON is located [here](https://thinkster.io/tutorials/testing-backend-apis-with-postman/managing-environments-in-postman). The three environment files are:

- Fhir_Local_Env.json
- Fhir_Dev_Env.json
- Fhir_Prod_Env.json

The COGNITO_AUTH_TOKEN required for each of these files can be obtained by following the instructions running:

- `python3 scripts/init-auth.py <USER_POOL_APP_CLIENT_ID> <REGION>`

Other required parameters can be found by running `serverless info --verbose`

### Create a new packages

Steps:

1. Create and finish package 1st; get it fully working
1. Remove the node_modules folder from your new package (required)
1. Either
   1. (new pkg not in package.json) Add the new package to your package.json file via `yarn add ./../<package_name>`
   1. (new pkg already in package.json) remove aws-fhir-deployment node_modules and do a `yarn install`
1. Run the `serverless deploy` command as usual

It is a painful/long iteration cycle (for now) we are working through getting serverless offline working

### Limitations

- Because Yarn treats these local packages as a real dependency it means it will really install it to your local node_modules/ directory, so if you make changes on the npm module, they won’t be reflected on the installed version you have in the Node.js project. So if you want a dependent package change to reflect to aws-fhir-deployment package you must remove exisiting node_modules from aws-fhir-deployment package and re-run `yarn install`
