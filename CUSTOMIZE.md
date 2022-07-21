# FHIR Works on AWS customization

## API customization

To change what this FHIR server supports, both in terms of operations and in resource types, please check out the [config.ts](src/config.ts) file.

### Resource types

We split the resource types into two buckets 'genericResource' and 'resources'.

#### Generic resources

_genericResource_ are resources that should all be treated the same, in terms of how the resource type is operated on. For example, this implementation says all `genericResources` should use the `dynamoDbDataService` persistence component and the `esSearch` for typeSearching. In _genericResource_ you can modify the component you would like to use AND what operations you want to support.

Ways of customization:

- `profile.genericResource`
  - `genericResource.operations` is the list of valid operations this FHIR server will support in relation to ALL generic resource types.
  - `genericResource.excluded<Version>Resources` removes these resources from being supported for the specified \<Version\>.
  - `genericResource.fhirVersions` is the FHIR versions that this genericResource definition supports.
  - `genericResource.persistence` is the persistence component you want to use with these generic resources.
  - `genericResource.typeHistory` is the history component you want to use with these generic resources.
  - `genericResource.typeSearch` is the search component you want to use with these generic resources.

#### Resources

_resources_ are the 'special' resources that should be treated differently than the generic ones. For example, this implementation has `Binary` as a 'special' resource, meaning it will be using the `s3DataService` persistence component and no search component. Much like in _genericResource_ in these _resources_ you can modify the component you would like to use AND what operations you want to support.

Ways of customization:

- `profile.resources.<Type>`
  - `<Type>.operations` is the list of valid operations this FHIR server will support for this specific resource type.
  - `<Type>.fhirVersions` is the FHIR versions that this resource type supports.
  - `<Type>.persistence` is the persistence component you want to use with this resource type.
  - `<Type>.typeHistory` is the history component you want to use with this resource type.
  - `<Type>.typeSearch` is the search component you want to use with this resource type.

### FHIR versions

This FHIR Works on AWS supports FHIR R4 out of the box. To change the version of support you must change the `profile.fhirVersion`, the `profile.genericResource.fhirVersions` and the 'special' `profile.resources.<Type>.fhirVersions`

## Authorization (RBAC) customization

This FHIR Works on AWS deployment supports role based access control (RBAC) for authorization. To modify the rules please see [RBACRules.ts](src/RBACRules.ts) file. This file is structured by Cognito User Groups. For example the `practitioner` User Group can do ['create', 'read', 'update', 'delete', 'vread', 'search-type', 'transaction'] operations on all R4 resource types.

To assign users to specific user groups please log into the AWS console and navigate to the Cognito service. Once there select on your FHIR User Pool and find the user you want to modify. From there add that user to the desired user group.

## CORS customization

The FHIR Works on AWS deployment can be customized to provide CORS support for browser-based applications. The following configuration steps are required:


- Supply a [CorsOptions](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/cors/index.d.ts) configuration when building the [serverless router](src/index.ts). For example
  ```ts
  const corsOptions: CorsOptions = {...};
  ...
  generateServerlessRouter(fhirConfig, genericResources, corsOptions)
  ```
  Please see the available [configuration options](https://www.npmjs.com/package/cors#configuration-options).
- For pre-flight request support, add an OPTIONS method to the API Gateway `{proxy+}` route within the CloudFormation template. The request should be handled by the Lambda handler. The method should not use authorization.
- If using a custom authorizer, then rejected requests also need to provide CORS headers, otherwise it is tricky to interpret the unauthorized response in the browser. The following [blog](https://www.serverless.com/blog/cors-api-gateway-survival-guide) describes how a `GatewayResponse` resource may be added to the Serverless template to provide these headers. This can be adapted to the CDK template by following the [GatewayResponse](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.GatewayResponse.html) construct documentation.

## Supporting other FHIR implementation guides or profiles

FHIR has this concept of [profiling](https://www.hl7.org/fhir/profiling.html). FHIR Works on AWS does not explicitly support it, but it does not explicitly restrict users from adapting the [FHIR Works router](https://github.com/awslabs/fhir-works-on-aws-routing) to fit their needs.

To add support for profiles you will need to modify the router's json validation schema found [here](https://github.com/awslabs/fhir-works-on-aws-routing/tree/mainline/src/router/validation/schemas). Inside of the schema you can add/remove resource types and modify the expected parameters for each type.

If you are adding/removing a new resource type you will most likely want to adjust what resource types are defined as 'generic'. This can be done in the [constants.ts](src/constants.ts) file.
