# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2021-09-27
### ⚠ BREAKING CHANGES

* The Cognito `IdToken` is now used instead of the `AccessToken` to authorize requests.

  * Multi-tenancy itself is not a breaking change, you can continue to use FHIR works on single-tenant mode 
by setting the `enableMultiTenancy` to false. 
  
  * However, note that updating an existing (single-tenant) stack to enable multi-tenancy is a breaking change. Multi-tenant 
deployments use a different data partitioning strategy that renders the old, single-tenant, data inaccessible. 

* FWoA now reads/writes Elasticsearch documents from aliases instead of indexes. This change simplifies performing re-indexing operations without downtime.
  Aliases are automatically created when resources are written to Elasticsearch, but read operations may fail for existing deployments if the aliases do not exist already.
* Please send 1 update/create request on each resource type existed already to get the aliases created.

### Features

* Implement multi-tenancy and group export
  
  * Multi-tenancy allows a single `fhir-works-on-aws` stack to serve as multiple FHIR servers for different tenants.
  Check out our [multi-tenancy documentation](source/USING_MULTI_TENANCY.md) for more details.

* Use alias for all ES operations 
* **interface:** add logging framework  
* **routing:** Support POST based search 
* **search:** Support number and quantity search syntax 
* **search:** Allow repeated search parameters a.k.a AND search parameters 
* **search:** Allow sorting by date type parameters 
* **search:** Support searching on Period type fields with date type params 
* Add DLQ for ddbToEs sync failures 
* Search now supports `|` as part of token parameters. e.g. `GET [base]/Patient?identifier=http://acme.org/patient|2345`
* Search now supports using range prefixes for date parameters. e.g. `GET [base]/Patient?birthdate=ge2013-03-14`
* The capability statement returned by `/metadata` now includes the detail of all search parameters supported
* Add support for the standard FHIR search parameters. Each FHIR resource type defines its own set of search parameters. i.e the search parameters for Patient can be found [here](https://www.hl7.org/fhir/patient.html#search)
* Search requests using invalid search parameters now return an error instead of an empty result set
* `/metadata` route in API GW so requests for that route doesn't need to be Authenticated/Authorized
* Support for `fhir-works-on-aws-interface` version `4.0.0`
* Change `config` to support new interface. `auth.strategy.oauth` changed to `auth.strategy.oauthPolicy`
    * `authorizationUrl` changed to `authorizationEndpoint`
    * `tokenUrl` changed to `tokenEndpoint`
* Support for `fhir-works-on-aws-authz-rbac` version `4.0.0`
* Support for `fhir-works-on-aws-routing` version `3.0.0`
* Change non-inclusive terminology in serverless.yaml description
* Support ["System Level"](https://hl7.org/fhir/uv/bulkdata/export/index.html#endpoint---system-level-export) export of DB data 

### Bug Fixes

* change output file type 
* dependency vulnerability 
* pin IG download 
* Allow running sls offline with Hapi Validator 
* typo for passing in custom log level 
* **persistence:** `meta` field was missing from update response even though it was persisted properly 
* **persistence:** Improve error logging when sync from ddb to ElasticSearch fails 
* **search:** Token search params were matching additional documents 
* Suppress deprecation warning when writing to Info_Output.yml during installation 
* Fixed a bug where the `meta` field was being overwritten. This allows to properly store meta fields such as `meta.security`, `meta.profile`, etc. 

## [2.1.3] - 2021-04-22
### Added
- fix: Use yarn as package manager and lock down serverless version

## [2.1.2] - 2021-01-11
### Added
- fix: Add DynamoDB table name
- fix: Remove superfluous Cogntio parameter & clean up stage description

## [2.1.1] - 2020-11-10
### Added
- initial solutions package from https://github.com/awslabs/fhir-works-on-aws-deployment@2.1.1
