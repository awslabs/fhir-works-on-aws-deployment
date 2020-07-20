import AWS from 'aws-sdk';
import DdbToEsHelper from './ddbToEsHelper';

const REMOVE = 'REMOVE';

// This is a separate lambda function from the main FHIR API server lambda.
// This lambda picks up changes from DDB by way of DDB stream, and sends those changes to ElasticSearch Service for indexing.
// This allows the FHIR API Server to query ElasticSearch service for search requests

exports.handler = async (event: any) => {
    const ddbToEsHelper = new DdbToEsHelper();
    try {
        const idAndPromises = [];
        for (let i = 0; i < event.Records.length; i += 1) {
            const record = event.Records[i];
            console.log('EventName: ', record.eventName);

            const ddbJsonImage = record.eventName === REMOVE ? record.dynamodb.OldImage : record.dynamodb.NewImage;
            const image = AWS.DynamoDB.Converter.unmarshall(ddbJsonImage);
            // Don't index binary files
            if (ddbToEsHelper.isBinaryResource(image)) {
                console.log('This is a Binary resource. These are not searchable');
                // eslint-disable-next-line no-continue
                continue;
            }

            if (record.eventName === REMOVE) {
                // If a user manually deletes a record from DDB, let's delete it from ES also
                // eslint-disable-next-line no-await-in-loop
                const idAndDeletePromise = await ddbToEsHelper.deleteEvent(image);
                if (idAndDeletePromise) {
                    idAndPromises.push(idAndDeletePromise);
                }
            } else {
                // eslint-disable-next-line no-await-in-loop
                const idAndUpsertPromise = await ddbToEsHelper.upsertRecordPromises(image);
                if (idAndUpsertPromise) {
                    idAndPromises.push(idAndUpsertPromise);
                }
            }
        }

        await ddbToEsHelper.logAndExecutePromises(idAndPromises);
        // // TODO make this into a function
        // if (idAndDeletePromises.length > 0) {
        //     console.log(
        //         'Deleting resource with these ids: ',
        //         idAndDeletePromises.map(idAndDeletePromise => {
        //             return idAndDeletePromise.id;
        //         }),
        //     );
        //     await Promise.all(
        //         idAndDeletePromises.map(idAndDeletePromise => {
        //             return idAndDeletePromise.promise;
        //         }),
        //     );
        // }
        //
        // if (idAndPromises.length > 0) {
        //     console.log(
        //         'Updating resource with these ids: ',
        //         idAndPromises.map(idAndUpsertPromise => {
        //             return idAndUpsertPromise.id;
        //         }),
        //     );
        //     await Promise.all(
        //         idAndPromises.map(idAndUpsertPromise => {
        //             return idAndUpsertPromise.promise;
        //         }),
        //     );
        // }
    } catch (e) {
        console.log('Failed to update ES records', e);
    }
};
