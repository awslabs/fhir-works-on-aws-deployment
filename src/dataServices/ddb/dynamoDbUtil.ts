/* eslint-disable prefer-destructuring */
import { SEPARATOR } from '../../constants';
import DOCUMENT_STATUS from './documentStatus';
import { captureIdFromFullIdRegExp } from '../../regExpressions';
import { clone } from '../../common/utilities';
import { generateMeta } from '../../common/resourceMeta';

export const DOCUMENT_STATUS_FIELD = 'documentStatus';
export const LOCK_END_TS_FIELD = 'lockEndTs';

export default class DynamoDbUtil {
    static generateFullId(id: string, vid: string) {
        return `${id}${SEPARATOR}${vid}`;
    }

    static getIdFromFullId(fullId: string) {
        const matches = fullId.match(captureIdFromFullIdRegExp);
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
        item[DOCUMENT_STATUS_FIELD] = documentStatus;
        item[LOCK_END_TS_FIELD] = Date.now();
        return item;
    }
}
