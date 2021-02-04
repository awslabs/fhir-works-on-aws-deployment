# FHIR Works on AWS Solution

FHIR Works on AWS is an open source software toolkit that can be used to add capabilities of a FHIR interface to existing healthcare software. It implements a serverless FHIR API that supports the majority of FHIR resource types and the most important operations. It also provides a set of architecture patterns to guide customers and partners through the process of designing and building integrations to their existing systems.

FHIR Works on AWS aims to help software engineers at independent software vendors, system integrators or healthcare customers to enhance their own products to provide access to data in those systems to mobile devices and web portals through integrating the FHIR standard APIs. It also allows these customers and partners to build connectors between their legacy and proprietary interfaces to the current FHIR standard. Finally, it includes guidance on how to customize the default FHIR Works on AWS API to their individual needs with specific FHIR Implementation Guides.

Many integration use cases require the ability to connect to a FHIR interface on one side and to legacy environments on the other. To help customers and partners achieve external legacy connectivity, FHIR Works on AWS includes an Integration Framework. This enables users to create their own Transforms that connect FHIR Works on AWS to any external interface, or to consume others published as open source or to the AWS Marketplace, opening up additional revenue opportunities for the partners creating them. To see an example of this framework please see our [api branch](https://github.com/awslabs/fhir-works-on-aws-deployment/tree/api).

## Deployment

The solution is deployed using a CloudFormation template which installs all necessary resources. For details on deploying the solution please see the details on the solution home page: [FHIR Works on AWS](https://aws.amazon.com/solutions/implementations/fhir-works-on-aws/).

To create a custom build of FHIR Works on AWS, see the [developer instructions](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/mainline/DEVELOPMENT.md) on the mainline branch.

---

Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://www.apache.org/licenses/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.
