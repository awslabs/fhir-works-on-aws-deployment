import DynamoDbAtomicTransactionHelper from './dynamoDbAtomicTransactionHelper';
import BatchReadWriteRequest, { BatchReadWriteRequestType } from './batchReadWriteRequest';
import { DynamoDBConverter } from './dynamoDb';
import GenerateStagingRequestsFactory from '../../testUtilities/GenerateStagingRequestsFactory';
import GenerateRollbackRequestsFactory from '../../testUtilities/GenerateRollbackRequestsFactory';

describe('generateStagingRequests', () => {
    test('CREATE', () => {
        const actualResult = DynamoDbAtomicTransactionHelper.generateStagingRequests(
            [GenerateStagingRequestsFactory.getCreate().request],
            GenerateStagingRequestsFactory.getCreate().idToVersionId,
        );
        const expectedResult: any = {
            deleteRequests: [],
            createRequests: [GenerateStagingRequestsFactory.getCreate().expectedRequest],
            updateRequests: [],
            readRequests: [],
            newLocks: [GenerateStagingRequestsFactory.getCreate().expectedLock],
            newStagingResponses: [GenerateStagingRequestsFactory.getCreate().expectedStagingResponse],
        };

        expect(actualResult).toMatchObject(expectedResult);
    });

    test('READ', () => {
        const actualResult = DynamoDbAtomicTransactionHelper.generateStagingRequests(
            [GenerateStagingRequestsFactory.getRead().request],
            GenerateStagingRequestsFactory.getRead().idToVersionId,
        );
        const expectedResult: any = {
            deleteRequests: [],
            createRequests: [],
            updateRequests: [],
            readRequests: [GenerateStagingRequestsFactory.getRead().expectedRequest],
            newLocks: [],
            newStagingResponses: [GenerateStagingRequestsFactory.getRead().expectedStagingResponse],
        };

        expect(actualResult).toMatchObject(expectedResult);
    });

    test('UPDATE', () => {
        const actualResult = DynamoDbAtomicTransactionHelper.generateStagingRequests(
            [GenerateStagingRequestsFactory.getUpdate().request],
            GenerateStagingRequestsFactory.getUpdate().idToVersionId,
        );

        const expectedResult: any = {
            deleteRequests: [],
            createRequests: [],
            updateRequests: [GenerateStagingRequestsFactory.getUpdate().expectedRequest],
            readRequests: [],
            newLocks: [GenerateStagingRequestsFactory.getUpdate().expectedLock],
            newStagingResponses: [GenerateStagingRequestsFactory.getUpdate().expectedStagingResponse],
        };

        expect(actualResult).toMatchObject(expectedResult);
    });

    test('DELETE', () => {
        const actualResult = DynamoDbAtomicTransactionHelper.generateStagingRequests(
            [GenerateStagingRequestsFactory.getDelete().request],
            GenerateStagingRequestsFactory.getDelete().idToVersionId,
        );
        const expectedResult: any = {
            deleteRequests: [GenerateStagingRequestsFactory.getDelete().expectedRequest],
            createRequests: [],
            updateRequests: [],
            readRequests: [],
            newLocks: [],
            newStagingResponses: [GenerateStagingRequestsFactory.getDelete().expectedStagingResponse],
        };

        expect(actualResult).toMatchObject(expectedResult);
    });

    test('CRUD', () => {
        let idToVersionId: Record<string, number> = {};
        idToVersionId = {
            ...GenerateStagingRequestsFactory.getRead().idToVersionId,
            ...GenerateStagingRequestsFactory.getUpdate().idToVersionId,
            ...GenerateStagingRequestsFactory.getDelete().idToVersionId,
        };

        const requests: BatchReadWriteRequest[] = [
            GenerateStagingRequestsFactory.getCreate().request,
            GenerateStagingRequestsFactory.getRead().request,
            GenerateStagingRequestsFactory.getUpdate().request,
            GenerateStagingRequestsFactory.getDelete().request,
        ];
        const actualResult = DynamoDbAtomicTransactionHelper.generateStagingRequests(requests, idToVersionId);

        const expectedResult = {
            createRequests: [GenerateStagingRequestsFactory.getCreate().expectedRequest],
            readRequests: [GenerateStagingRequestsFactory.getRead().expectedRequest],
            updateRequests: [GenerateStagingRequestsFactory.getUpdate().expectedRequest],
            deleteRequests: [GenerateStagingRequestsFactory.getDelete().expectedRequest],
            newLocks: [
                GenerateStagingRequestsFactory.getCreate().expectedLock,
                GenerateStagingRequestsFactory.getUpdate().expectedLock,
            ],
            newStagingResponses: [
                GenerateStagingRequestsFactory.getCreate().expectedStagingResponse,
                GenerateStagingRequestsFactory.getRead().expectedStagingResponse,
                GenerateStagingRequestsFactory.getUpdate().expectedStagingResponse,
                GenerateStagingRequestsFactory.getDelete().expectedStagingResponse,
            ],
        };

        expect(actualResult).toMatchObject(expectedResult);
    });
});

describe('generateRollbackRequests', () => {
    const testRunner = (requestType: BatchReadWriteRequestType, versionId: number) => {
        const bundleEntryResponse = GenerateRollbackRequestsFactory.buildBundleEntryResponse(requestType, versionId);

        const actualResult = DynamoDbAtomicTransactionHelper.generateRollbackRequests([bundleEntryResponse]);

        const expectedResult = GenerateRollbackRequestsFactory.buildExpectedBundleEntryResult(bundleEntryResponse);
        expect(actualResult).toEqual(expectedResult);
    };

    test('CREATE', () => {
        testRunner(BatchReadWriteRequestType.CREATE, 1);
    });

    test('READ', () => {
        testRunner(BatchReadWriteRequestType.READ, 1);
    });

    test('UPDATE', () => {
        testRunner(BatchReadWriteRequestType.UPDATE, 2);
    });

    test('DELETE', () => {
        testRunner(BatchReadWriteRequestType.DELETE, 1);
    });

    test('CRUD', () => {
        const createBundleEntryResponse = GenerateRollbackRequestsFactory.buildBundleEntryResponse(
            BatchReadWriteRequestType.CREATE,
            1,
        );
        const readBundleEntryResponse = GenerateRollbackRequestsFactory.buildBundleEntryResponse(
            BatchReadWriteRequestType.READ,
            1,
        );
        const updateBundleEntryResponse = GenerateRollbackRequestsFactory.buildBundleEntryResponse(
            BatchReadWriteRequestType.UPDATE,
            1,
        );
        const deleteBundleEntryResponse = GenerateRollbackRequestsFactory.buildBundleEntryResponse(
            BatchReadWriteRequestType.DELETE,
            1,
        );

        const actualResult = DynamoDbAtomicTransactionHelper.generateRollbackRequests([
            createBundleEntryResponse,
            readBundleEntryResponse,
            updateBundleEntryResponse,
            deleteBundleEntryResponse,
        ]);

        const expectedCreateResult = GenerateRollbackRequestsFactory.buildExpectedBundleEntryResult(
            createBundleEntryResponse,
        );
        const expectedReadResult = GenerateRollbackRequestsFactory.buildExpectedBundleEntryResult(
            readBundleEntryResponse,
        );
        const expectedUpdateResult = GenerateRollbackRequestsFactory.buildExpectedBundleEntryResult(
            updateBundleEntryResponse,
        );
        const expectedDeleteResult = GenerateRollbackRequestsFactory.buildExpectedBundleEntryResult(
            deleteBundleEntryResponse,
        );

        let itemsToRemoveFromLock: any = [];
        itemsToRemoveFromLock = itemsToRemoveFromLock.concat(expectedCreateResult.itemsToRemoveFromLock);
        itemsToRemoveFromLock = itemsToRemoveFromLock.concat(expectedReadResult.itemsToRemoveFromLock);
        itemsToRemoveFromLock = itemsToRemoveFromLock.concat(expectedUpdateResult.itemsToRemoveFromLock);
        itemsToRemoveFromLock = itemsToRemoveFromLock.concat(expectedDeleteResult.itemsToRemoveFromLock);

        itemsToRemoveFromLock = itemsToRemoveFromLock.filter((item: any) => item !== []);

        let transactionRequests: any = [];
        transactionRequests = transactionRequests.concat(expectedCreateResult.transactionRequests);
        transactionRequests = transactionRequests.concat(expectedReadResult.transactionRequests);
        transactionRequests = transactionRequests.concat(expectedUpdateResult.transactionRequests);
        transactionRequests = transactionRequests.concat(expectedDeleteResult.transactionRequests);

        transactionRequests = transactionRequests.filter((req: any) => req !== []);

        expect(actualResult).toEqual({ itemsToRemoveFromLock, transactionRequests });
    });
});

describe('populateBundleEntryResponseWithReadResult', () => {
    test('readResults are merged correctly into bundleEntryResponses', () => {
        const stagingResponses = [
            {
                id: '8cafa46d-08b4-4ee4-b51b-803e20ae8126',
                versionId: 3,
                type: BatchReadWriteRequestType.UPDATE,
                lastModified: '2020-04-23T16:22:16.355Z',
                resourceType: 'Patient',
                resource: {},
            },
            {
                id: '3f0830ce-e759-4b07-b75d-577630f2ae4d',
                versionId: 1,
                type: BatchReadWriteRequestType.CREATE,
                lastModified: '2020-04-23T16:22:16.357Z',
                resourceType: 'Patient',
                resource: {},
            },
            {
                id: '47135b80-b721-430b-9d4b-1557edc64947',
                versionId: 1,
                type: BatchReadWriteRequestType.READ,
                lastModified: '',
                resource: {},
                resourceType: 'Patient',
            },
            {
                id: 'bce8411e-c15e-448c-95dd-69155a837405',
                versionId: 1,
                type: BatchReadWriteRequestType.DELETE,
                lastModified: '2020-04-23T16:22:16.357Z',
                resource: {},
                resourceType: 'Patient',
            },
            {
                id: 'vdo49rks-cie9-dkd3-coe0-djei03d83i30',
                versionId: 1,
                type: BatchReadWriteRequestType.READ,
                lastModified: '',
                resource: {},
                resourceType: 'Patient',
            },
        ];

        const firstReadItem = {
            resourceType: 'Patient',
            id: '47135b80-b721-430b-9d4b-1557edc64947_1',
            name: [
                {
                    family: 'Jameson',
                    given: ['Matt'],
                },
            ],
            gender: 'male',
            documentStatus: 'LOCKED',
        };

        const secondReadItem = {
            resourceType: 'Patient',
            id: 'vdo49rks-cie9-dkd3-coe0-djei03d83i30_1',
            name: [
                {
                    family: 'Smith',
                    given: ['Emily'],
                },
            ],
            gender: 'female',
            documentStatus: 'LOCKED',
        };

        const readResult = {
            Responses: [
                {
                    Item: DynamoDBConverter.marshall(firstReadItem),
                },
                {
                    Item: DynamoDBConverter.marshall(secondReadItem),
                },
            ],
        };

        const actualResult = DynamoDbAtomicTransactionHelper.populateBundleEntryResponseWithReadResult(
            stagingResponses,
            readResult,
        );

        const firstReadStagingResponse = stagingResponses[2];
        firstReadStagingResponse.resource = firstReadItem;

        const secondReadStagingResponse = stagingResponses[4];
        secondReadStagingResponse.resource = secondReadItem;

        const expectedResult = [
            stagingResponses[0],
            stagingResponses[1],
            firstReadStagingResponse,
            stagingResponses[3],
            secondReadStagingResponse,
        ];

        expect(actualResult).toEqual(expectedResult);
    });
});
