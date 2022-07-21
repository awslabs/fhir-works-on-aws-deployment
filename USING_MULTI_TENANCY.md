# Multi-Tenancy

Multi-tenancy allows a single `fhir-works-on-aws` stack to serve as multiple FHIR servers for different tenants.

`fhir-works-on-aws` uses a pooled infrastructure model for multi-tenancy. This means that all tenants share the 
same infrastructure (DynamoDB tables, S3 Buckets, Elasticsearch cluster, etc.), but the data 
is logically partitioned to ensure that tenants are prevented from accessing another tenant’s resources.

## Enabling multi-tenancy

Use the `enableMultiTenancy` option when deploying the stack: 

```bash
yarn deploy -c enableMultiTenancy=true
```

**Note:** Updating an existing (single-tenant) stack to enable multi-tenancy is a breaking change. Multi-tenant 
deployments use a different data partitioning strategy that renders the old, single-tenant, data inaccessible. 
If you wish to switch from single-tenant to a multi-tenant model, it is recommended to create a new multi-tenant stack 
and then migrate the data from the old stack. Switching from multi-tenant to a single-tenant model is also a breaking change.

## Tenant identifiers

Tenants are identified by a tenant Id in the auth token. A tenant Id is a string that can contain alphanumeric characters, 
dashes, and underscores and have a maximum length of 64 characters. 

There are 2 ways to include a tenant Id in the auth token:

1. Add the tenant Id in a custom claim. This is the recommended approach. 
The default configuration adds the tenant Id on the `custom:tenantId` claim

1. Encode the tenant Id in the `aud` claim by providing an URL that matches `<baseUrl>/tenant/<tenantId>`. 
This can be useful when using an IDP that does not support custom claims.

If a token has a tenant Id in a custom claim and in the aud claim, then both claims must have the same tenant Id value, 
otherwise an Unauthorized error is thrown.

The default deployment adds a custom claim `custom:tenantId` to the Cognito User Pool. You can manage the tenant Id value
for the different users on the AWS Cognito Console. The [provision-user.py](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/mainline/scripts/provision-user.py) 
script will also create users with a set tenant Id.

## Additional Configuration

Additional configuration values can be set on [config.ts](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/mainline/src/config.ts)

- `enableMultiTenancy`: Whether or not to enable multi-tenancy.
- `useTenantSpecificUrl`: When enabled, `/tenant/<tenantId>/` is appended to the FHIR server url. 
  
  e.g. A client with `tennatId=tenantA` would use the following url to search for Patients: 
  ```
  GET <serverUrl>/tenant/<tenantId>/Patient
  GET https://1234567890.execute-api.us-west-2.amazonaws.com/dev/tenant/tenantA/Patient
  ```
  Enabling this setting is useful to give each tenant a unique FHIR server base URL.

- `tenantIdClaimPath`: Path to the tenant Id claim in the auth token JSON. Defaults to `custom:tenantId` 
