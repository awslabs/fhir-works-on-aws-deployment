import { DynamoDbDataService, DynamoDb } from 'fhir-works-on-aws-persistence-ddb';
import reaperHandler from './subscriptionReaper';

const enableMultitenancy = process.env.ENABLE_MULTI_TENANCY === 'true';
const dbServiceWithTenancy = new DynamoDbDataService(DynamoDb, false, {
    enableMultiTenancy: enableMultitenancy,
});
const dbService = new DynamoDbDataService(DynamoDb);

/**
 * Custom lambda handler that handles deleting expired subscriptions.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
exports.handler = async (event: any) => {
    return reaperHandler(dbService, dbServiceWithTenancy, enableMultitenancy);
};
