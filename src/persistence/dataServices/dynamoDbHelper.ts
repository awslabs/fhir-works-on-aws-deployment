/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import DynamoDB from 'aws-sdk/clients/dynamodb';
import DynamoDbParamBuilder from './dynamoDbParamBuilder';
import { DynamoDBConverter } from './dynamoDb';
import GenericResponse from '../../interface/genericResponse';
import DOCUMENT_STATUS from './documentStatus';
import DynamoDbUtil, { DOCUMENT_STATUS_FIELD } from './dynamoDbUtil';

export default class DynamoDbHelper {
    private dynamoDb: DynamoDB;

    constructor(dynamoDb: DynamoDB) {
        this.dynamoDb = dynamoDb;
    }

    async getMostRecentResource(
        resourceType: string,
        id: string,
        projectionExpression?: string,
    ): Promise<GenericResponse> {
        const params = DynamoDbParamBuilder.buildGetResourcesQueryParam(resourceType, id, 1, projectionExpression);
        let item = null;
        try {
            const result = await this.dynamoDb.query(params).promise();
            item = result.Items ? DynamoDBConverter.unmarshall(result.Items[0]) : null;

            item = DynamoDbUtil.cleanItem(item);
        } catch (e) {
            console.error(`Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`, e);
            return {
                success: false,
                message: `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`,
            };
        }

        if (!item) {
            return {
                success: false,
                message: 'Resource not found',
            };
        }

        return {
            success: true,
            message: 'Resource found',
            resource: item,
        };
    }

    async getMostRecentValidResource(resourceType: string, id: string): Promise<GenericResponse> {
        const params = DynamoDbParamBuilder.buildGetResourcesQueryParam(resourceType, id, 2);
        let item = null;
        try {
            const result = await this.dynamoDb.query(params).promise();
            const items = result.Items
                ? result.Items.map(ddbJsonItem => DynamoDBConverter.unmarshall(ddbJsonItem))
                : [];

            if (items.length === 0) {
                return {
                    success: false,
                    message: 'Resource not found',
                };
            }
            const latestItemDocStatus = items[0][DOCUMENT_STATUS_FIELD];
            if (latestItemDocStatus === DOCUMENT_STATUS.DELETED) {
                return {
                    success: false,
                    message: 'Resource not found',
                };
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
            return {
                success: false,
                message: `Failed to retrieve resource. ResourceType: ${resourceType}, Id: ${id}`,
            };
        }

        return {
            success: true,
            message: 'Resource found',
            resource: item,
        };
    }
}
