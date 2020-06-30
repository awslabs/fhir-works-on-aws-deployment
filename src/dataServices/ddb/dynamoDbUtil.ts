/* eslint-disable prefer-destructuring */
import { SEPARATOR } from '../../constants';
import DOCUMENT_STATUS from './documentStatus';
import { captureIdFromFullIdRegExp } from '../../regExpressions';
import { clone } from '../../common/utilities';
import { generateMeta } from '../../common/resourceMeta';

export const DOCUMENT_STATUS_FIELD = 'documentStatus';
export const LOCK_END_TS_FIELD = 'lockEndTs';

export default class DynamoDbUtil {
    static generateFullId(id: string, versionId: number) {
        if (versionId < 1) {
            const message = 'Invalid version id. Version id starts at 1 or higher';
            console.error(message);
            throw new Error(message);
        }

        return `${id}${SEPARATOR}${versionId}`;
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

    static prepItemForDdbInsert(resource: any, id: string, versionId: number, documentStatus: DOCUMENT_STATUS) {
        const item = clone(resource);
        item.id = DynamoDbUtil.generateFullId(id, versionId);
        if (versionId && !item.meta) {
            item.meta = generateMeta(versionId);
        }
        if (versionId && item.meta && !item.meta.versionId) {
            const generatedMeta = generateMeta(versionId);
            item.meta = { ...item.meta, ...generatedMeta };
        }
        item[DOCUMENT_STATUS_FIELD] = documentStatus;
        item[LOCK_END_TS_FIELD] = Date.now();
        return item;
    }
}
