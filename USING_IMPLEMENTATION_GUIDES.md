# Using FHIR Implementation Guides

FHIR is a platform specification. It describes a general set of capabilities that can be used to solve many healthcare data exchange problems.

FHIR Implementation guides (IG) are used to describe how FHIR is used in a particular context. IGs are distributed as [packages similar to NPM packages](https://confluence.hl7.org/display/FHIR/NPM+Package+Specification)

## Prerequisites

In addition to the prerequisites described on the [INSTALL docs](INSTALL.md), you need the following: 

1. Java 8 or higher. We recommend using [Amazon Corretto](https://aws.amazon.com/corretto/)
2. Maven. https://maven.apache.org/install.html

## Installation Steps

1. Obtain the IG packages that you wish to use.
    
    IG packages can be obtained from different sources. The most common sources are the corresponding official IG website (i.e. the [US Core website](https://www.hl7.org/fhir/us/core/downloads.html))
    or from the [FHIR Package Registry](https://registry.fhir.org/)
   
1. Copy the unzipped Implementation Guides deployment packages to the `implementationGuides` directory
    
    Example:
    ```
    .
    └── implementationGuides/
        ├── hl7.fhir.us.core
        └── hl7.fhir.us.carin-bb
    ```

1. Compile the IGs:
    ```bash
    #fhir-works-on-aws-deployment
    yarn run compile-igs
    ```
1. Deploy the Hapi Validator: 
    ```bash
    #fhir-works-on-aws-deployment/javaHapiValidatorLambda
    mvn clean install
    severless deploy
    ```
1. Deploy the FHIR Works on AWS server: 
    ```bash
    #fhir-works-on-aws-deployment
    serverless deploy --useHapiValidator true
    ```

Note: Additional instructions on how to set up AWS credentials and how to deploy to a specific stage or region are available on the [INSTALL docs](INSTALL.md#manual-installation)

## Supported IGs features in fhir-works-on-aws
Once you apply an Implementation Guide to fhir-works-on-aws, the following changes will take effect: 

### Search Parameters
Additional search parameters described in Implementation Guides will be parsed and made available on the FHIR Works on AWS server.

This consumes the resources of type `SearchParameter` from the IG package

### Input Validation
Input Validation will be enchanced to apply validation rules specific to the profiles defined on the Implementation Guides.
Validation is performed using the [HAPI FHIR Validator](https://hapifhir.io/)

This consumes the resources of type `StructureDefinition`, `StructureDefinition`, and `ValueSet` from the IG package.

### Capability Statement
The Server Capability statement will be updated to reflect the above features. Specifically, the `supportedProfile` field will be populated 
and additional search parameters will have a corresponding `searchParam` entry.
