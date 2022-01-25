# Subscriptions

The FHIR Subscription resource is used to define a push-based subscription from a server to another system. 
Once a subscription is registered with the server, the server checks every resource that is created or updated, 
and if the resource matches the given criteria, it sends a message on the defined "channel" so that another system can take an appropriate action.

## Enabling multi-tenancy

Subscriptions are an opt-in feature. Enabling subscriptions incurs a cost even if there are no active subscriptions. 

To enable it, follow the steps below:
  
1. Update the method `getAllowListedSubscriptionEndpoints` in `src/subscriptions/allowList.ts` to include endpoints allowed for recieving subscriptions.

2. Use the `enableSubscriptions` option when deploying the stack

    ```bash
    serverless deploy --enableSubscriptions true
    ```

## Supported Subscriptions

Subscriptions satisfying the following restrictions are supported:

1. channel.type must be rest-hook 
2. channel.endpoint must be allow-listed
3. channel.endpoint must use HTTPS
4. channel.payload must be application/fhir+json if present.
5. channel.criteria must be a valid search query that is supported by FWoA.
6. status must be requested or off
7. Number of active Subscriptions does not exceed 300