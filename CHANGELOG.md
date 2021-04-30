# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.7.0](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v2.6.0...v2.7.0) (2021-04-30)


### Features

* **search:** support Period type fields for date params ([#299](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/299)) ([8132dd6](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/8132dd64e6282988e8faa0bce14c68d1cacc07a1))
* add DLQ for ddbToEs sync failures ([#295](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/295)) ([eb7f51c](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/eb7f51ccffc17ce9ae8111d2127af31764e583f9))
* Add post search and integ tests ([#296](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/296)) ([c6c1db1](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/c6c1db1fc56150e8bd26814bf3254f9897a252de))
* enhance numeric and quantity search ([#291](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/291)) ([e950aca](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/e950acaf3e01b3ce41c37f9f83dd233e5e456fe9))


### Bug Fixes

* increment persistence package ([#300](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/300)) ([3b0ed26](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/3b0ed264a263ebc2852bcadf81b027d6bbdcd58d))
* Suppress deprecation warning when writing to Info_Output.yml during installation ([#294](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/294)) ([462e146](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/462e146ef6c4570707417adfd1c99c81da1e426f))
* update persistence dependency; to fix meta bug ([#288](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/288)) ([2a836a4](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/2a836a4f2cb8590d04558d4e826d2a5d70322bf2))

## [2.6.0] - 2021-04-09

### Added
- Search now supports `|` as part of token parameters. e.g. `GET [base]/Patient?identifier=http://acme.org/patient|2345`
- Search now supports using range prefixes for date parameters. e.g. `GET [base]/Patient?birthdate=ge2013-03-14`
- Fixed a bug where the `meta` field was being overwritten. This allows to properly store meta fields such as `meta.security`, `meta.profile`, etc. 

## [2.5.0] - 2021-03-29

### Added
- Add support for Implementation Guides(IGs).

   IG packages can now be included as part of the deployment. This enables search parameters and validation rules from profiles
   included in the IG. The capability statement is also updated to reflect those changes.

   Check out our [IGs documentation](USING_IMPLEMENTATION_GUIDES.md) for more details.

## [2.4.0] - 2021-01-13

### Added
- The capability statement returned by `/metadata` now includes the detail of all search parameters supported
- Add support for the standard FHIR search parameters. Each FHIR resource type defines its own set of search parameters. i.e the search parameters for Patient can be found [here](https://www.hl7.org/fhir/patient.html#search)
- Search requests using invalid search parameters now return an error instead of an empty result set

## [2.3.0] - 2020-11-20

### Added
- `/metadata` route in API GW so requests for that route doesn't need to be Authenticated/Authorized

### Updated
- Support for `fhir-works-on-aws-interface` version `4.0.0`
- Change `config` to support new interface. `auth.strategy.oauth` changed to `auth.strategy.oauthPolicy`
    - `authorizationUrl` changed to `authorizationEndpoint`
    - `tokenUrl` changed to `tokenEndpoint`
- Support for `fhir-works-on-aws-authz-rbac` version `4.0.0`
- Support for `fhir-works-on-aws-routing` version `3.0.0`
- Change non-inclusive terminology in serverless.yaml description


## [2.2.0] - 2020-11-12

### Added 
- Support ["System Level"](https://hl7.org/fhir/uv/bulkdata/export/index.html#endpoint---system-level-export) export of DB data 

## [2.1.1] - 2020-10-01

### Added 
- chore: Clean up CloudFormation template focusing on reducing reliance on sls

## [2.1.0] - 2020-10-01

### Added
- feat(search): Implement "_include" and "_revinclude" search parameters
- feat(search): Support "_id" search parameter

## [2.0.0] - 2020-09-25

### Added

- fix: Update CloudFormation template to change DynamoDB table key schema
  - BREAKING CHANGE - Without running the required scripts the existing data will not be accessible via the FHIR APIS
  - Please see [sort-key-migration script](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/v1.2.0/scripts/sort-key-migration.js#L6) for instructions
  - If not interested in keeping your data feel free to [delete your existing stack](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-console-delete-stack.html) and deploy a fresh one

## [1.1.0] - 2020-09-11

### Added

- feat: Enable X-ray tracing
- fix: Updated scripts to give correct instructions & clearer READMEs

New committers :tada: @arthuston & @rb2010

## [1.0.0] - 2020-08-31

### Added

- Initial launch! :rocket:
