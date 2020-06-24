const config: Hearth.FhirConfig = {
    orgName: 'Organization Name',
    auth: {
        // Used in Capability Statement Generation only
        strategy: {
            oauthUrl:
                process.env.OAUTH2_DOMAIN_ENDPOINT === '[object Object]' ||
                process.env.OAUTH2_DOMAIN_ENDPOINT === undefined
                    ? 'https://OAUTH2.com'
                    : process.env.OAUTH2_DOMAIN_ENDPOINT,
        },
    },
    server: {
        // When running serverless offline, env vars are expressed as '[object Object]'
        // https://github.com/serverless/serverless/issues/7087
        // As of May 14, 2020, this bug has not been fixed and merged in
        // https://github.com/serverless/serverless/pull/7147
        url:
            process.env.API_URL === '[object Object]' || process.env.API_URL === undefined
                ? 'https://API_URL.com'
                : process.env.API_URL,
    },
    logging: {
        // Unused at this point
        level: 'ERROR',
    },
    //
    // Add any profiles you want to support.  Each profile can support multiple versions
    // This 'resource*' defaults to ALL resources not called out in excludedResources or resources array
    //
    profile: {
        version: '4.0.1', // Currently only supporting 1 FHIR version at a time
        genericResource: {
            searchParam: true,
            operations: ['create', 'read', 'update', 'delete', 'vread'],
            excludedR4Resources: ['Organization', 'Account'],
            versions: ['4.0.1'],
        },
    },
};

export default config;
