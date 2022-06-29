# Contributing Guidelines

Thank you for your interest in contributing to our project. Whether it's a bug report, new feature, correction, or additional
documentation, we greatly value feedback and contributions from our community.

Please read through this document before submitting any issues or pull requests to ensure we have all the necessary
information to effectively respond to your bug report or contribution.

## Code development and testing

### Prerequisites for development

Code for FHIR Works on AWS is written in TypeScript. This requires your IDE to be able to handle and work with TypeScript. Make sure your IDE displays TS properly

> https://medium.com/@netczuk/even-faster-code-formatting-using-eslint-22b80d061461

### AWS Cloud deployment

In order to re-build and re-deploy services to AWS after changes were made, you can run CDK commands (like [cdk deploy](https://docs.aws.amazon.com/cdk/v2/guide/cli.html) directly from this deployment package. If you need more help please check in [AWS service deployment](./INSTALL.md#aws-service-deployment).

### Local deployment

It can be quicker to deploy the FHIR API locally to test instead of running a complete Cloud based deployment. This deployment is temporary and will not be listening to further connection attempts once the local service is stopped. You can follow [this guide](https://docs.aws.amazon.com/cdk/v2/guide/cli.html) to deploy locally with the AWS SAM CLI. You may need to define the appropriate environment variables if they are not already defined:
* ACCESS_KEY (This is your AWS Access Key)
* SECRET_KEY (This is your AWS Secret Key)
* OFFLINE_BINARY_BUCKET
* OFFLINE_ELASTICSEARCH_DOMAIN_ENDPOINT
Some of these values can all be found in the output of the deploy command, or in the `INFO_OUTPUT.log` file:
* FHIR_SERVER_BINARY_BUCKET
* ELASTIC_SEARCH_DOMAIN_ENDPOINT


Once you start the server locally, take note of the API Key that is generated. When making a request to the local server, you will need that key for the header _x-api-key_. The key can be found under the API Gateway service in the AWS Console.

## Reporting Bugs/Feature Requests

We welcome you to use the GitHub issue tracker to report bugs or suggest features.

When filing an issue, please check existing open, or recently closed, issues to make sure somebody else hasn't already
reported the issue. Please try to include as much information as you can. Details like these are incredibly useful:

- A reproducible test case or series of steps
- The version of our code being used
- Any modifications you've made relevant to the bug
- Anything unusual about your environment or deployment

## Contributing via Pull Requests

Contributions via pull requests are much appreciated. Before sending us a pull request, please ensure that:

1. You are working against the latest source on the _develop_ branch.
2. You check existing open, and recently merged, pull requests to make sure someone else hasn't addressed the problem already.
3. You open an issue to discuss any significant work - we would hate for your time to be wasted.

To send us a pull request, please:

1. Fork the repository.
2. Modify the source; please focus on the specific change you are contributing. If you also reformat all the code, it will be hard for us to focus on your change.
3. Ensure local tests pass.
4. Commit to your fork using clear commit messages.
5. Send us a pull request, answering any default questions in the pull request interface. When creating your pull request, please choose `develop` as the base branch instead of `mainline`.
6. Pay attention to any automated CI failures reported in the pull request, and stay involved in the conversation.

GitHub provides additional document on [forking a repository](https://help.github.com/articles/fork-a-repo/) and
[creating a pull request](https://help.github.com/articles/creating-a-pull-request/).

## Finding contributions to work on

Looking at the existing issues is a great way to find something to contribute on. As our projects, by default, use the default GitHub issue labels (enhancement/bug/duplicate/help wanted/invalid/question/wontfix), looking at any 'help wanted' issues is a great place to start.

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](https://aws.github.io/code-of-conduct).
For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq) or contact
opensource-codeofconduct@amazon.com with any additional questions or comments.

## Security issue notifications

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public github issue.

## Licensing

See the [LICENSE](LICENSE) file for our project's licensing. We will ask you to confirm the licensing of your contribution.
