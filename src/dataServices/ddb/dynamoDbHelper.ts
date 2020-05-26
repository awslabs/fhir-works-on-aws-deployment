// eslint-disable-next-line import/extensions
import DynamoDB from 'aws-sdk/clients/dynamodb';
import DynamoDbParamBuilder from './dynamoDbParamBuilder';
import { DynamoDBConverter } from './dynamoDb';
import ServiceResponse from '../../common/serviceResponse';
import DOCUMENT_STATUS from './documentStatus';
import DynamoDbUtil, { DOCUMENT_STATUS_FIELD } from './dynamoDbUtil';

export default class DynamoDbHelper {
    private dynamoDb: DynamoDB;

    constructor(dynamoDb: DynamoDB) {
        this.dynamoDb = dynamoDb;
    }

    async getMostRecentResource(resourceType: string, id: string, projectionExpression?: string) {
        const params = DynamoDbParamBuilder.buildGetResourcesQueryParam(resourceType, id, 1, projectionExpression);
        let item = null;
        try {
            const result = await this.dynamoDb.query(params).promise();
            item = result.Items ? DynamoDBConverter.unmarshall(result.Items[0]) : null;

            item = DynamoDbUtil.cleanItem(item);
        } catch (e) {
            console.error(`Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`, e);
            return new ServiceResponse(false, `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`);
        }

        if (!item) {
            return new ServiceResponse(false, 'Resource not found');
        }

        return new ServiceResponse(true, 'Resource found', item);
    }

    async getMostRecentValidResource(resourceType: string, id: string) {
        const params = DynamoDbParamBuilder.buildGetResourcesQueryParam(resourceType, id, 2);
        let item = null;
        try {
            const result = await this.dynamoDb.query(params).promise();
            const items = result.Items
                ? result.Items.map(ddbJsonItem => DynamoDBConverter.unmarshall(ddbJsonItem))
                : [];

            if (items.length === 0) {
                return new ServiceResponse(false, 'Resource not found');
            }
            const latestItemDocStatus = items[0][DOCUMENT_STATUS_FIELD];
            if (latestItemDocStatus === DOCUMENT_STATUS.DELETED) {
                return new ServiceResponse(false, 'Resource not found');
            }

            // If the latest version of the resource is in PENDING, grab the previous version
            if (latestItemDocStatus === DOCUMENT_STATUS.PENDING && items.length > 1) {
                // eslint-disable-next-line prefer-destructuring
                item = items[1];
            } else {
                // Latest version that are in LOCKED/PENDING_DELETE/AVAILABLE are valid to be read from
                // eslint-disable-next-line prefer-destructuring
                item = items[0];
            }

            item = DynamoDbUtil.cleanItem(item);
        } catch (e) {
            console.error(`Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`, e);
            return new ServiceResponse(false, `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`);
        }

        return new ServiceResponse(true, 'Resource found', item);
    }
}
