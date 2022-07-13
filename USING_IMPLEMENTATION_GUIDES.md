# Using FHIR Implementation Guides

An [Implementation Guide (IG)](https://www.hl7.org/fhir/implementationguide.html) is a set of rules that describe how FHIR resources should be used to solve a particular problem. Using IGs, you can make your FHIR server compliant for country-specific set of rules. IGs can also describe a proper way to represent particular content in FHIR (for example, the breast cancer medical diagnostic process).

IGs are distributed as [packages similar to NPM packages](https://confluence.hl7.org/display/FHIR/NPM+Package+Specification)

## Prerequisites

The prerequisites for FHIR IGs are same as in the FHIR [installation documentation](INSTALL.md). In addition, you need the following:

1. Java 8 or higher. We recommend using [Amazon Corretto](https://aws.amazon.com/corretto/)
2. [Maven](https://maven.apache.org/install.html)

## Installation Steps

1. Download the IG packages. IG packages can be downloaded from different sources. The most common sources are the corresponding official IG website (for example, [download](https://www.hl7.org/fhir/us/core/package.tgz) from the [US Core website](https://www.hl7.org/fhir/us/core/downloads.html) or the [FHIR Package Registry](https://registry.fhir.org/).

1. Copy the unzipped IG deployment packages to the `implementationGuides` directory

   Example:

   ```
   .
   └── implementationGuides/
       ├── hl7.fhir.us.core
       └── hl7.fhir.us.carin-bb
   ```

1. Compile the IGs using the `compile-igs` command:
   ```bash
   #fhir-works-on-aws-deployment
   yarn run compile-igs
   ```
   **Note:** This command needs to be invoked in the top level directory of the cloned `fhir-works-on-aws-deployment` repository
1. Deploy the Hapi Validator using the following commands:
   ```bash
   #fhir-works-on-aws-deployment/javaHapiValidatorLambda
   cd javaHapiValidatorLambda
   mvn clean install
   ```
   **Note:** By default the Hapi Validator is set up with FHIR R4. If you want to use FHIR STU3, follow the
   comments on [pom.xml](javaHapiValidatorLambda/pom.xml) to update the dependencies and deploy using the `fhirVersion` parameter:
   ```bash
   #fhir-works-on-aws-deployment/javaHapiValidatorLambda
   yarn deploy -c fhirVersion="3.0.1"
   ```
1. Deploy the FHIR Works on AWS server using the `deploy` command (after navigating back to the top level directory of the cloned repository):
   ```bash
   #fhir-works-on-aws-deployment
   cd ..
   yarn deploy -c useHapiValidator=true --all
   ```

Note: For more information on how to set up AWS credentials or how to deploy to a specific stage or region, refer to the [installation documentation](INSTALL.md#manual-installation)

## Supported IG features in FHIR Works on AWS

After you apply an Implementation Guide to FHIR Works on AWS, the following changes are effective:

### Search Parameters

Additional search parameters described in IGs are parsed and available on the FHIR Works on AWS server.

For example, when US Core IG is applied, the patient details are searched by ethnicity using the ethnicity search parameter `GET <API_endpoint>/Patient?ethnicity=<etnicity_code>`.

Search parameters are built using the resources of type SearchParameter available in the IG package.

### Input Validation

Input validation is enhanced to apply validation rules specific to the profiles defined on the IGs. Validation is performed using the [HAPI FHIR Validator](https://hapifhir.io/).

For example, applying the US Core IG adds the [us-core-patient profile](https://www.hl7.org/fhir/us/core/StructureDefinition-us-core-patient.html) which adds validation rules for patients, such as rejecting patients with a missing gender field, or patients with ethnicity information that do not conform to the definition of the `us-core-ethnicity` extension.

The following code snippet displays a valid US core patient:

```
{
  "resourceType": "Patient",
  "id": "example",
  "meta": {
    "profile": [
      "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
    ]
  },
  "extension": [
    {
      "extension": [
        {
          "url": "ombCategory",
          "valueCoding": {
            "system": "urn:oid:2.16.840.1.113883.6.238",
            "code": "2135-2",
            "display": "Hispanic or Latino"
          }
        },
        {
          "url": "text",
          "valueString": "Hispanic or Latino"
        }
      ],
      "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity"
    }
  ],
  "identifier": [
    {
      "use": "usual",
      "type": {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
            "code": "MR",
            "display": "Medical Record Number"
          }
        ],
        "text": "Medical Record Number"
      },
      "system": "http://hospital.smarthealthit.org",
      "value": "1032702"
    }
  ],
  "name": [
    {
      "family": "Shaw",
      "given": [
        "Amy",
        "V."
      ]
    }
  ],
  "gender": "female"
}
```

Input validation utilizes the resources of type `StructureDefinition`, `ValueSet`, and `CodeSystem` available in the IG package.

### Operation Definitions
Implementation Guides may contain `OperationDefinition` resources. These resources describe new operations. It is not possible to automatically generate the implementation of an operation, they must be manually implemented.  

Applying an Implementation Guide will enable the operations defined in it if there is a matching implementation available in FHIR Works on AWS.

At this moment The only operation available is [$docref from US Core](http://www.hl7.org/fhir/us/core/OperationDefinition-docref.html). 
Our $docref implementation has the limitation that it can only search for existing documents, it cannot generate documents on the fly.

The $docref source code can be found [here](https://github.com/awslabs/fhir-works-on-aws-routing/tree/mainline/src/operationDefinitions/USCoreDocRef) and it is a good example of how to add new operations to FHIR Works on AWS.

### Capability Statement

The server capability statement returned by `GET <API_endpoint>/metadata` is updated to reflect the above features. Specifically, the `supportedProfile` field is populated and additional search parameters have a corresponding `searchParam` entry.

For example, after applying the US Core IG, the fragment of the capability statement related to the patient resource is updated to include the following:

```
{
  "type": "Patient",
  "supportedProfile": [
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
  ],
  "searchParam": [
    {
      "name": "ethnicity",
      "definition": "http://hl7.org/fhir/us/core/SearchParameter/us-core-ethnicity",
      "type": "token",
      "documentation": "Returns patients with an ethnicity extension matching the specified code."
    },
    ...
  ],
  ...
}
```
