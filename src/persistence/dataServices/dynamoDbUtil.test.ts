/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import DynamoDbUtil, { DOCUMENT_STATUS_FIELD, LOCK_END_TS_FIELD, VID_FIELD } from './dynamoDbUtil';
import DOCUMENT_STATUS from './documentStatus';
import { clone } from '../../interface/utilities';
import { timeFromEpochInMsRegExp, utcTimeRegExp } from '../../regExpressions';

describe('cleanItem', () => {
    const id = 'ee3928b9-8699-4970-ba49-8f41bd122f46';
    const vid = '2';

    test('Remove documentStatus field and format id correctly', () => {
        const item: any = {
            resourceType: 'Patient',
            id,
        };

        item[LOCK_END_TS_FIELD] = Date.now();
        item[DOCUMENT_STATUS_FIELD] = DOCUMENT_STATUS.AVAILABLE;
        item[VID_FIELD] = vid;

        const actualItem = DynamoDbUtil.cleanItem(item);

        expect(actualItem).toEqual({
            resourceType: 'Patient',
            id,
        });
    });

    test('Return item correctly if documentStatus and lockEndTs is not in the item', () => {
        const item: any = {
            resourceType: 'Patient',
            id: `${id}_${vid}`,
        };

        item[VID_FIELD] = vid;

        const actualItem = DynamoDbUtil.cleanItem(item);

        expect(actualItem).toEqual({
            resourceType: 'Patient',
            id,
        });
    });
});

describe('prepItemForDdbInsert', () => {
    const id = '8cafa46d-08b4-4ee4-b51b-803e20ae8126';
    const vid = '1';
    const resource = {
        resourceType: 'Patient',
        id,
        name: [
            {
                family: 'Jameson',
                given: ['Matt'],
            },
        ],
        gender: 'male',
        meta: {
            lastUpdated: '2020-03-26T15:46:55.848Z',
            versionId: vid,
        },
    };

    const checkExpectedItemMatchActualItem = (actualItem: any, updatedResource: any) => {
        const expectedItem = clone(updatedResource);
        expectedItem[DOCUMENT_STATUS_FIELD] = DOCUMENT_STATUS.PENDING;
        expectedItem.id = id;
        expectedItem.vid = vid;
        expectedItem.meta = {
            versionId: vid,
            lastUpdated: expect.stringMatching(utcTimeRegExp),
        };

        expect(actualItem).toMatchObject(expectedItem);
        expect(actualItem[LOCK_END_TS_FIELD].toString()).toEqual(expect.stringMatching(timeFromEpochInMsRegExp));
    };

    test('Return item correctly when full meta field already exists', () => {
        // BUILD
        const updatedResource = clone(resource);

        // OPERATE
        const actualItem = DynamoDbUtil.prepItemForDdbInsert(updatedResource, id, vid, DOCUMENT_STATUS.PENDING);

        // CHECK
        updatedResource.meta.versionId = vid;
        checkExpectedItemMatchActualItem(actualItem, updatedResource);
    });

    test('Return item correctly when meta field does not exist yet', () => {
        // BUILD
        const updatedResource = clone(resource);
        delete updatedResource.meta;

        // OPERATE
        const actualItem = DynamoDbUtil.prepItemForDdbInsert(updatedResource, id, vid, DOCUMENT_STATUS.PENDING);

        checkExpectedItemMatchActualItem(actualItem, updatedResource);
    });

    test('Return item correctly when meta field exist but meta does not contain versionId', () => {
        // BUILD
        const updatedResource = clone(resource);
        delete updatedResource.meta.versionId;

        // OPERATE
        const actualItem = DynamoDbUtil.prepItemForDdbInsert(updatedResource, id, vid, DOCUMENT_STATUS.PENDING);

        // CHECK
        checkExpectedItemMatchActualItem(actualItem, updatedResource);
    });
});
