const synthetics = require('Synthetics');

const apiCanaryBlueprint = async function () {

    // Handle validation for positive scenario
    const validateSuccessful = async function(res) {
        return new Promise((resolve) => {
            if (res.statusCode < 200 || res.statusCode > 299) {
                throw res.statusCode + ' ' + res.statusMessage;
            }

            res.on('end', () => {
                // Add validation on 'responseBody' here if required.
                resolve();
            });
        });
    };

    // Set request option for Verify /metadata
    const path = "/" + process.env.STAGE + "/metadata";
    const requestOptionsStep1 = {
        hostname: process.env.HOST_NAME,
        method: 'GET',
        path: path,
        port: '443',
        protocol: 'https:',
        body: "",
        headers: {}
    };
    requestOptionsStep1['headers']['User-Agent'] = [synthetics.getCanaryUserAgentString(), requestOptionsStep1['headers']['User-Agent']].join(' ');

    // Set step config option for Verify /metadata
    let stepConfig1 = {
        includeRequestHeaders: false,
        includeResponseHeaders: false,
        includeRequestBody: false,
        includeResponseBody: false,
        restrictedHeaders: [],
        continueOnHttpStepFailure: false
    };

    await synthetics.executeHttpStep('Verify /metadata', requestOptionsStep1, validateSuccessful, stepConfig1);              
};

exports.handler = async () => {
    return await apiCanaryBlueprint();
};