import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import FhirWorksStack from '../lib/cdk-infra-stack';

test('Resources created', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new FhirWorksStack(app, 'MyTestStack');
    // THEN
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const template = Template.fromStack(stack);

    //   template.hasResourceProperties('AWS::SQS::Queue', {
    //     VisibilityTimeout: 300
    //   });
});
