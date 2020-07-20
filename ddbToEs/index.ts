import AWS from 'aws-sdk';
import { Client } from '@elastic/elasticsearch';
// @ts-ignore
import { AmazonConnection, AmazonTransport } from 'aws-elasticsearch-connector';
import DynamoDbUtil, { DOCUMENT_STATUS_FIELD } from '../src/persistence/dataServices/dynamoDbUtil';
import DOCUMENT_STATUS from '../src/persistence/dataServices/documentStatus';

// This is a separate lambda function from the main FHIR API server lambda.
// This lambda picks up changes from DDB by way of DDB stream, and sends those changes to ElasticSearch Service for indexing.
// This allows the FHIR API Server to query ElasticSearch service for search requests
const BINARY_RESOURCE = 'binary';
const REMOVE = 'REMOVE';
const SEPARATOR = '_';
const { IS_OFFLINE, ELASTICSEARCH_DOMAIN_ENDPOINT } = process.env;

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

const ElasticSearch = new Client({
    node: ES_DOMAIN_ENDPOINT,
    Connection: AmazonConnection,
    Transport: AmazonTransport,
});

async function createIndexIfNotExist(indexName: string) {
    try {
        const indexExistResponse = await ElasticSearch.indices.exists({ index: indexName });
        if (!indexExistResponse.body) {
            // Create Index
            const params = {
                index: indexName,
            };
            await ElasticSearch.indices.create(params);
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
            await ElasticSearch.indices.putMapping(putMappingParams);
        }
    } catch (error) {
        console.log('Failed to check if index exist or create index', error);
    }
}

function isBinaryResource(image: any): boolean {
    const resourceType = image.resourceType.toLowerCase();
    // Don't index binary files
    return resourceType === BINARY_RESOURCE;
}

// eslint-disable-next-line consistent-return
async function deleteEvent(image: any): Promise<PromiseAndId | null> {
    console.log('Starting Delete');
    const resourceType = image.resourceType.toLowerCase();

    await createIndexIfNotExist(resourceType);

    const { id } = image;
    try {
        const existResponse = await ElasticSearch.exists({
            index: resourceType,
            id,
        });

        if (!existResponse.body) {
            console.log('Record with ID does not exist', id);
            return null;
        }

        const currentDeleteIdAndPromise = {
            promise: ElasticSearch.delete({
                index: resourceType,
                id: image.id,
            }),
            id: image.id,
        };

        return currentDeleteIdAndPromise;
    } catch (e) {
        console.log(`Failed to delete ${id}`, e);
        return Promise.reject(e);
    }
}

async function upsertRecordPromises(newImage: any): Promise<PromiseAndId | null> {
    const lowercaseResourceType = newImage.resourceType.toLowerCase();

    await createIndexIfNotExist(lowercaseResourceType);

    if (
        newImage[DOCUMENT_STATUS_FIELD] !== DOCUMENT_STATUS.AVAILABLE &&
        newImage[DOCUMENT_STATUS_FIELD] !== DOCUMENT_STATUS.DELETED
    ) {
        return null;
    }

    const idAndUpsertPromise = {
        id: newImage.id,
        promise: ElasticSearch.update({
            index: lowercaseResourceType,
            id: newImage.id,
            body: {
                // doc: DynamoDbUtil.cleanItem(newImage),
                doc: newImage,
                doc_as_upsert: true,
            },
        }),
    };

    return idAndUpsertPromise;
}

exports.handler = async (event: any) => {
    console.log('New operation');
    try {
        const idAndUpsertPromises = [];
        const idAndDeletePromises = [];
        for (let i = 0; i < event.Records.length; i += 1) {
            const record = event.Records[i];
            console.log('EventName: ', record.eventName);

            const ddbJsonImage = record.eventName === REMOVE ? record.dynamodb.OldImage : record.dynamodb.NewImage;
            const image = AWS.DynamoDB.Converter.unmarshall(ddbJsonImage);
            // Don't index binary files
            if (isBinaryResource(image)) {
                console.log('This is a Binary resource. These are not searchable');
                // eslint-disable-next-line no-continue
                continue;
            }

            if (record.eventName === REMOVE) {
                // If staging of a document fails, and we need to rollback, we would delete the document that was staged
                // but never committed
                // eslint-disable-next-line no-await-in-loop
                const idAndDeletePromise = await deleteEvent(image);
                if (idAndDeletePromise) {
                    idAndDeletePromises.push(idAndDeletePromise);
                }
            } else {
                // eslint-disable-next-line no-await-in-loop
                const idAndUpsertPromise = await upsertRecordPromises(image);
                if (idAndUpsertPromise) {
                    // console.log('Updating', editPromise.id);
                    // eslint-disable-next-line no-await-in-loop
                    // await editPromise.promise;
                    // editEsRecordPromises.push(editPromise);
                    idAndUpsertPromises.push(idAndUpsertPromise);
                }
            }
        }

        // TODO make this into a function
        if (idAndDeletePromises.length > 0) {
            console.log(
                'Deleting resource with these ids: ',
                idAndDeletePromises.map(idAndDeletePromise => {
                    return idAndDeletePromise.id;
                }),
            );
            await Promise.all(
                idAndDeletePromises.map(idAndDeletePromise => {
                    return idAndDeletePromise.promise;
                }),
            );
        }

        if (idAndUpsertPromises.length > 0) {
            console.log(
                'Updating resource with these ids: ',
                idAndUpsertPromises.map(idAndUpsertPromise => {
                    return idAndUpsertPromise.id;
                }),
            );
            await Promise.all(
                idAndUpsertPromises.map(idAndUpsertPromise => {
                    return idAndUpsertPromise.promise;
                }),
            );
        }
    } catch (e) {
        console.log('Failed to update ES records', e);
    }
};

interface PromiseAndId {
    promise: Promise<any>;
    id: string;
}
