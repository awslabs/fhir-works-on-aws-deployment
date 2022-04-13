import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as CdkInfra from '../lib/cdk-infra-stack';

test('Resources created', () => {
  const app = new cdk.App();
    // WHEN
  const stack = new CdkInfra.CdkInfraStack(app, 'MyTestStack');
    // THEN
  const template = Template.fromStack(stack);

//   template.hasResourceProperties('AWS::SQS::Queue', {
//     VisibilityTimeout: 300
//   });
});
