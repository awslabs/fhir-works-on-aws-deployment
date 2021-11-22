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
}
