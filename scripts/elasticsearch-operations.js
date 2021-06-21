/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// Running ES Script
// ACCESS_KEY=<ACCESS_KEY> SECRET_KEY=<SECRET_KEY> ES_DOMAIN_ENDPOINT=<ES_DOMAIN_ENDPOINT> node elasticsearch-operations.js <region> <function to execute> <optional additional params>
//
// Example
//
// ACCESS_KEY=ABCD SECRET_KEY=XYZ ES_DOMAIN_ENDPOINT=https://search-fhir-service-dev-abcd.us-west-2.es.amazonaws.com node elasticsearch-operations.js us-west-2 checkNumberOfShards

const { AmazonConnection, AmazonTransport } = require('aws-elasticsearch-connector');

const { Client } = require('@elastic/elasticsearch');

const AWS = require('aws-sdk');

const region = process.argv[2];

AWS.config.update({
    region,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
});

const esDomainEndpoint = process.env.ES_DOMAIN_ENDPOINT;

const es = new Client({
    node: esDomainEndpoint,
    Connection: AmazonConnection,
    Transport: AmazonTransport,
});

const search = async name => {
    try {
        const response = await es.search({
            index: 'patient',
            body: {
                query: {
                    query_string: {
                        fields: ['id'],
                        query: name,
                    },
                },
            },
        });
        console.log(`Response time: ${response.body.took}`);
        console.log(`Number of hits: ${response.body.hits.total.value}`);
        response.body.hits.hits.forEach(hit => {
            // eslint-disable-next-line no-underscore-dangle
            console.log(JSON.stringify(hit._source, null, 2));
        });
    } catch (error) {
        console.error(error.message);
    }
};

const getIndexMapping = async () => {
    try {
        const params = {
            index: 'patient',
        };
        const response = await es.indices.getMapping(params);
        console.log('Response', JSON.stringify(response, null, 2));
    } catch (error) {
        console.error(error.message);
    }
};

const checkNumberOfShards = async () => {
    try {
        const params = {
            index: 'patient',
            format: 'json',
        };
        const response = await es.cat.shards(params);
        console.log('Response', response);
    } catch (error) {
        console.error(error.message);
    }
};

const setDefaultNumberShardsForIndexes = async () => {
    try {
        const params = {
            name: 'default',
            order: -1,
            template: ['*'],
            body: {
                settings: {
                    number_of_shards: '2',
                    number_of_replicas: '1',
                },
            },
        };
        const response = await es.indices.putTemplate(params);
        console.log('Response', response);
    } catch (error) {
        console.error(error.message);
    }
};

const deleteIndex = async () => {
    try {
        const response = await es.indices.delete({ index: 'patient' });
        console.log('Response', response);
    } catch (error) {
        console.error(error.message);
    }
};

/*
Run the addAlias script once to add aliases for all existing indices

ACCESS_KEY=<ACCESS_KEY> SECRET_KEY=<SECRET_KEY> ES_DOMAIN_ENDPOINT=<ES_DOMAIN_ENDPOINT> node elasticsearch-operations.js <region> addAlias

Example:

ACCESS_KEY=ABCD SECRET_KEY=XYZ ES_DOMAIN_ENDPOINT=https://search-fhir-service-dev-abcd.us-west-2.es.amazonaws.com node elasticsearch-operations.js us-west-2 addAlias

If you do not know the value for ES_DOMAIN_ENDPOINT, you can follow the instruction here(https://github.com/awslabs/fhir-works-on-aws-deployment/blob/mainline/README.md#retrieving-user-variables)
to retrieve serverless info, and find the value for ElasticSearchDomainEndpoint in the output
 */
const addAlias = async () => {
    // Get all indices
    const response = await es.cat.indices({ format: 'json' });
    const indices = response.body.map(indexDetail => indexDetail.index);

    // Check indices for alias
    const checkAlias = indices.map(indexName => {
        return es.indices.existsAlias({
            index: indexName,
            name: `${indexName}-alias`,
        });
    });
    const checkAliasResponse = await Promise.all(checkAlias);

    // Filter out indices without alias
    const aliasesToAdd = checkAliasResponse
        .map((checkAliasResult, index) => {
            return { hasAlias: checkAliasResult.body, indexName: indices[index] };
        })
        .filter(checkResult => !checkResult.hasAlias);

    // Add alias if needed
    if (aliasesToAdd.length === 0) {
        console.log('All indices have alias created, nothing to do.');
    } else {
        console.log(
            `Adding aliases for indices: `,
            aliasesToAdd.map(aliasToAdd => aliasToAdd.indexName),
        );
        const addAliases = aliasesToAdd.map(checkResult => {
            return es.indices.putAlias({ index: checkResult.indexName, name: `${checkResult.indexName}-alias` });
        });
        await Promise.all(addAliases);
        console.log('Aliases added.');
    }
};

const functionToExecute = process.argv[3];
if (functionToExecute === 'search') {
    const name = process.argv[4];
    search(name);
} else if (functionToExecute === 'checkNumberOfShards') {
    checkNumberOfShards();
} else if (functionToExecute === 'setDefaultNumberShardsForIndexes') {
    setDefaultNumberShardsForIndexes();
} else if (functionToExecute === 'deleteIndex') {
    deleteIndex();
} else if (functionToExecute === 'getIndexMapping') {
    getIndexMapping();
} else if (functionToExecute === 'addAlias') {
    addAlias();
}
