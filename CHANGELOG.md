# Changelog

All notable changes to this project will be documented in this file.

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
