# FHIR Works on AWS deployment

FHIR Works on AWS is a software toolkit that can be used to deploy a [FHIR server](https://www.hl7.org/fhir/overview.html) on AWS. Using this toolkit, you can customize and add different FHIR functionality to best serve your use cases.

## FHIR Works on AWS features

FHIR Works on AWS implements the FHIR specification (STU3 or R4) and deploys that implementation into an AWS account using a set of mostly serverless AWS services.  It provides the following FHIR features:

+ Create, Read, Update, Delete (CRUD) operations for *all* R4 or STU3 base FHIR resources
+ Search by FHIR resource type
+ Versioned reads ([vread](https://www.hl7.org/fhir/http.html#vread))
+ Transaction bundle POSTs of up to 25 entries
+ Third-party Implementation Guides for localization
+ Authentication and authorization using either Role-Based Access Control or SMART

## Architecture

The system architecture comprises Amazon API Gateway, AWS Lambda, Amazon DynamoDB, Amazon S3, Amazon Elasticsearch Service, and optionally Amazon Cognito, plus CloudWatch Logs. The endpoint is published through API Gateway. The persistence layer (database and storage) uses Amazon DynamoDB and S3, with Elasticsearch as the search index for the data initially written to DynamoDB. The endpoint is secured by API keys, and by Cognito for user-level authentication and user-group authorization. CloudWatch Logs capture system events.  The diagram below shows the toolkit's architecture components and how they are related.
 
![Architecture](resources/architecture.png)

## Authentication and Authorization options

[Cognito and Role-Based Access Control](https://github.com/awslabs/fhir-works-on-aws-authz-rbac) is deployed by default, since it includes an Identity Provider (Cognito User Pools) and is easy to configure. However, its permissions model is less granular than is needed for some use cases: when a new user is created, it is assigned to the auditor, practitioner, or non-practitioner groups. The FHIR resource access granted to the user depends on their group membership.  

If preferred, [SMART](https://github.com/awslabs/fhir-works-on-aws-authz-smart) can be used instead for authentication and authorization to the FHIR server’s resources. It offers more granularity for authentication, permitting access to a particular resource only if it has a reference to the requesting user identity, and is an increasingly widely-used supplementary standard to FHIR itself. It does require being configured to use a third-party OpenID Connect Identity Provider, though.  

The AuthN/Z providers are defined in the `package.json` and `config.ts` files.

## Components overview

The FHIR Works on AWS code executes in two Lambda functions, and comprises a set of single-purpose components. These are designed to provide the flexibility for customers to substitute them with their own implementations if required. The components used in this deployment are:
+ [Interface](https://github.com/awslabs/fhir-works-on-aws-interface) - Defines communication between the components.
+ [Routing](https://github.com/awslabs/fhir-works-on-aws-routing) - Accepts HTTP FHIR requests, routes them to the other components, logs any errors, transforms output to HTTP responses and generates the [Capability Statement](https://www.hl7.org/fhir/capabilitystatement.html).
+ [Authorization](https://github.com/awslabs/fhir-works-on-aws-authz-rbac) - Examines the access token supplied in the HTTP request header and the action the request is trying to perform. It then determines if that action is permitted.
+ [Persistence](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb) - Implements the business logic for creating, reading, updating, and deleting the FHIR record from the persistence store. FHIR also supports ‘conditional’ CRUD actions, and patching. 
   + Bundle - Enables a single incoming request to act on multiple FHIR resources (e.g. requiring just one request to create five patient resources instead of five individual requests). There are two types of bundles: Batch and Transaction. FHIR Works currently supports  only Transaction bundles.
+ [Search](https://github.com/awslabs/fhir-works-on-aws-search-es) - Enables system-wide searching (e.g. /?name=bob) and type searching (e.g. /Patient/?name=bob).
+ History - (*Not yet implemented*) Searches all archived/older versioned resources. This would be done at a system, type or instance level.

## License

This project is licensed under the Apache-2.0 license.

## Obtaining FHIR Works on AWS

The easiest and quickest way to obtain FHIR Works on AWS is by deploying the [AWS solution](https://aws.amazon.com/solutions/implementations/fhir-works-on-aws/). 

**Note**: The AWS Solution provides an earlier version of the toolkit (see Solutions [CHANGELOG](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/aws-solution/CHANGELOG.md for more details of the installation). 

To obtain the latest version, or modify the code and set up a developer environment, follow the steps below to install from the GitHub repository:

1. Clone or download the repository to a local directory.
 
Example:

```sh
git clone https://github.com/awslabs/fhir-works-on-aws-deployment.git
```

**Note**: To modify FHIR Works on AWS, create your own fork of the GitHub repository. This allows you to check in any changes you make to your private copy of the code.  See [CONTRIBUTING](./CONTRIBUTING.md) for more details.

2. Use one of the following links to install FHIR Works on AWS:

- [Linux/macOS](./INSTALL.md#linux-or-macos-installation)
- [Windows](./INSTALL.md#windows-installation)
- [Docker](./INSTALL.md#docker-installation)

3. Refer to these [instructions](./DEVELOPMENT.md) for making code changes.

If you intend to use FHIR Implementation Guides, read the [Using Implementation Guides](./USING_IMPLEMENTATION_GUIDES.md) documentation first. 

If you intend to do a multi-tenant deployment, read the [Using Multi-Tenancy](./USING_MULTI_TENANCY.md) documentation first. 

## Setting variables for FHIR on AWS

### Retrieving user variables

After installation, all user-specific variables (such as `USER_POOL_APP_CLIENT_ID`) can be found in the `Info_Output.log` file. You can also retrieve these values by running the following command:
```
serverless info --verbose --region <REGION> --stage <STAGE>. 
```
**Note**: The default stage (environment) is `dev` and region is `us-west-2`. 

If you encounter `Error: EACCES: permission denied` when running a certain command in Linux/MacOS, try re-running it using `sudo`.

### Accessing the FHIR API

Once deployed to an AWS account, the FHIR API can be accessed through `API_URL` using the following REST syntax: 
```sh
curl -H "Accept: application/json" -H "Authorization:<COGNITO_AUTH_TOKEN>" -H "x-api-key:<API_KEY>" <API_URL>
```
For more information, click [here](http://hl7.org/fhir/http.html). 

### Using Postman to make API requests

[Postman](https://www.postman.com/) is an API Client for RESTful services that can run on your development desktop for making requests to the FHIR Server. It is highly recommended, since it enables simpler access to the FHRI API. You can use Postman to make API requests by following the steps below:

**Importing the collection file**

Under the Postman folder, you can access the JSON definitions for some API requests that you can make against the server. To import these requests into your Postman application, click [here](https://kb.datamotion.com/?ht_kb=postman-instructions-for-exporting-and-importing). 

**Note**: Ensure that you import the [Fhir.postman_collection.json](./postman/Fhir.postman_collection.json) collection file.

After you import the collection, set up your environment. You can set up a local environment, a development environment, and a production environment. Each environment should have the correct values configured. For example, the value for `API_URL` for the local environment might be `localhost:3000` while the `API_URL` for the development environment would be your API gateway’s endpoint.

**Setting environment variables**

Set the following three environment variables:

+ `Fhir_Local_Env.json`
+ `Fhir_Dev_Env.json`
+ `Fhir_Prod_Env.json`

For instructions on importing the environment JSON, click [here](https://thinkster.io/tutorials/testing-backend-apis-with-postman/managing-environments-in-postman).

The `COGNITO_AUTH_TOKEN` required for each of these files can be obtained by following the [Authorizing a user](#authorizing-a-user) instructions.

The following variables required in the Postman collection can be found in the `Info_Output.log` file or by running `serverless info --verbose`:
+ API_URL: from Service Information:endpoints: ANY
+ API_KEY: from Service Information: api keys: developer-key

To find what FHIR Server supports, use the `GET Metadata` Postman request to retrieve the [Capability Statement](https://www.hl7.org/fhir/capabilitystatement.html)

**Authorizing user**

By default, FHIR Works on AWS uses Role-Based Access Control (RBAC) to determine what operations and what resource types a user can access. The default rule set can be found in [RBACRules.ts](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/mainline/src/RBACRules.ts). To access the API, you must use the ID token. This ID token must include scopes of either `openid`, `profile` or `aws.cognito.signin.user.admin`. 

Using either of these scopes provide information about users and their group. It helps determine what resources/records they can access.

+ The `openid` scope returns all user attributes in the ID token that are readable by the client. The ID token is not returned if the openid scope is not requested by the client. 
+ The `profile` scope grants access to all user attributes that are readable by the client. This scope can only be requested with the openid scope. 
+ The `aws.cognito.signin.user.admin` scope grants access to [Amazon Cognito User Pool](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/Welcome.html) API operations that require access tokens, such as `UpdateUserAttributes` and `VerifyUserAttribute`.

For more information, click [here](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-idp-settings.html).

**Retrieving an ID token using aws.cognito.signin.user.admin**

To access the FHIR API, an ID token is required. A Cognito ID token can be obtained using the following command, substituting all variables with values from `INFO_OUTPUT.log` or by using the `serverless info --verbose` command.
+	For Windows, you will need Python 3 installed. Enter:
```sh
python .\scripts\init-auth.py <CLIENT_ID> <REGION>
```
+	For Mac/Linux, enter:
```sh
python3 scripts/init-auth.py <CLIENT_ID> <REGION>
```
The return value is the `COGNITO_AUTH_TOKEN` (found in the postman collection) to be used for access to the FHIR APIs.

### Accessing Binary resources

Binary resources are FHIR resources that consist of binary/unstructured data of any kind. This could be medical images, PDFs, video or other files. Because this implementation of the FHIR API uses the API Gateway and Lambda services, which currently have limitations in request/response sizes of 10 MB and 6 MB respectively, the largest request payload that can be sent synchronously through the FHIR interface has been set at 5 MB. Larger payloads use the hybrid approach of storing a binary resource’s *metadata* in DynamoDB and using S3's `get/putPreSignedUrl` APIs. So in your requests to the FHIR API, you will store/get the Binary's metadata in/from DynamoDB and the response payload will contain a pre-signed S3 URL, which should be used to interact directly with the binary file.

### Testing Binary resources

**Using Postman** 

For steps, click [here](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/mainline/README.md#using-postman-to-make-api-requests).

**Note**: We recommend you test Binary resources by using the `Binary` folder in Postman. 

**Using cURL**

To test this with cURL, follow these steps:
1.	POST a binary resource to FHIR API using the following command:
+ For Windows:
```sh
curl -H "Accept: application/json" -H "Authorization:<COGNITO_AUTH_TOKEN>" -H "x-api-key:<API_KEY>" --request POST ^
  --data '{"resourceType": "Binary", "contentType": "image/jpeg"}' ^
  <API_URL>/Binary
```
+ For Mac/Linux:
```sh
curl -H "Accept: application/json" -H "Authorization:<COGNITO_AUTH_TOKEN>" -H "x-api-key:<API_KEY>" --request POST \
  --data '{"resourceType": "Binary", "contentType": "image/jpeg"}' \
  <API_URL>/Binary
```
2. Check the POST's response. There will be a `presignedPutUrl` parameter. Use that pre-signed url to upload the file, using this command:
```sh
curl -v -T "<LOCATION_OF_FILE_TO_UPLOAD>" "<PRESIGNED_PUT_URL>"
```

### Testing bulk data export

Bulk Export allows you to export all of the data stored in DynamoDB to S3. We currently support the [System Level](https://hl7.org/fhir/uv/bulkdata/export/index.html#endpoint---system-level-export) export. For more information about bulk export, refer to the relevant FHIR [Implementation Guide](https://hl7.org/fhir/uv/bulkdata/export/index.html).

To test this feature on FHIR Works on AWS, make API requests using the [Fhir.postman_collection.json](./postman/Fhir.postman_collection.json) file by following these steps:
1.	In the FHIR Examples collection, under the **Export** folder, use the `GET System Export` to initiate an export request.
2.	In the response, check the Content-Location header field for a URL. This should be in the `<base-url>/$export/<jobId>` format.
3.	To get the status of the export job, in the **Export** folder, use the `GET System Job Status` request. Enter the `jobId` value from step 2 in that request.
4.	Check the response returned from `GET System Job Status`. If the job is in progress, the response header will have the field `x-progress: in-progress`. Keep polling that URI periodically until the job is complete. Once done, you'll get a JSON response body containing presigned S3 URLs linking to the exported data, enabling them to be downloaded.
Example:
```sh
{
    "transactionTime": "2021-03-29T16:49:00.819Z",
    "request": "https://xyz.execute-api.us-west-2.amazonaws.com/$export?_outputFormat=ndjson&_since=1800-01-01T00%3A00%3A00.000Z&_type=Patient",
    "requiresAccessToken": false,
    "output": 
    [
        {
            "type": "Patient",
            "url": "https://fhir-service-dev-bulkexportresultsbucket-.com/abc"
        }
    ],
    "error": []
}
```
**Note**: To cancel an export job, use the `Cancel Export Job` request in the **Export** folder located in the Postman collections.

## Troubleshooting FHIR Works on AWS

+ If changes need to be made to the Elasticsearch instances, you may have to redeploy the toolkit. Redeployment deletes and recreates the Elasticsearch, which also deletes the data in the cluster. In a future release, we intend to create a Lambda function that can re-sync the data from DynamoDB to Elasticsearch. To do this today, you can use either of the following options:
   + Manually push the DynamoDB data to Elasticsearch using a Lambda function that you create yourself.
   + Refresh the DynamoDB table with a backup.
   + Remove all data from the DynamoDB table, thus creating parity between Elasticsearch and DynamoDB.

+ Support for STU3 and [R4](https://www.hl7.org/fhir/validation.html) releases of FHIR is based on the JSON schema provided by HL7. The schema for R4 is more restrictive than that for [STU3](http://hl7.org/fhir/STU3/validation.html). The STU3 schema doesn’t restrict appending additional fields into the POST/PUT requests of a resource, whereas the R4 schema has a strict definition of what is permitted in the request. You can access the schema [here](https://github.com/awslabs/fhir-works-on-aws-routing/blob/mainline/src/router/validation/schemas/fhir.schema.v3.json).

**Note**: FHIR Works uses the official schema provided by [HL7](https://www.hl7.org/fhir/STU3/downloads.html).  

+ When issuing a `POST`/`PUT` request to the server, if you get an error response that includes the text `Failed to parse request body as JSON resource`, check that you've set the request headers correctly. The header for `Content-Type` should be either `application/json` or `application/fhir+json`. If you're using Postman for making requests, in the **Body** tab, make sure to change the setting to `raw` and `JSON`.
![Postman Body Request Settings](resources/postman_body_request_settings.png)

## Feedback
We'd love to hear from you! Please reach out to our team via [GitHub Issues](https://github.com/awslabs/fhir-works-on-aws-deployment/issues) to provide any feedback.