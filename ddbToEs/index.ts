import AWS from 'aws-sdk';
import { Client } from '@elastic/elasticsearch';
// @ts-ignore
import { AmazonConnection, AmazonTransport } from 'aws-elasticsearch-connector';
import DynamoDbUtil, { DOCUMENT_STATUS_FIELD } from '../src/dataServices/ddb/dynamoDbUtil';
import DOCUMENT_STATUS from '../src/dataServices/ddb/documentStatus';

// This is a separate lambda function from the main FHIR API server lambda.
// This lambda picks up changes from DDB by way of DDB stream, and sends those changes to ElasticSearch Service for indexing.
// This allows the FHIR API Server to query ElasticSearch service for search requests
const BINARY_RESOURCE = 'binary';
const { ELASTICSEARCH_DOMAIN_ENDPOINT } = process.env;
const REMOVE = 'REMOVE';
const SEPARATOR = '_';

const elasticSearch = new Client({
    node: ELASTICSEARCH_DOMAIN_ENDPOINT,
    Connection: AmazonConnection,
    Transport: AmazonTransport,
});

async function createIndexIfNotExist(indexName: string) {
    try {
        const indexExistResponse = await elasticSearch.indices.exists({ index: indexName });
        if (!indexExistResponse.body) {
            // Create Index
            const params = {
                index: indexName,
            };
            await elasticSearch.indices.create(params);
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
            await elasticSearch.indices.putMapping(putMappingParams);
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

async function deleteEvent(image: any): Promise<any> {
    console.log('Starting Delete');
    const resourceType = image.resourceType.toLowerCase();

    await createIndexIfNotExist(resourceType);

    const { id } = image;
    try {
        const existResponse = await elasticSearch.exists({
            index: resourceType,
            id,
        });

        if (!existResponse.body) {
            console.log('Record with ID does not exist', id);
            return Promise.resolve(`Record with ${id} does not exist`);
        }

        console.log('Deleting', image.id);
        return elasticSearch.delete({
            index: resourceType,
            id: image.id,
        });
    } catch (e) {
        console.log(`Failed to delete ${id}`, e);
        return Promise.reject(e);
    }
}

async function getESHistory(id: any, lowercaseResourceType: string): Promise<any[]> {
    // Remove any older versions in ES
    const esResponse = await elasticSearch.search({
        index: lowercaseResourceType,
        body: {
            _source: ['meta'],
            query: {
                prefix: {
                    id: {
                        value: id,
                    },
                },
            },
        },
    });

    const metas = esResponse.body.hits.hits.map((hit: any) => {
        // Default format when ES sends us the response is hit._source, which is why there
        // is a dangling underscore
        // eslint-disable-next-line no-underscore-dangle
        return hit._source;
    });

    return metas;
}

async function getOldEsRecordAndEditEsRecordPromises(
    newImage: any,
): Promise<{ oldEsRecordPromises: any[]; editPromise: Promise<any> | null }> {
    console.log('Starting Edit');
    const lowercaseResourceType = newImage.resourceType.toLowerCase();

    await createIndexIfNotExist(lowercaseResourceType);

    if (newImage[DOCUMENT_STATUS_FIELD] === DOCUMENT_STATUS.DELETED) {
        return { oldEsRecordPromises: [], editPromise: deleteEvent(newImage) };
    }
    if (newImage[DOCUMENT_STATUS_FIELD] !== DOCUMENT_STATUS.AVAILABLE) {
        return { oldEsRecordPromises: [], editPromise: null };
    }

    // Get existing resources with the same ID
    const idComponents: string[] = newImage.id.split(SEPARATOR);
    const existingMetas: any[] = await getESHistory(idComponents[0], lowercaseResourceType);

    let isInsertOld = false;

    // Remove any outdated resources from ES
    const oldEsRecordPromises: any = [];
    const trackingResourceIdsToDelete: string[] = [];
    existingMetas.forEach(meta => {
        const metaVersion = Number(meta.meta.versionId);
        const fullId = `${idComponents[0]}${SEPARATOR}${metaVersion}`;
        if (metaVersion < Number(newImage.meta.versionId)) {
            trackingResourceIdsToDelete.push(fullId);
            oldEsRecordPromises.push(
                elasticSearch.delete({
                    index: lowercaseResourceType,
                    id: fullId,
                }),
            );
        } else if (metaVersion > Number(newImage.meta.versionId)) {
            console.log(
                `Not inserting resource with id ${fullId} because there is a newer version of that resource in ES`,
            );
            isInsertOld = true;
        }
    });

    if (isInsertOld) {
        console.log('There is a newer version in ES do not add an older one');
        return { oldEsRecordPromises: [], editPromise: null };
    }

    console.log(`Resource with id ${newImage.id} slated to be updated`);
    const editPromise = elasticSearch.update({
        index: lowercaseResourceType,
        id: newImage.id,
        body: {
            doc: DynamoDbUtil.cleanItem(newImage),
            doc_as_upsert: true,
        },
    });

    console.log('Ids of resource slated to be deleted', trackingResourceIdsToDelete);
    return { oldEsRecordPromises, editPromise };
}

exports.handler = async (event: any) => {
    console.log('New operation');
    const editEsRecordPromises = [];
    try {
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
                await deleteEvent(image);
            } else {
                // eslint-disable-next-line no-await-in-loop
                const { oldEsRecordPromises, editPromise } = await getOldEsRecordAndEditEsRecordPromises(image);
                if (oldEsRecordPromises.length > 0) {
                    console.log(
                        `Executing delete oldEsRecordPromises. Number of promises: ${oldEsRecordPromises.length}`,
                    );
                    // eslint-disable-next-line no-await-in-loop
                    await Promise.all(oldEsRecordPromises);
                }
                if (editPromise) {
                    editEsRecordPromises.push(editPromise);
                }
            }
        }
        console.log(`Executing edit record promises. Number of promises: ${editEsRecordPromises.length}`);
        await Promise.all(editEsRecordPromises);
    } catch (e) {
        console.log('Failed to update ES records', e);
    }
};
