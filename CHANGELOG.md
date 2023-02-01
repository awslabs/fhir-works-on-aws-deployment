# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [3.1.2-smart](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v3.1.1-smart...v3.1.2-smart) (2023-01-26)


### Bug Fixes

* add optional input validation ([#800](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/800)) ([67e5846](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/67e584614cb0a71c49f30a2fe7502e23d407b550))
* update documentation for postman collection and environment ([#764](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/764)) ([26eb3d5](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/26eb3d5c7bbdcee7128e012616a8d42180b42185))
* added Documentation, S3 versioning, and enforce https ([#796](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/764)) ([9861f00](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/9861f007e57da13b491fa7354210646356e3c358))
* enableBackup no longer breaks deployment ([#792](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/764)) ([b48c3fe](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/b48c3fec742cfb8127bce2cdff21d3d0350de27a))

### Dependency Updates

* **fhir-works-on-aws-routing** 
  * v6.6.1 -> v6.6.2 (See [Changelog](https://github.com/awslabs/fhir-works-on-aws-routing/blob/mainline/CHANGELOG.md))
* **fhir-works-on-aws-authz-smart** 
  * v3.1.3 -> v3.1.4 (See [Changelog](https://github.com/awslabs/fhir-works-on-aws-authz-smart/blob/mainline/CHANGELOG.md))
* **fhir-works-on-aws-interface**
  * v12.1.0 -> v12.1.1 (See [Changelog](https://github.com/awslabs/fhir-works-on-aws-interface/blob/mainline/CHANGELOG.md))

## [3.1.1-smart](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v3.1.0-smart...v3.1.1-smart) (2022-09-12)


### Bug Fixes

* update authz-smart package ([#694](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/694)) ([1d92102](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/1d9210232292de04a0edf9ef1847bde00262bba1))

## [3.1.0-smart](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v3.0.0-smart...v3.1.0-smart) (2022-09-09)


### Features

* **persistence:** Issue 674 added support for up to 100 items in a FHIR transaction ([#153](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb/issues/153)) ([32242ce](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb/commit/32242ce1fa6315229b00efd67928384466ac3d5e))

* **routing:** Issue 674 support for up to 100 entries in a FHIR transaction ([#170](https://github.com/awslabs/fhir-works-on-aws-routing/issues/170)) ([6048e17](https://github.com/awslabs/fhir-works-on-aws-routing/commit/6048e17b69ed56b6aea3a74ce96553294763f5e8))

### Bug Fixes

* **routing:** Throw error if url and POSTed resourceType do not match ([#172](https://github.com/awslabs/fhir-works-on-aws-routing/issues/172)) ([b1bd6e4](https://github.com/awslabs/fhir-works-on-aws-routing/commit/b1bd6e4b6772ff82a2450ce8bf073c10d2201bbd))

* **authz-smart:** only allow scopes to be returned iff it matches resourceType ([#88](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/88)) ([18b059e](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/18b059e2eac0cb7583fcc190d00a9c5f555abcdb))

## [3.0.0-smart](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v2.5.1-smart...v3.0.0-smart) (2022-07-29)


### ⚠ BREAKING CHANGES

* move deployment pipeline to CDK (#664). Serverless deployments are still supported, but have been marked as legacy moving forwards. Deployments that already exist can pull this version and still receive all of the bug fixes that are part of this release.

### Features

* move deployment pipeline to CDK ([#664](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/664)) ([7ed40d9](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/7ed40d94b6739e737fa8f240b19d41591278c2d1))


### Bug Fixes

* update inferno test selectors ([#666](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/666)) ([4bc82a6](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/4bc82a6a3a3958a0163bf9f35636a8a166dac9d2))

## [2.5.1-smart](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v2.5.0-smart...v2.5.1-smart) (2022-05-04)

### Fixes

* Remove unused test files [#619](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/04158c86d78ce23f619adac25999a17cb389577b)

## [2.5.0-smart](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v2.4.0-smart...v2.5.0-smart) (2022-04-06)


### Features

* add batch bundle support ([#605](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/605)) ([f231c86](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/f231c86e1c398ee6aed5cf61c7af82d943595566))
* strictly validate inclusion search parameters ([#597](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/597)) ([1045876](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/1045876f9aa8a76c02cf0753faeb358f659f871f))

## [2.4.0-smart](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v2.3.0-smart...v2.4.0-smart) (2022-03-08)

### Features

* add support for FHIR subscriptions ([#585](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/585)) ([3ed101b](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/3ed101babe86845d8148e0e7c0836cc908fe8449)), closes [#579](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/579) [#582](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/582)

  Check out our [Subscriptions documentation](USING_SUBSCRIPTIONS.md) for more details.


* **search:** add extension.valueReference to search mappings ([#162](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/162)) ([7fd7057](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/7fd705758f56fb6d725d4acff080b61852bc51df))

### Bug Fixes

* **routing:** Use application/fhir+json as default content-type ([#147](https://github.com/awslabs/fhir-works-on-aws-routing/issues/147)) ([0fd1afb](https://github.com/awslabs/fhir-works-on-aws-routing/commit/0fd1afb6a5fbedb29b704edcbda9fc30601b6cd4))
* **routing:** fix content type for .well-known/smart-configuration ([#160](https://github.com/awslabs/fhir-works-on-aws-routing/issues/160)) ([9074b41](https://github.com/awslabs/fhir-works-on-aws-routing/commit/9074b41f842449fe91eb9cae1187474d48a5c616))
* **search:** allow revinclude to return more than 10 resources ([#164](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/164)) ([b1e3a1a](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/b1e3a1aeba2a84b7f5d080ded4024bcb88169c0a))
* **search:** chain parameters should inspect conditions to narrow down possible target types ([#168](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/168)) ([bc805cb](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/bc805cb3339a29d2f5c80bdb9a08ce425c90e752))

##### fhir-works-on-aws components detailed diff

- [fhir-works-on-aws-persistence-ddb v3.9.0 -> v3.10.1](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb/compare/v3.9.0...v3.10.1)
- [fhir-works-on-aws-routing v6.3.0 -> v6.4.1](https://github.com/awslabs/fhir-works-on-aws-routing/compare/v6.3.0...v6.4.1)
- [fhir-works-on-aws-search-es v3.9.2 -> v3.11.0](https://github.com/awslabs/fhir-works-on-aws-search-es/compare/v3.9.2...v3.11.0)

## [2.3.0-smart](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v2.2.0-smart...v2.3.0-smart) (2021-12-13)


### Features

* add jobOwnerId as metadata on export results ([#493](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/493)) ([8a49209](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/8a49209e953bfab9e949a2b182c6ce2a0891b8f4))
* add transitive reference to group export ([#475](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/475)) ([#480](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/480)) ([1c1aab0](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/1c1aab0e79c205e7a6b5ae8a3ca59d28e55f7c7f))
* allow async creation of FhirConfig ([#465](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/465)) ([c88e559](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/c88e559cd1097ffac4536cdcfeddfe211c66cd01))
* bump search version to 3.9.2  ([#524](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/524)) ([2e3ee80](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/2e3ee80562f1ed5561618d308404e9e0633b1e2e)), closes [#520](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/520)
* Chained parameter, ES logging, SQS encryption ([#510](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/510)) ([5a30027](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/5a300270d757f089eab789fd84c7d72ada332e47)), closes [#504](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/504) [#500](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/500)
* Merge in changes from `mainline` ([#478](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/478)) ([d975e7b](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/d975e7b33cb3f8f0c2b91951f141303874d46d75)), closes [#441](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/441)


### Bug Fixes

* fix bouncing results issue ([#502](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/502))  ([#507](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/507)) ([8e45219](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/8e45219a2001ebc67e5c62afb2ae33c586b4cdb1))
* Fix CloudWatch LogGroup name for auditLogMover ([#503](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/503)) ([#506](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/506)) ([1343aad](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/1343aade24ed7c5435ed4bbc0f21d9d47af9c8f2))
* Fix Implentation guide integration test ([#467](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/467)) ([#471](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/471)) ([cabf73d](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/cabf73df6bdc9c501c40b6c3d3dec04d36601aef))
* group export ([#460](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/460)) ([4d86104](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/4d861046e27bd22794a9e1f616c4a81dbd95fde5))
* update ElasticSearch type to have more region support ([#488](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/488)) ([a11989c](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/a11989c29e024ad8ef23ec209de93bf070c63734))
* use correct content-type on s3 export results ([#497](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/497)) ([a65f6ec](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/a65f6ec70bc52ef0a0c29bf6e44ec12b1717aad4))


### Security Fixes

* bump log4j-core from 2.13.2 to 2.15.0 in /javaHapiValidatorLambda

## [2.2.0-smart](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v2.1.0-smart...v2.2.0-smart) (2021-08-24)


### Features

* implement multi-tenancy and group export  ([#421](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/421)) ([5335807](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/5335807c1b295b3929b9259020b5d297c0a9ecac)), closes [#367](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/367) [#382](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/382) [#389](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/389) [#397](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/397) [#398](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/398) [#400](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/400) [#387](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/387) [#393](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/393)
  
  Multi-tenancy allows a single `fhir-works-on-aws` stack to serve as multiple FHIR servers for different tenants.
  Check out our [multi-tenancy documentation](USING_MULTI_TENANCY.md) for more details.
  
  **NOTE:** Multi-tenancy itself is not a breaking change, you can continue to use FHIR works on single-tenant mode 
  by not using the `enableMultiTenancy` flag. 
  However, note that updating an existing (single-tenant) stack to enable multi-tenancy is a breaking change. Multi-tenant 
  deployments use a different data partitioning strategy that renders the old, single-tenant, data inaccessible. 

## [2.1.0-smart](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v2.0.0-smart...v2.1.0-smart) (2021-08-17)


### Features

* Update dependencies ([#410](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/410)) ([0bbbad3](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/0bbbad3aa6dbdd84d2ee7e9303f020a5fab5531f))
  * "authz-smart": [2.1.1](https://github.com/awslabs/fhir-works-on-aws-authz-smart/compare/v2.0.0...v2.1.1)
    * Ability to use token introspection instead of jwt verification
  * "interface": [9.1.0](https://github.com/awslabs/fhir-works-on-aws-interface/compare/v9.0.0...v9.1.0)
  * "persistence-ddb": [3.6.1](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb/compare/v3.5.0...v3.6.1)
    * Use bulk ES API for sync with DynamoDB
  * "routing": [5.4.4](https://github.com/awslabs/fhir-works-on-aws-routing/compare/v5.4.1...v5.4.4)
  * "search-es": [3.2.1](https://github.com/awslabs/fhir-works-on-aws-search-es/compare/v3.0.0...v3.2.1)
    * Handle uris correctly, support OR search parameter

## [2.0.0-smart](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v1.1.0-smart...v2.0.0-smart) (2021-06-25)

### ⚠ BREAKING CHANGES

* FWoA now reads/writes Elasticsearch documents from aliases instead of indexes. This change simplifies performing re-indexing operations without downtime. Aliases are automatically created when resources are written to Elasticsearch, but read operations may fail for existing deployments if the aliases do not exist already.
* Please run the addAlias [script](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/0f512c2169a8ad4805a82eed09b4196162d2ace2/scripts/elasticsearch-operations.js#L114-L125) created in this [PR](https://github.com/awslabs/fhir-works-on-aws-deployment/pull/346) BEFORE upgrading to 2.0.0-smart to create aliases for all existing indices

### Features

* update smart dependency ([#365](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/365)) ([76e6382](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/76e6382d74f19112aeb4d8693aff0314993b4c96))
* merge in changes from `mainline` ([#364](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/364)) ([61393be](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/61393beac364fd6155020b8e8f9ba097e2c8c6e7))

### Bug Fixes

* implementation guides & deployment pipeline ([#282](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/282)) ([75f882b](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/75f882b327c74d2c94f250fc87fe85af542c9719))

## [1.1.0-smart](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v1.0.0-smart...v1.1.0-smart) (2021-02-12)

### Features

- Add support for Implementation Guides(IGs) ([#266](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/266))

   IG packages can now be included as part of the deployment. This enables search parameters and validation rules from profiles
   included in the IG. The capability statement is also updated to reflect those changes.

   Check out our [IGs documentation](USING_IMPLEMENTATION_GUIDES.md) for more details.

## [1.0.0-smart](https://github.com/awslabs/fhir-works-on-aws-deployment/compare/v2.4.0...v1.0.0-smart) (2021-02-12)

- Major version bump! :rocket:

### Features

- Add OAuth2 support for SMART on FHIR ([#125](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/125)) ([be54305](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/be54305908ebbed1a7d84dc78ba015d93c7b78d7))
- Merge in updates from mainline & update SMART ([#193](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/193)) ([43f4834](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/43f48342e5b4d1843a29248d7dc0217be36b4866))
- Smart well known config ([#157](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/157)) ([b1a1382](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/b1a13829f1a753ae592dee84d8a7b8c6a3a2e36f))
- Update dependencies and remove needless table ([#204](https://github.com/awslabs/fhir-works-on-aws-deployment/issues/204)) ([c80a29b](https://github.com/awslabs/fhir-works-on-aws-deployment/commit/c80a29ba3a485e35ce39304b405bf67e35b415a8))
