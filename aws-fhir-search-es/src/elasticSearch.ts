import AWS from 'aws-sdk';
import { Client } from '@elastic/elasticsearch';
// @ts-ignore
import { AmazonConnection, AmazonTransport } from 'aws-elasticsearch-connector';

const { IS_OFFLINE } = process.env;

let esDomainEndpoint = process.env.ELASTICSEARCH_DOMAIN_ENDPOINT || 'https://fake-es-endpoint.com';
if (IS_OFFLINE === 'true') {
    AWS.config.update({
        region: 'us-west-2',
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_KEY,
    });
    esDomainEndpoint = process.env.OFFLINE_ELASTICSEARCH_DOMAIN_ENDPOINT || 'https://fake-es-endpoint.com';
}

export const ElasticSearch = new Client({
    node: esDomainEndpoint,
    Connection: AmazonConnection,
    Transport: AmazonTransport,
});
