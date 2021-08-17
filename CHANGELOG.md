# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [3.1.0](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v3.0.0...v3.1.0) (2021-08-17)

### Features

* update dependencies ([#411](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/411)) ([57a7266](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/57a72667d6aa9e9b42802babfff545ff52307c15))
  * "interface": [9.1.0](https://github.com/awslabs/fhir-works-on-aws-interface/compare/v9.0.0...v9.1.0)
  * "persistence-ddb": [3.6.1](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb/compare/v3.5.0...v3.6.1)
    * Use bulk ES API for sync with DynamoDB
  * "routing": [5.4.4](https://github.com/awslabs/fhir-works-on-aws-routing/compare/v5.4.1...v5.4.4)
  * "search-es": [3.2.1](https://github.com/awslabs/fhir-works-on-aws-search-es/compare/v3.0.0...v3.2.1)
    * Handle uris correctly, support OR search parameter

### Bug Fixes

* change output file type ([#396](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/396)) ([9aba394](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/9aba394bc27f204e77cc2ca255746fc95d9cbb38))
* dependency vulnerability ([#394](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/394)) ([58ea0ea](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/58ea0ea7607674d5139f3d9a7f81c4b5d2adf930))
* pin IG download ([#372](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/372)) ([8bfd467](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/8bfd467df011c27d998b2866229ec10ec596187a))

## [3.0.0](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v2.8.0...v3.0.0) (2021-06-15)

### ⚠ BREAKING CHANGES

* FWoA now reads/writes Elasticsearch documents from aliases instead of indexes. This change simplifies performing re-indexing operations without downtime.
  Aliases are automatically created when resources are written to Elasticsearch, but read operations may fail for existing deployments if the aliases do not exist already.
* Please run the addAlias [script](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/0f512c2169a8ad4805a82eed09b4196162d2ace2/scripts/elasticsearch-operations.js#L114-L125) created in this [PR](https://github.com/awslabs/fhir-works-on-aws-deployment/pull/346) BEFORE upgrading to 3.0.0 to create aliases for all existing indices 

### Features

* Use alias for all ES operations ([#349](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/349)) ([0f512c2](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/0f512c2169a8ad4805a82eed09b4196162d2ace2))

### Bug Fixes

* Allow running sls offline with Hapi Validator ([#343](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/343)) ([8b98da9](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/8b98da9eaae0e52d64c9150bd0ffc3b71025c2cc))
* typo for passing in custom log level ([#345](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/345)) ([83489a6](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/83489a667746472fc4798bbd484d918fbf9cab45))

## [2.8.0](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v2.7.0...v2.8.0) (2021-05-26)


### Features

* **routing:** add $docref implementation, see documentation [here](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/a1d49fa24d3447167bc55f3fedb862d8e56d092f/USING_IMPLEMENTATION_GUIDES.md#operation-definitions) for more detail. ([#86](https://github.com/awslabs/fhir-works-on-aws-routing/issues/86)) ([105790f](https://github.com/awslabs/fhir-works-on-aws-routing/commit/105790fbd84e1886e000844be8a7fa0ea1d532d6)), closes [#78](https://github.com/awslabs/fhir-works-on-aws-routing/issues/78) [#83](https://github.com/awslabs/fhir-works-on-aws-routing/issues/83) [#85](https://github.com/awslabs/fhir-works-on-aws-routing/issues/85)
* **interface:** add logging framework  ([#65](https://github.com/awslabs/fhir-works-on-aws-interface/issues/65)) ([aa99182](https://github.com/awslabs/fhir-works-on-aws-interface/commit/aa9918297fe3d4e5d5b81efe62c774ccc1083914))


## [2.7.0](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v2.6.0...v2.7.0) (2021-04-30)

### Features

* **routing:** Support POST based search ([#70](https://github.com/awslabs/fhir-works-on-aws-routing/pull/70)) ([0c29a2d](https://github.com/awslabs/fhir-works-on-aws-routing/commit/0c29a2dc9eab953dd64c5cfb18acc48684ce2a71))
* **search:** Support number and quantity search syntax ([#58](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/58)) ([ac5ca42](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/ac5ca42a165bb277b482f763d086a06ae7b8c106)). e.g. `GET [base]/Observation?value-quantity=le5.4|http://unitsofmeasure.org|mg`
* **search:** Allow repeated search parameters a.k.a AND search parameters ([#62](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/62)) ([68f2173](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/68f21733c74c857724ffc1a950303b544aa6601f)). e.g. `GET [base]/Patient?language=FR&language=EN` matches patients who speak English AND French.
* **search:** Allow sorting by date type parameters ([#60](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/60)) ([a7d9bf0](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/a7d9bf02228cf6d2b0efd5de608cd3ee4b5b3089))
* **search:** Support searching on Period type fields with date type params ([#61](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/61)) ([d36e3af](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/d36e3afa7eb549576f9c26911ba602350ca86462))
* Add DLQ for ddbToEs sync failures ([#295](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/295)) ([eb7f51c](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/eb7f51ccffc17ce9ae8111d2127af31764e583f9))

### Bug Fixes

* **persistence:** `meta` field was missing from update response even though it was persisted properly ([#65](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb/issues/65)) ([a2b5206](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb/commit/a2b5206d353c25d464e5290d08d375cb1b6d806e))
* **persistence:** Improve error logging when sync from ddb to ElasticSearch fails ([#68](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb/issues/68)) ([5774b34](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb/commit/5774b3428392d828132bca1b611f02b5c6479d48))
* **search:** Token search params were matching additional documents ([#65](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/65)) ([046238a](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/046238a5fe7c581885769dccf1f47d3f781a642a))
* Suppress deprecation warning when writing to Info_Output.yml during installation ([#294](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/294)) ([462e146](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/462e146ef6c4570707417adfd1c99c81da1e426f))

##### fhir-works-on-aws components detailed diff

- [fhir-works-on-aws-persistence-ddb v3.3.1 -> v3.3.3](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb/compare/v3.3.1...v3.3.3)
- [fhir-works-on-aws-routing v5.1.1 -> v5.2.0](https://github.com/awslabs/fhir-works-on-aws-routing/compare/v5.1.1...v5.2.0)
- [fhir-works-on-aws-search-es v2.3.0 -> v2.5.1](https://github.com/awslabs/fhir-works-on-aws-search-es/compare/v2.3.0...v2.5.1)

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
