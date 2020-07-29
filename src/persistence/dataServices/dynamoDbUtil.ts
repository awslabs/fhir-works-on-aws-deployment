/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { SEPARATOR } from '../../constants';
import DOCUMENT_STATUS from './documentStatus';
import { clone } from '../../interface/utilities';
import { generateMeta } from '../../interface/resourceMeta';

export const DOCUMENT_STATUS_FIELD = 'documentStatus';
export const LOCK_END_TS_FIELD = 'lockEndTs';

export default class DynamoDbUtil {
    // Exp. de5b1d47-2780-4508-9273-4e0ec133ee3a_1
    static captureIdFromFullIdRegExp = /([-\w]+)_\w+/;

    static generateFullId(id: string, vid: string) {
        return `${id}${SEPARATOR}${vid}`;
    }

    static getIdFromFullId(fullId: string) {
        const matches = fullId.match(DynamoDbUtil.captureIdFromFullIdRegExp);
        if (matches) {
            return matches[1];
        }
        const message = `Full id is not valid: ${fullId}`;
        console.error(message);
        throw new Error(message);
    }

    static cleanItem(item: any) {
        const cleanedItem = clone(item);

        delete cleanedItem[DOCUMENT_STATUS_FIELD];
        delete cleanedItem[LOCK_END_TS_FIELD];

        // Return id instead of full id
        const id = DynamoDbUtil.getIdFromFullId(item.id);
        cleanedItem.id = id;

        return cleanedItem;
    }

    static prepItemForDdbInsert(resource: any, id: string, vid: string, documentStatus: DOCUMENT_STATUS) {
        const item = clone(resource);
        item.id = DynamoDbUtil.generateFullId(id, vid);
        if (vid && !item.meta) {
            item.meta = generateMeta(vid);
        }
        if (vid && item.meta && !item.meta.versionId) {
            const generatedMeta = generateMeta(vid);
            item.meta = { ...item.meta, ...generatedMeta };
        }
        item[DOCUMENT_STATUS_FIELD] = documentStatus;
        item[LOCK_END_TS_FIELD] = Date.now();
        return item;
    }
}
