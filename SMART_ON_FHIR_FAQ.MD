# SMART on FHIR Works FAQ

## Purpose
The purpose of this document is to help developers understand design decisions during the development of FHIR Works on AWS (FWoA). 

## General FAQ

**What version of SMART does FWoA support?**  
We support [SMART on FHIR 1.0.0](http://hl7.org/fhir/smart-app-launch/1.0.0/). When comparing specifications, ensure you are viewing the correct implementation.

**How does FWoA retrieve context from the IdP (SMART launch flow)?**  
FWoA expects any required context for the user or patient scopes to be in `fhirUser` or `launch_response_patient` jwt claims. For more information, see [fhir-works-on-aws-authz-smart assumptions](https://github.com/awslabs/fhir-works-on-aws-authz-smart#assumptions). The explicit launch/patient scopes and flow are dealt with exclusively at the authorization server. The `launch_response_patient` claim is FWoA specific, and the SMART on FHIR specification does not have a defined way to share which patient is in context.

**Does FWoA support the electronic health record (EHR) launch flow?**  
FWoA does not support EHR launch flow.

**How does FWoA handle mixed scopes?**  
Multiple scopes result in a union set of permissions. FWoA supports receiving multiple scopes. For example, the scopes `user/Patient.read patient/Observation.read` grant an application access to all patient resources the user may access and the Observations for the patient in context. For these scopes to work correctly, FWoA expects a FHIRUSER claim and a patient in context on the token.

**How does FWoA handle authorization?**  
FWoA uses attribute based access control, which is described in [Attribute Based Access Control (ABAC)](https://github.com/awslabs/fhir-works-on-aws-authz-smart#attribute-based-access-control-abac).

**Does FWoA have power users or Admins in the EHR Authorization?**  
FWoA allows for an admin user when using the `user` scope type. End users can configure or deactivate this parameter. Practitioners are considered admin users by default. For more information, see [Attribute Based Access Control (ABAC)](https://github.com/awslabs/fhir-works-on-aws-authz-smart#attribute-based-access-control-abac).

**Can FWoA be customized outside of the specification?**
FWoA allows the implementer to customize the scope type and access to specific operations. For more information, see [SMART on FHIR scope rules](https://github.com/awslabs/fhir-works-on-aws-authz-smart#smart-on-fhir-scope-rules).  

## Identity provider and authorization server FAQ
FWoA does not provide an authorization server or identity provider implementation. The developer must integrate existing implementations to FWoA. FWoA expects the authorization server to be compliant with the SMART on FHIR specifications. For more information, see the [FHIR Works on AWS deployment smart branch summary](https://github.com/awslabs/fhir-works-on-aws-deployment/tree/smart-mainline#summary).

**What are the authorization server’s responsibilities?**
The authorization server is responsible for:
1. Authentication and management of the Jason Web Token (JWT). This includes revocation, token refresh, and management of the [`state` parameter](http://hl7.org/fhir/smart-app-launch/1.0.0/index.html#app-protection). 
2. Differentiation between [`public` and `confidential` apps](http://hl7.org/fhir/smart-app-launch/1.0.0/index.html#support-for-public-and-confidential-apps). 
3. SMART on FHIR [client registration flow](http://hl7.org/fhir/smart-app-launch/1.0.0/index.html#registering-a-smart-app-with-an-ehr) and [launch context flow](http://hl7.org/fhir/smart-app-launch/1.0.0/index.html#smart-launch-sequence). 
4. Definition of supported scopes (`user/Patient.read`, etc.).

## Bulk Data Export FAQ
We use [v1.0.0](https://hl7.org/fhir/uv/bulkdata/export/index.html) of the Bulk Data Export implementation guide.

**What scopes should I use for Bulk Data Exports?**  
FWoA only allows `user/*.read` or `system/*.read` scopes to perform an export.  

>**Note**  
This is a scope limiter. If the requester only wants patients, they could use the `_type parameter`. For more information, see [Testing Bulk Data Export](https://github.com/awslabs/fhir-works-on-aws-deployment/tree/smart-mainline#testing-bulk-data-export).  

**How can an application download the requested bulk export data?**  
A completed bulk data request response uses S3 presigned URLs and expires after five minutes. For more information, see [Testing Bulk Data Export](https://github.com/awslabs/fhir-works-on-aws-deployment/tree/smart-mainline#testing-bulk-data-export).

## FHIR specification FAQ  
FWoA implements [R4](https://hl7.org/fhir/R4/) of the FHIR specification.

**How are Binary resources handled?**  
FWoA uses S3 put and get URLs to handle large binary resources greater than 6 MB. For more information, see [Accessing Binary resources](https://github.com/awslabs/fhir-works-on-aws-deployment/tree/smart-mainline#accessing-binary-resources). 

**What is the size limit of a Binary resource?**  
FWoA restricts a single S3 upload to a maximum of 5 GB.

**What is the size limit of a non-Binary resource?**  
FWoA restricts a single DynamoDB resource to a maximum of 400 KB. See [serverless.yaml](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/aa62a036fb8ff80b7ab99acc0ef8bd29faa58a64/serverless.yaml#L131) line 131.

**What is the size limit of a Bundle request?**  
FWoA restricts a single Lambda request to a maximum of 6 MB. FWoA limits no more than 100 DynamoDB transactions. For more information, see the [Components overview](https://github.com/awslabs/fhir-works-on-aws-deployment#components-overview). 

**Are implementation guides supported?**  
FWoA supports implementation guides (IG). Some IGs add new operations. FWoA does not support these out-of-the-box, and the implementer must add them. For more information, see [Using FHIR Implementation Guides](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/mainline/USING_IMPLEMENTATION_GUIDES.md). 

**What is the size limit of an implementation guide?**  
CloudFormation limits deployments to 262 MB. FWoA cannot support a deployment over this size. This is primarily an issue when layering multi-IGs.

**What is the recommended transport layer security (TLS) setting?**  
FWoA does not deploy a custom domain, and Amazon API Gateway does not allow FWoA to require TLS 1.2. Customers should configure FWoA to meet their internal security policies.
