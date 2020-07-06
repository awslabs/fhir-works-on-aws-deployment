import DynamoDbUtil, { DOCUMENT_STATUS_FIELD, LOCK_END_TS_FIELD } from './dynamoDbUtil';
import DOCUMENT_STATUS from './documentStatus';
import { clone } from '../../common/utilities';
import { timeFromEpochInMsRegExp, utcTimeRegExp } from '../../regExpressions';

describe('cleanItem', () => {
    const id = 'ee3928b9-8699-4970-ba49-8f41bd122f46';
    const vid = '2';

    test('Remove documentStatus field and format id correctly', () => {
        const item: any = {
            resourceType: 'Patient',
            id: DynamoDbUtil.generateFullId(id, vid),
        };

        item[LOCK_END_TS_FIELD] = Date.now();
        item[DOCUMENT_STATUS_FIELD] = DOCUMENT_STATUS.AVAILABLE;

        const actualItem = DynamoDbUtil.cleanItem(item);

        expect(actualItem).toEqual({
            resourceType: 'Patient',
            id,
        });
    });

    test('Return item correctly if documentStatus and lockEndTs is not in the item', () => {
        const item = {
            resourceType: 'Patient',
            id: DynamoDbUtil.generateFullId(id, vid),
        };

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
    test('Return item correctly when meta field already exists', () => {
        const newItem = DynamoDbUtil.prepItemForDdbInsert(clone(resource), id, vid, DOCUMENT_STATUS.AVAILABLE);

        const expectedItem = clone(resource);
        expectedItem[DOCUMENT_STATUS_FIELD] = DOCUMENT_STATUS.AVAILABLE;
        expectedItem.id = DynamoDbUtil.generateFullId(id, vid);

        expect(newItem).toMatchObject(expectedItem);
        expect(newItem[LOCK_END_TS_FIELD].toString()).toEqual(expect.stringMatching(timeFromEpochInMsRegExp));
    });

    test('Return item correctly when meta field does not exist yet', () => {
        const newResource = clone(resource);
        delete newResource.meta;

        const newItem = DynamoDbUtil.prepItemForDdbInsert(newResource, id, vid, DOCUMENT_STATUS.PENDING);

        const expectedItem = clone(newResource);
        expectedItem[DOCUMENT_STATUS_FIELD] = DOCUMENT_STATUS.PENDING;
        expectedItem.id = DynamoDbUtil.generateFullId(id, vid);

        expect(newItem).toMatchObject(expectedItem);
        expect(newItem[LOCK_END_TS_FIELD].toString()).toEqual(expect.stringMatching(timeFromEpochInMsRegExp));
        expect(newItem.meta).toMatchObject({
            versionId: vid.toString(),
            lastUpdated: expect.stringMatching(utcTimeRegExp),
        });
    });
});
