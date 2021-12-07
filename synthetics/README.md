# Synthetics

[AWS Cloudwatch Synthetics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html) for monitoring FHIR Works on AWS. Synthetics can periodically monitor the real time behavior of fwoa and raise a cloudwatch alert when programatic thresholds are not met.

## Creating a New Synthetic

To create a new synthetic you create your new synthetic javascript code, add your file to be uploaded and finally define your canary and alarm.

1. Add a new *.js file to this directory.
2. Write your nodejs synthetic code.
3. Update ./uploadSyntheticsScriptsToS3.ts to include your new javascript file in the `filenameAndPath` array.
4. Update ../serverless.yaml to include your javascript file in custom.bundle.copyFiles array
5. Update ../cloudformation/synthetics.yaml to define your new Canary.
    a. Make sure to add a DependsOn property with a value set to UploadSyntheticScriptsCustomResource for your Canary.
    b. Make sure your handler name matches your js file name. E.G.: metadata.handler = metadata.js
6. Update ../cloudformation/alarms.yaml to define an alarm for your canary.