import { Client } from '@elastic/elasticsearch';
import AWS from 'aws-sdk';
// @ts-ignore
import { AmazonConnection, AmazonTransport } from 'aws-elasticsearch-connector';
import PromiseAndId, { PromiseType } from './promiseAndId';
import { DOCUMENT_STATUS_FIELD } from '../src/persistence/dataServices/dynamoDbUtil';
import DOCUMENT_STATUS from '../src/persistence/dataServices/documentStatus';

const BINARY_RESOURCE = 'binary';

const { IS_OFFLINE, ELASTICSEARCH_DOMAIN_ENDPOINT } = process.env;

export default class DdbToEsHelper {
    private ElasticSearch: Client;

    constructor() {
        let ES_DOMAIN_ENDPOINT = ELASTICSEARCH_DOMAIN_ENDPOINT || 'https://fake-es-endpoint.com';
        if (IS_OFFLINE === 'true') {
            const { ACCESS_KEY, SECRET_KEY, OFFLINE_ELASTICSEARCH_DOMAIN_ENDPOINT } = process.env;

            AWS.config.update({
                region: 'us-west-2',
                accessKeyId: ACCESS_KEY,
                secretAccessKey: SECRET_KEY,
            });
            ES_DOMAIN_ENDPOINT = OFFLINE_ELASTICSEARCH_DOMAIN_ENDPOINT || 'https://fake-es-endpoint.com';
        }

        this.ElasticSearch = new Client({
            node: ES_DOMAIN_ENDPOINT,
            Connection: AmazonConnection,
            Transport: AmazonTransport,
        });
    }

    async createIndexIfNotExist(indexName: string) {
        try {
            const indexExistResponse = await this.ElasticSearch.indices.exists({ index: indexName });
            if (!indexExistResponse.body) {
                // Create Index
                const params = {
                    index: indexName,
                };
                await this.ElasticSearch.indices.create(params);
                // Set index's "id" field to be type "keyword". This will enable us to do case sensitive search
                const putMappingParams = {
                    index: indexName,
                    body: {
                        properties: {
                            id: {
                                type: 'keyword',
                                index: true,
                            },
                        },
                    },
                };
                await this.ElasticSearch.indices.putMapping(putMappingParams);
            }
        } catch (error) {
            console.log('Failed to check if index exist or create index', error);
        }
    }

    // Actual deletion of the record from ES
    async deleteEvent(image: any): Promise<PromiseAndId | null> {
        console.log('Starting Delete');
        const resourceType = image.resourceType.toLowerCase();

        await this.createIndexIfNotExist(resourceType);

        const { id } = image;
        try {
            const existResponse = await this.ElasticSearch.exists({
                index: resourceType,
                id,
            });

            if (!existResponse.body) {
                console.log('Record with ID does not exist', id);
                return null;
            }

            return {
                promise: this.ElasticSearch.delete({
                    index: resourceType,
                    id: image.id,
                }),
                id: image.id,
                type: 'delete',
            };
        } catch (e) {
            console.log(`Failed to delete ${id}`, e);
            return null;
        }
    }

    // Inserting a new record or editing a record
    async upsertRecordPromises(newImage: any): Promise<PromiseAndId | null> {
        const lowercaseResourceType = newImage.resourceType.toLowerCase();

        await this.createIndexIfNotExist(lowercaseResourceType);

        // We only perform operations on records with documentStatus === AVAILABLE || DELETED
        if (
            newImage[DOCUMENT_STATUS_FIELD] !== DOCUMENT_STATUS.AVAILABLE &&
            newImage[DOCUMENT_STATUS_FIELD] !== DOCUMENT_STATUS.DELETED
        ) {
            return null;
        }

        let type: PromiseType = 'upsert-DELETED';
        if (newImage[DOCUMENT_STATUS_FIELD] === DOCUMENT_STATUS.AVAILABLE) {
            type = 'upsert-AVAILABLE';
        }
        return {
            id: newImage.id,
            promise: this.ElasticSearch.update({
                index: lowercaseResourceType,
                id: newImage.id,
                body: {
                    doc: newImage,
                    doc_as_upsert: true,
                },
            }),
            type,
        };
    }

    // eslint-disable-next-line class-methods-use-this
    isBinaryResource(image: any): boolean {
        const resourceType = image.resourceType.toLowerCase();
        // Don't index binary files
        return resourceType === BINARY_RESOURCE;
    }

    // eslint-disable-next-line class-methods-use-this
    async logAndExecutePromises(promiseAndIds: PromiseAndId[]) {
        const upsertAvailablePromiseAndIds = promiseAndIds.filter(promiseAndId => {
            return promiseAndId.type === 'upsert-AVAILABLE';
        });

        const upsertDeletedPromiseAndIds = promiseAndIds.filter(promiseAndId => {
            return promiseAndId.type === 'upsert-DELETED';
        });

        const deletePromiseAndIds = promiseAndIds.filter(promiseAndId => {
            return promiseAndId.type === 'delete';
        });

        console.log(
            `Operation: upsert-AVAILABLE on resource Ids `,
            upsertAvailablePromiseAndIds.map(promiseAndId => {
                return promiseAndId.id;
            }),
        );

        // We need to execute creation of a resource before execute deleting of a resource,
        // because a resource can be created and deleted, but not deleted then restored to AVAILABLE
        await Promise.all(
            upsertAvailablePromiseAndIds.map(promiseAndId => {
                return promiseAndId.promise;
            }),
        );

        console.log(
            `Operation: upsert-DELETED on resource Ids `,
            upsertDeletedPromiseAndIds.map(promiseAndId => {
                return promiseAndId.id;
            }),
        );

        console.log(
            `Operation: delete on resource Ids `,
            deletePromiseAndIds.map(promiseAndId => {
                return promiseAndId.id;
            }),
        );
        await Promise.all([
            ...upsertDeletedPromiseAndIds.map(promiseAndId => {
                return promiseAndId.promise;
            }),
            ...deletePromiseAndIds.map(promiseAndId => {
                return promiseAndId.promise;
            }),
        ]);
    }
}
