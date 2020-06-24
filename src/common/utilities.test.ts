import { getOperation, getResource } from './utilities';

describe('getOperation', () => {
    test('verb: PUT', async () => {
        const results = getOperation('PUT', "doesn't matter");
        expect(results).toEqual('update');
    });
    test('verb: PATCH', async () => {
        const results = getOperation('PATCH', "doesn't matter");
        expect(results).toEqual('update');
    });
    test('verb: DELETE', async () => {
        const results = getOperation('DELETE', "doesn't matter");
        expect(results).toEqual('delete');
    });
    test('verb: GET; history single resource', async () => {
        const results = getOperation('GET', '/Patient/123/_history/345');
        expect(results).toEqual('vread');
    });
    test('verb: GET; history multiple resources', async () => {
        const results = getOperation('GET', '/Patient/123/_history');
        expect(results).toEqual('history');
    });
    test('verb: GET; read', async () => {
        const results = getOperation('GET', 'Patient/123');
        expect(results).toEqual('read');
    });
    test('verb: GET; search on type', async () => {
        const results = getOperation('GET', '/Patient');
        expect(results).toEqual('search');
    });
    test('verb: GET; search globally', async () => {
        const results = getOperation('GET', '');
        expect(results).toEqual('search');
    });
    test('verb: POST; search on type', async () => {
        const results = getOperation('POST', '/Patient/_search');
        expect(results).toEqual('search');
    });
    test('verb: POST; search globally', async () => {
        const results = getOperation('POST', '/_search');
        expect(results).toEqual('search');
    });
    test('verb: POST; batch', async () => {
        const results = getOperation('POST', '');
        expect(results).toEqual('transaction');
    });
    test('verb: POST; create', async () => {
        const results = getOperation('POST', 'Patient');
        expect(results).toEqual('create');
    });
    test('verb: FAKE', async () => {
        expect(() => {
            getOperation('FAKE', '/Patient');
        }).toThrow(new Error('Unable to parse the http verb'));
    });
});
describe('getResource', () => {
    test('operation: CREATE', async () => {
        const results = getResource('Patient', 'create');
        expect(results).toEqual('Patient');
    });
    test('operation: UPDATE', async () => {
        const results = getResource('Patient/1234', 'update');
        expect(results).toEqual('Patient');
    });
    test('operation: READ', async () => {
        const results = getResource('Patient/1234', 'read');
        expect(results).toEqual('Patient');
    });
    test('operation: READ; Invalid type', async () => {
        const results = getResource('/FAKE/1234', 'read');
        expect(results).toEqual('FAKE');
    });
    test('operation: HISTORY; specific Patient', async () => {
        const results = getResource('Patient/1234/_history', 'history');
        expect(results).toEqual('Patient');
    });
    test('operation: HISTORY; all Patient', async () => {
        const results = getResource('Patient/_history', 'history');
        expect(results).toEqual('Patient');
    });
    test('operation: HISTORY; everything', async () => {
        const results = getResource('/_history', 'history');
        expect(results).toEqual(undefined);
    });
    test('operation: VREAD; specific', async () => {
        const results = getResource('Patient/1234/_history/1234', 'vread');
        expect(results).toEqual('Patient');
    });
    test('operation: DELETE', async () => {
        const results = getResource('Patient', 'delete');
        expect(results).toEqual('Patient');
    });
    test('operation: SEARCH; generic', async () => {
        const results = getResource('', 'search');
        expect(results).toEqual(undefined);
    });
    test('operation: SEARCH; specific', async () => {
        const results = getResource('/Patient', 'search');
        expect(results).toEqual('Patient');
    });
    test('operation: TRANSACTION', async () => {
        const results = getResource('', 'transaction');
        expect(results).toEqual(undefined);
    });
});
