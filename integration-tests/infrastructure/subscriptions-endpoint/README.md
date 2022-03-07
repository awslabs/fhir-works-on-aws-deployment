# FHIR Subscriptions Test Endpoint

This small SAM app creates an API (APIGW + Lambda) that can be used as an endpoint in FHIR Subscriptions integration tests.

The Lambda function replies successfully to all requests and records the notification message in DynamoDB. 
The integration tests can query DynamoDB to verify that notifications were received.

To build and deploy your application for the first time, run the following in your shell:

```bash
sam build
sam deploy --guided
```

Use the outputs of the CFN stack as values for the `SUBSCRIPTIONS_NOTIFICATIONS_TABLE` and `SUBSCRIPTIONS_ENDPOINT` environment variables when running the integration tests

