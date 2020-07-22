/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { getRequestInformation } from './utilities';

describe('getRequestInformation', () => {
    test('verb: PUT; normal update', async () => {
        const results = getRequestInformation('PUT', '/Patient/123');
        expect(results).toEqual({ operation: 'update', resourceType: 'Patient', id: '123' });
    });
    test('verb: PUT; conditional update', async () => {
        const results = getRequestInformation('PUT', '/Patient/123?name=john');
        expect(results).toEqual({ operation: 'update', resourceType: 'Patient', id: '123' });
    });
    test('verb: PUT; invalid update', async () => {
        const results = getRequestInformation('PUT', 'fake');
        expect(results).toEqual({ operation: 'update', resourceType: 'fake' });
    });
    test('verb: PATCH; normal patch', async () => {
        const results = getRequestInformation('PATCH', '/Patient/123');
        expect(results).toEqual({ operation: 'patch', resourceType: 'Patient', id: '123' });
    });
    test('verb: PATCH; conditional patch', async () => {
        const results = getRequestInformation('PATCH', '/Patient/123?name=john');
        expect(results).toEqual({ operation: 'patch', resourceType: 'Patient', id: '123' });
    });
    test('verb: PATCH; invalid patch', async () => {
        const results = getRequestInformation('PATCH', 'fake');
        expect(results).toEqual({ operation: 'patch', resourceType: 'fake' });
    });
    test('verb: DELETE; normal delete', async () => {
        const results = getRequestInformation('DELETE', '/Patient/123');
        expect(results).toEqual({ operation: 'delete', resourceType: 'Patient', id: '123' });
    });
    test('verb: DELETE; conditional delete', async () => {
        const results = getRequestInformation('DELETE', '/Patient/123?name=john');
        expect(results).toEqual({ operation: 'delete', resourceType: 'Patient', id: '123' });
    });
    test('verb: DELETE; invalid delete', async () => {
        const results = getRequestInformation('DELETE', 'fake');
        expect(results).toEqual({ operation: 'delete', resourceType: 'fake' });
    });
    test('verb: GET; read: metadata', async () => {
        const results = getRequestInformation('GET', '/metadata');
        expect(results).toEqual({ operation: 'read', resourceType: 'metadata' });
    });
    test('verb: GET; read: metadata; with search', async () => {
        const results = getRequestInformation('GET', '/metadata?mode=full');
        expect(results).toEqual({ operation: 'read', resourceType: 'metadata' });
    });
    test('verb: GET; vread', async () => {
        const results = getRequestInformation('GET', '/Patient/123/_history/345');
        expect(results).toEqual({ operation: 'vread', resourceType: 'Patient', id: '123', vid: '345' });
    });
    test('verb: GET; instance-history with query', async () => {
        const results = getRequestInformation('GET', '/Patient/123/_history?name=joe');
        expect(results).toEqual({ operation: 'history-instance', resourceType: 'Patient', id: '123' });
    });
    test('verb: GET; instance-history without query', async () => {
        const results = getRequestInformation('GET', '/Patient/123/_history');
        expect(results).toEqual({ operation: 'history-instance', resourceType: 'Patient', id: '123' });
    });
    test('verb: GET; type-history with query', async () => {
        const results = getRequestInformation('GET', '/Patient/_history?name=joe');
        expect(results).toEqual({ operation: 'history-type', resourceType: 'Patient' });
    });
    test('verb: GET; type-history without query', async () => {
        const results = getRequestInformation('GET', '/Patient/_history/');
        expect(results).toEqual({ operation: 'history-type', resourceType: 'Patient' });
    });
    test('verb: GET; history with query', async () => {
        const results = getRequestInformation('GET', '/_history?name=joe');
        expect(results).toEqual({ operation: 'history-system' });
    });
    test('verb: GET; history without query', async () => {
        const results = getRequestInformation('GET', '_history');
        expect(results).toEqual({ operation: 'history-system' });
    });
    test('verb: GET; read', async () => {
        const results = getRequestInformation('GET', 'Patient/123');
        expect(results).toEqual({ operation: 'read', resourceType: 'Patient', id: '123' });
    });
    test('verb: GET; type-search with query', async () => {
        const results = getRequestInformation('GET', '/Patient?name=joe');
        expect(results).toEqual({ operation: 'search-type', resourceType: 'Patient' });
    });
    test('verb: GET; type-search without query', async () => {
        const results = getRequestInformation('GET', '/Patient');
        expect(results).toEqual({ operation: 'search-type', resourceType: 'Patient' });
    });
    test('verb: GET; search globally with query', async () => {
        const results = getRequestInformation('GET', '/?name=joe');
        expect(results).toEqual({ operation: 'search-system' });
    });
    test('verb: GET; search globally without query', async () => {
        const results = getRequestInformation('GET', '');
        expect(results).toEqual({ operation: 'search-system' });
    });
    test('verb: POST; search on type', async () => {
        const results = getRequestInformation('POST', '/Patient/_search?name=joe');
        expect(results).toEqual({ operation: 'search-type', resourceType: 'Patient' });
    });
    test('verb: POST; search globally', async () => {
        const results = getRequestInformation('POST', '/_search/');
        expect(results).toEqual({ operation: 'search-system' });
    });
    test('verb: POST; batch', async () => {
        const results = getRequestInformation('POST', '?format=json');
        expect(results).toEqual({ operation: 'transaction' });
    });
    test('verb: POST; create', async () => {
        const results = getRequestInformation('POST', 'Patient/?format=json');
        expect(results).toEqual({ operation: 'create', resourceType: 'Patient' });
    });
    test('verb: FAKE', async () => {
        expect(() => {
            getRequestInformation('FAKE', '/Patient');
        }).toThrow(new Error('Unable to parse the http verb'));
    });
});
