import { CfnParameter, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CdkInfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Define command line parameters
    const stage = new CfnParameter(this, "stage", {
      type: "String",
      description: "The stage for deployment",
      default: "dev",
    });

    const region = new CfnParameter(this, "region", {
      type: "String", 
      description: "The region to which to deploy",
      default: "us-west-2",
    });

    const oauthRedirect = new CfnParameter(this, "oauthRedirect", {
      type: "String",
      default: 'http://localhost',
    });

    const useHapiValidator = new CfnParameter(this, "useHapiValidator", {
      type: "String",
      description: "Whether or not to enable validation of implementation guides",
      default: "false",
    });

    const enableMultiTenancy = new CfnParameter(this, "enableMultiTenancy", {
      type: "String",
      description: "Whether or not to enable a multi tenant deployment",
      default: "false",
    });

    const enableSubscriptions = new CfnParameter(this, "enableSubscriptions", {
      type: "String", 
      description: "Whether or not to enable FHIR Subscriptions",
      default: "false",
    });

    const logLevel = new CfnParameter(this, "logLevel", {
      type: "String",
      description: "Choose what level of information to log",
      default: "error",
    });

    const enableESHardDelete = new CfnParameter(this, "enableESHardDelete", {
      type: "String",
      description: "Whether resources should be hard deleted or not",
      default: "false",
    });

    // define other custom variables here
    const resourceTableName = `resource-db-${stage.valueAsString}`;
    const exportRequestTableName = `export-request-${stage.valueAsString}`;
    const exportRequestTableJobStatusIndex = `jobStatus-index`;

    // Define resources here:
    
  }
}
