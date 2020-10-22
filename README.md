# fhir-works-on-aws-deployment

FHIR Works on AWS is a framework to deploy a [FHIR](https://www.hl7.org/fhir/overview.html) server on AWS. This package is an example implementation of this framework. The power of this framework is being able to customize and add in additional FHIR functionality for your unique use-case. An example of this, is this implementation uses a [Facade](https://github.com/awslabs/fhir-works-on-aws-persistence-facade) to proxy request to an [Integration Transform](https://github.com/aws-samples/fhir-hl7v2-integration-transform). Say you don't want to use a facade, you could implement your own persistence component and plug it into your deployment package. With FHIR Works on AWS you control how your FHIR server will work!

## Capabilities

This deployment implementation utilizes Lambda to provide this FHIR capability:

CRUD operations for all R4 or STU3 base FHIR resources and as supported by the Integration Transform

## Quick start/installation

Do you want to just try it out? Please follow the instructions below:

### Download

Clone or download the repository to a local directory. **Note:** if you intend to modify FHIR Works on AWS you may wish to create your own fork of the GitHub repo and work from that. This allows you to check in any changes you make to your private copy of the solution.

Git Clone example:

```sh
git clone https://github.com/awslabs/fhir-works-on-aws-deployment.git
```

### Install

- [Linux/OSX](./INSTALL.md#linux-or-osx-installation)
- [Windows](./INSTALL.md#windows-installation)
- [Docker](./INSTALL.md#docker-installation)


### Development

[Instructions for making local code changes](./DEVELOPMENT.md)
 
## Architecture

The system architecture consists of multiple layers of AWS serverless services. The endpoint is hosted using API Gateway. The storage layer is backed by an Integration Transform in which FHIR Works makes REST API requests to. The FHIR endpoint is secured by API keys and Cognito for user-level authentication and user-group authorization. 

## Components overview

FHIR Works on AWS is powered by many singly functioned components. We built it this way to give customers the flexibility to plug in their own implementations if needed. The components used in this deployment are:

- [Interface](https://github.com/awslabs/fhir-works-on-aws-interface) - Responsible for defining the communication between all the other components
- [Routing](https://github.com/awslabs/fhir-works-on-aws-routing) - Responsible for taking an HTTP FHIR request and routing it to the other component, catching all thrown errors, transforming output to HTTP responses and generating the [Capability Statement](https://www.hl7.org/fhir/capabilitystatement.html)
- [Authorization](https://github.com/awslabs/fhir-works-on-aws-authz-rbac) - Responsible for taking the access token found in the HTTP header and the action the request is trying to perform and determine if that is allowed or not
- [Persistence](https://github.com/awslabs/fhir-works-on-aws-persistence-facade) - Responsible for basic CRUD interactions through proxying requests to an [Integration Transform](https://github.com/aws-samples/fhir-hl7v2-integration-transform)
- Search - _NOT_IMPLEMENTED_ Responsible for both system-wide searching (/?name=bob) and type searching (/Patient/?name=bob)
- History - _NOT IMPLEMENTED_ Responsible for searching all archived/older versioned resources. This can be done at a system, type or instance level.

## License

This project is licensed under the Apache-2.0 License.

## Usage instructions

### User variables

After installation, all user-specific variables (such as `USER_POOL_APP_CLIENT_ID`) can be found in the `INFO_OUTPUT.yml` file. You can also retrieve these values by running `serverless info --verbose --region <REGION> --stage <STAGE>`. **NOTE:** default stage is `dev` and region is `us-west-2`.

If you are receiving `Error: EACCES: permission denied` when executing a command, try re-running the command with `sudo`.

### Accessing the FHIR API

The FHIR API can be accessed through the API_URL using REST syntax as defined by FHIR here

> http://hl7.org/fhir/http.html

using this command

```sh
curl -H "Accept: application/json" -H "Authorization:<COGNITO_AUTH_TOKEN>" -H "x-api-key:<API_KEY>" <API_URL>
```

Other means of accessing the API are valid as well, such as Postman. More details for using Postman are detailed below in the _Using POSTMAN to make API Requests_ section.

#### Using POSTMAN to make API Requests

[POSTMAN](https://www.postman.com/) is an API Client for RESTful services that can run on your development desktop for making requests to the FHIR Server. Postman is highly suggested and will make accessing the FHRI API much easier.

Included in this code package, under the folder “postman”, are JSON definitions for some requests that you can make against the server. To import these requests into your POSTMAN application, you can follow the directions [here](https://kb.datamotion.com/?ht_kb=postman-instructions-for-exporting-and-importing). Be sure to import the collection file.

> [Fhir.postman_collection.json](./postman/Fhir.postman_collection.json)

After you import the collection, you need to set up your environment. You can set up a local environment, a dev environment, and a prod environment. Each environment should have the correct values configured for it. For example the _API\_URL_ for the local environment might be _localhost:3000_ while the _API\_URL_ for the dev environment would be your API Gateway’s endpoint.

Instructions for importing the environment JSON is located [here](https://thinkster.io/tutorials/testing-backend-apis-with-postman/managing-environments-in-postman). The three environment files are:

- Fhir_Local_Env.json
- Fhir_Dev_Env.json
- Fhir_Prod_Env.json

The `COGNITO_AUTH_TOKEN` required for each of these files can be obtained by following the instructions under [Authorizing a user](#authorizing-a-user).
Other required parameters can be found by running `serverless info --verbose`

To know what all this FHIR API supports please use the `GET Metadata` postman to generate a [Capability Statement](https://www.hl7.org/fhir/capabilitystatement.html).

### Authorizing a user

FHIR Works on AWS solution uses role based access control (RBAC) to determine what operations and what resource types the requesting user has access too. The default ruleset can be found here: [RBACRules.ts](src\RBACRules.ts). For users to access the API they must use an OAuth access token. This access token must include scopes of either:

- `openid profile` Must have both
- `aws.cognito.signin.user.admin`

Using either of the above scopes will include the user groups in the access token.

#### Retrieving an access token via script - easier (scope = aws.cognito.signin.user.admin)

A Cognito OAuth access token can be obtained using the following command substituting all variables with their values from `INFO_OUTPUT.yml` or the previously mentioned `serverless info` command.

For Windows:

```sh
scripts/init-auth.py <USER_POOL_APP_CLIENT_ID> <REGION>
```

For Mac:

```sh
python3 scripts/init-auth.py <USER_POOL_APP_CLIENT_ID> <REGION>
```

The return value is the `COGNITO_AUTH_TOKEN` (found in the postman collection) to be used for access to the FHIR APIs

#### Retrieving access token via postman (scope = openid profile)

In order to access the FHIR API, a `COGNITO_AUTH_TOKEN` is required. This can be obtained following the below steps within postman:

1. Open postman and click on the operation you wish to make (i.e. `GET Patient`)
2. In the main screen click on the `Authorization` tab
3. Using the TYPE drop down choose `OAuth 2.0`
4. You should now see a button `Get New Access Token`; Click it
5. For 'Grant Type' choose `Implicit`
6. For 'Callback URL' use `http://localhost`
7. For 'Auth URL' use `https://<USER_POOL_APP_CLIENT_ID>.auth.<REGION>.amazoncognito.com/oauth2/authorize` which should look like: `https://42ulhdsc7q3l73mqm0u4at1pm8.auth.us-east-1.amazoncognito.com/oauth2/authorize`
8. For 'Client ID' use your USER_POOL_APP_CLIENT_ID which should look like: `42ulhdsc7q3l73mqm0u4at1pm8`
9. For 'Scope' use `profile openid`
10. For 'State' use a random string
11. Click `Request Token`
12. A sign in page should pop up where you should put in your username and password (if you don't know it look at the [init-auth.py](scripts\init-auth.py) script)
13. Once signed in the access token will be set and you will have access for ~1 hour

#### POSTMAN (recommended)

To test we suggest you to use POSTMAN, please see [here](#using-postman-to-make-api-requests) for steps.

#### cURL

To test this with cURL, use the following command:

1. POST a Binary resource to FHIR API:

```sh
curl -H "Accept: application/json" -H "Authorization:<COGNITO_AUTH_TOKEN>" -H "x-api-key:<API_KEY>" --request POST \
  --data '{"resourceType": "Binary", "contentType": "image/jpeg"}' \
  <API_URL>/Binary
```

1. Check the POST's response. There will be a `presignedPutUrl` parameter. Use that pre-signed url to upload your file. See below for command

```sh
curl -v -T "<LOCATION_OF_FILE_TO_UPLOAD>" "<PRESIGNED_PUT_URL>"
```

## Gotchas/Troubleshooting

- Support for STU3 and R4 releases of FHIR is based on the JSON schema provided by HL7. The schema for [R4](https://www.hl7.org/fhir/validation.html) is more restrictive than the schema for [STU3](http://hl7.org/fhir/STU3/validation.html). The STU3 schema doesn’t restrict appending additional fields into the POST/PUT requests of a resource, whereas the R4 schema has a strict definition of what is permitted in the request.

- When making a POST/PUT request to the server, if you get an error that includes the text `Failed to parse request body as JSON resource`, check that you've set the request headers correctly. The header for `Content-Type` should be either `application/json` or `application/fhir+json` If you're using Postman for making requests, in the `Body` tab, be sure to also set the setting to `raw` and `JSON`.
  ![Postman Body Request Settings](resources/postman_body_request_settings.png)

## Feedback

We'd love to hear from you! Please reach out to our team: [fhir-works-on-aws-dev](mailto:fhir-works-on-aws-dev@amazon.com) for any feedback.
