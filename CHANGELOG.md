# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
