# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [5.0.0](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v4.3.1...v5.0.0) (2022-07-22)


### ⚠ BREAKING CHANGES

* Move deployment pipeline to CDK (#654). Serverless deployments are still supported, but have been marked as legacy moving forwards. Deployments that already exist can pull this version and still receive all of the bug fixes that are part of this release.

### Features

* Move deployment pipeline to CDK ([#654](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/654)) ([51d9e2c](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/51d9e2c73670e99e9884ad80902b041a6d1c7ee6))


### Bug Fixes

* bundle lambdas in script instead of command line ([#655](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/655)) ([d6d3e00](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/d6d3e00f74161ad33750b360050709ecea2c8f59))
* compiled implementation guides should be copied to the src directory ([#658](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/658)) ([498cdb8](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/498cdb8f04c57f2099b1ca4ee2861c2b7e3b0aef))
* dependencies mismatch for node in install script ([#649](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/649)) ([532c169](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/532c16959c9376a237089bd2d93edbde33bf6862))
* ISSUE-639 enabled reuse of https sockets in the aws-sdk ([#640](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/640)) ([432d4a8](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/432d4a88e74c4bfec5b0374ee21f592aaebaef02))
* Reduced lambda timeout so it's below API gateway timeout ([#625](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/625)) ([4b0fdf6](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/4b0fdf66f94274facf7d7bc14508575b319a58a8))
* remove approval needed for deploy step ([#657](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/657)) ([6b1e82b](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/6b1e82b61b7f29ac0ecf8ac2ab2ae3ce62dc6b7d))
* update paths and include linux esbuild ([#656](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/656)) ([85e7800](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/85e78002f046e058f5bc674e986bdfe52419874b))
* update provisioned concurrency to address cold starts ([#661](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/661)) ([f2969ef](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/f2969ef1b67192773cd4df5c3d54cbdd0369d2dd))

### [4.3.1](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v4.3.0...v4.3.1) (2022-05-04)

### Bug Fixes

* Dependency version bump: simple-git, moment, urjis, async [#608](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/3d6f249bd3f07715c00c2a7b3f75a4b4485f9fb0) [#609](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/65b0552ecc6dd5ebcffb057220377bf90ba15912) [#612](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/0cb2c574d8cad24d53fdbf839da04b79d00da862)

* Clean up unused test files [#618](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/0c414b39d3bcf53e30f6dd272166d9659080129b)

## [4.3.0](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v4.2.0...v4.3.0) (2022-04-06)


### Features

* add Batch bundle support ([#602](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/602)) ([be2b645](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/be2b64598b2522adc8db48a5e6e64366045dad8e))
* strictly validate inclusion search parameters ([#597](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/597)) ([1045876](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/1045876f9aa8a76c02cf0753faeb358f659f871f))


### Bug Fixes

* dependabot alert fix for simple-git ([#599](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/599)) ([467ac05](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/467ac05c0cb088c68f90071ca01520a33b70d851))
* update minimist version ([#600](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/600)) ([46a2ac0](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/46a2ac0aeb9adae5157e2ba4770d55aebd177d4c))

## [4.2.0](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v4.1.0...v4.2.0) (2022-03-08)


### Features

* add support for FHIR Subscriptions ([#573](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/573)) ([3e5fe2c](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/3e5fe2c0f9f83e1340a6d9f1b61243fb814f0086)), closes [#533](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/533) [#543](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/543) [#555](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/555) [#554](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/554) [#558](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/558) [#557](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/557) [#559](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/559) [#569](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/569) [#567](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/567) [#572](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/572) [#574](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/574) [#575](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/575) [#570](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/570) [#577](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/577) [#576](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/576) [#578](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/578) [#579](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/579) [#582](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/582)

  Check out our [Subscriptions documentation](USING_SUBSCRIPTIONS.md) for more details.


* add permissions to BackupRole to allow restore operations ([#556](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/556)) ([34788fb](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/34788fbb0f6b2e2a723c3b645725d3430a7a8bd5))
* **search:** add extension.valueReference to search mappings ([#162](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/162)) ([7fd7057](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/7fd705758f56fb6d725d4acff080b61852bc51df))

### Bug Fixes

* add deletion policy to KMS keys ([#540](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/540)) ([9991809](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/999180972c4160a408b22628f9ef188c77bb6d21))
* **routing:** Use application/fhir+json as default content-type ([#147](https://github.com/awslabs/fhir-works-on-aws-routing/issues/147)) ([0fd1afb](https://github.com/awslabs/fhir-works-on-aws-routing/commit/0fd1afb6a5fbedb29b704edcbda9fc30601b6cd4))
* **routing:** fix content type for .well-known/smart-configuration ([#160](https://github.com/awslabs/fhir-works-on-aws-routing/issues/160)) ([9074b41](https://github.com/awslabs/fhir-works-on-aws-routing/commit/9074b41f842449fe91eb9cae1187474d48a5c616))
* **search:** allow revinclude to return more than 10 resources ([#164](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/164)) ([b1e3a1a](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/b1e3a1aeba2a84b7f5d080ded4024bcb88169c0a))
* **search:** chain parameters should inspect conditions to narrow down possible target types ([#168](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/168)) ([bc805cb](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/bc805cb3339a29d2f5c80bdb9a08ce425c90e752))

##### fhir-works-on-aws components detailed diff

- [fhir-works-on-aws-persistence-ddb v3.9.0 -> v3.10.1](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb/compare/v3.9.0...v3.10.1)
- [fhir-works-on-aws-routing v6.3.0 -> v6.4.1](https://github.com/awslabs/fhir-works-on-aws-routing/compare/v6.3.0...v6.4.1)
- [fhir-works-on-aws-search-es v3.9.2 -> v3.11.0](https://github.com/awslabs/fhir-works-on-aws-search-es/compare/v3.9.2...v3.11.0)

## [4.1.0](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v4.0.0...v4.1.0) (2021-12-13)


### Features

* add custom resource to update search mappings ([#474](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/474)) ([e941aa7](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/e941aa74e38a24373b90e520f689e3e8d7c24689))
* add jobOwnerId as metadata on export results ([#491](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/491)) ([80a5cac](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/80a5cac6202ae96600129dbb8d2f0e0ca8129d58))
* add transitive reference to group export ([#475](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/475)) ([3c4c57e](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/3c4c57efb0d3608a7e8c4154bc8e448c14def7b8))
* allow async creation of FhirConfig ([#464](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/464)) ([248356f](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/248356f032dd3bd2a73b71f7f8d9acffbd098f26))
* bump search version to 3.9.2 ([#520](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/520)) ([401e97d](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/401e97d9788a8998fbea707b80d5a0dd1aede87c))
* enable id only searching for reference types ([#424](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/424)) ([4998d7d](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/4998d7db8c5e4a54bef49d37e904406f710a695c))
* update ES to 7.10 and utilize Graviton instances for EC2 clusters ([#430](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/430)) ([3a55bf3](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/3a55bf39fe97817a49ddc6820d8e48b8bb6a8494))
* Wire SNS topic to Ok & AlarmActions from cloudwatch alarms ([#447](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/447)) ([50871c5](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/50871c5e7666921678a2548d169968f6b3953199))


### Bug Fixes

* Add server side encryption to the AuditLogsBucket ([#418](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/418)) ([016876d](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/016876d390a499200e0c91cea6e789e8d3e8c04f))
* Add SNS encryption for FhirWorksAlarm ([#462](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/462)) ([9809087](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/9809087dea116173a279c667c069a0d8bab4198d))
* bulk export script ([#482](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/482)) ([caaf57d](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/caaf57def2302509d36ad68ef9fc364a29211633))
* fix bouncing results issue ([#502](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/502)) ([7e3eff6](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/7e3eff632a244dd1f126ba747969ad8a2a83bf3f))
* Fix CloudWatch LogGroup name for auditLogMover ([#503](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/503)) ([be8bbf6](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/be8bbf65a9f43d0bd27d2d82f73dd29271d3d47f))
* Fix Implentation guide integration test ([#467](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/467)) ([421f1db](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/421f1db026442750ac357665292d2557fbc891b1))
* give Glue IAM Role access to KMS keys ([#450](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/450)) ([2bf0b76](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/2bf0b76c881d0d774a7bd430d586f5bd5cb1fe3f))
* glue export security name not unique ([#514](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/514)) ([bafcaf4](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/bafcaf4c6da3e75cb7cc2d907d8ca636b6e157a8))
* group export with group last updated before _since ([#437](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/437)) ([1499b52](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/1499b524a73a399f4746d7bc8e1597cd8e93b1ab))
* handle when failures happen in bulk export ([#452](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/452)) ([6a8381c](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/6a8381c32a683830543a9071509253134938f91b))
* Patient compartment array inclusion in group export ([#455](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/455)) ([b2c9fee](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/b2c9feec1d2a11060c694370ce80a7a83e0c0172))
* update ElasticSearch type to have more region support ([#484](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/484)) ([ca8e5ce](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/ca8e5ce82a7eea2b2bcef929226a4f0aa24481dd))
* use correct content-type on s3 export results ([#496](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/496)) ([196ecde](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/196ecde06442b75676661bc0c27f29c997655bc9))

### Security Fixes

* bump log4j-core from 2.13.2 to 2.15.0 in /javaHapiValidatorLambda

## [4.0.0](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v3.1.0...v4.0.0) (2021-08-18)


### ⚠ BREAKING CHANGES

* The Cognito `IdToken` is now used instead of the `AccessToken` to authorize requests.

Multi-tenancy itself is not a breaking change, you can continue to use FHIR works on single-tenant mode 
by not using the `enableMultiTenancy` flag. 
  
However, note that updating an existing (single-tenant) stack to enable multi-tenancy is a breaking change. Multi-tenant 
deployments use a different data partitioning strategy that renders the old, single-tenant, data inaccessible. 

### Features

* Implement multi-tenancy and group export ([#416](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/416)) ([a9aebcc](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/a9aebcc182255d305327463b1b2e0f7a463bad95)), closes [#348](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/348) [#347](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/347) [#367](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/367) [#381](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/381) [#387](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/387) [#384](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/384) [#389](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/389) [#392](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/392) [#397](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/397) [#393](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/393) [#398](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/398) [#399](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/399) [#400](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/400)
  
  Multi-tenancy allows a single `fhir-works-on-aws` stack to serve as multiple FHIR servers for different tenants.
  Check out our [multi-tenancy documentation](USING_MULTI_TENANCY.md) for more details.

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
