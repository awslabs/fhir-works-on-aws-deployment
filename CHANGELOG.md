# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2020-09-25

### Added

- fix: Update CFN to change Dynamo sort key
  - This requires running the [sort-key-migration script](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/v1.2.0/scripts/sort-key-migration.js#L6)
  - If not interested in keeping your data feel free to [delete your existing stack](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-console-delete-stack.html) and deploy a fresh one

## [1.1.0] - 2020-09-11

### Added

- feat: Enable X-ray tracing
- fix: Updated scripts to give correct instructions & clearer READMEs

New committers :tada: @arthuston & @rb2010

## [1.0.0] - 2020-08-31

### Added

- Initial launch! :rocket:
