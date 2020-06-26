const config: Hearth.FhirConfig = {
    orgName: 'Organization Name',
    auth: {
        strategy: {
            oauthUrl: 'http://example.com',
        },
    },
    server: {
        url: 'http://example.com',
    },
    logging: {
        level: 'DEBUG',
    },
    //
    // Add any profiles you want to support.  Each profile can support multiple versions
    // This 'resource*' defaults to ALL resources not called out in excludedResources or resources array
    //
    profile: {
        version: '4.0.1',
        genericResource: {
            searchParam: true,
            operations: ['create', 'read', 'update', 'delete', 'vread'],
            versions: ['4.0.1'],
        },
    },
};

export default config;
