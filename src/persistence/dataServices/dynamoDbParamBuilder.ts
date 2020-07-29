/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { DynamoDBConverter, RESOURCE_TABLE } from './dynamoDb';
import DdbUtil, { DOCUMENT_STATUS_FIELD, LOCK_END_TS_FIELD } from './dynamoDbUtil';
import DOCUMENT_STATUS from './documentStatus';
import { SEPARATOR } from '../../constants';

export default class DynamoDbParamBuilder {
    static LOCK_DURATION_IN_MS = 35 * 1000;

    static buildUpdateDocumentStatusParam(
        oldStatus: DOCUMENT_STATUS | null,
        newStatus: DOCUMENT_STATUS,
        resourceType: string,
        idWithVersion: string,
    ) {
        const currentTs = Date.now();
        let futureEndTs = currentTs;
        if (newStatus === DOCUMENT_STATUS.LOCKED) {
            futureEndTs = currentTs + this.LOCK_DURATION_IN_MS;
        }

        const params: any = {
            Update: {
                TableName: RESOURCE_TABLE,
                Key: DynamoDBConverter.marshall({
                    resourceType,
                    id: idWithVersion,
                }),
                UpdateExpression: `set ${DOCUMENT_STATUS_FIELD} = :newStatus, ${LOCK_END_TS_FIELD} = :futureEndTs`,
                ExpressionAttributeValues: DynamoDBConverter.marshall({
                    ':newStatus': newStatus,
                    ':futureEndTs': futureEndTs,
                }),
            },
        };

        if (oldStatus) {
            params.Update.ConditionExpression = `${DOCUMENT_STATUS_FIELD} = :oldStatus OR (${LOCK_END_TS_FIELD} < :currentTs AND (${DOCUMENT_STATUS_FIELD} = :lockStatus OR ${DOCUMENT_STATUS_FIELD} = :pendingStatus OR ${DOCUMENT_STATUS_FIELD} = :pendingDeleteStatus))`;
            params.Update.ExpressionAttributeValues = DynamoDBConverter.marshall({
                ':newStatus': newStatus,
                ':oldStatus': oldStatus,
                ':lockStatus': DOCUMENT_STATUS.LOCKED,
                ':pendingStatus': DOCUMENT_STATUS.PENDING,
                ':pendingDeleteStatus': DOCUMENT_STATUS.PENDING_DELETE,
                ':currentTs': currentTs,
                ':futureEndTs': futureEndTs,
            });
        }

        return params;
    }

    static buildGetResourcesQueryParam(
        resourceType: string,
        id: string,
        maxNumberOfVersions: number,
        projectionExpression?: string,
    ) {
        const params: any = {
            TableName: RESOURCE_TABLE,
            ScanIndexForward: false,
            Limit: maxNumberOfVersions,
            KeyConditionExpression: 'resourceType = :hkey and begins_with(id, :rkey)',
            ExpressionAttributeValues: DynamoDBConverter.marshall({
                ':hkey': resourceType,
                ':rkey': id + SEPARATOR,
            }),
        };

        if (projectionExpression) {
            // @ts-ignore
            params.ProjectionExpression = projectionExpression;
        }
        return params;
    }

    static buildDeleteParam(id: string, vid: string, resourceType: string) {
        const params: any = {
            Delete: {
                TableName: RESOURCE_TABLE,
                Key: DynamoDBConverter.marshall({
                    resourceType,
                    id: DdbUtil.generateFullId(id, vid),
                }),
            },
        };

        return params;
    }

    static buildGetItemParam(resourceType: string, id: string) {
        return {
            TableName: RESOURCE_TABLE,
            Key: DynamoDBConverter.marshall({
                resourceType,
                id,
            }),
        };
    }

    static buildPutAvailableItemParam(item: any, id: string, vid: string) {
        const newItem = DdbUtil.prepItemForDdbInsert(item, id, vid, DOCUMENT_STATUS.AVAILABLE);
        return {
            TableName: RESOURCE_TABLE,
            Item: DynamoDBConverter.marshall(newItem),
        };
    }
}
