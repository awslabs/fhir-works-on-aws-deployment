import { getInteraction, getResource } from './utilities';
import { INTERACTION, R4_RESOURCE } from '../constants';

describe('getInteraction', () => {
    test('verb: PUT', async () => {
        const results: INTERACTION = getInteraction('PUT', "doesn't matter");
        expect(results).toEqual(INTERACTION.UPDATE);
    });
    test('verb: PATCH', async () => {
        const results: INTERACTION = getInteraction('PATCH', "doesn't matter");
        expect(results).toEqual(INTERACTION.UPDATE);
    });
    test('verb: DELETE', async () => {
        const results: INTERACTION = getInteraction('DELETE', "doesn't matter");
        expect(results).toEqual(INTERACTION.DELETE);
    });
    test('verb: GET; history single resource', async () => {
        const results: INTERACTION = getInteraction('GET', '/Patient/123/_history/345');
        expect(results).toEqual(INTERACTION.VREAD);
    });
    test('verb: GET; history multiple resources', async () => {
        const results: INTERACTION = getInteraction('GET', '/Patient/123/_history');
        expect(results).toEqual(INTERACTION.HISTORY);
    });
    test('verb: GET; read', async () => {
        const results: INTERACTION = getInteraction('GET', 'Patient/123');
        expect(results).toEqual(INTERACTION.READ);
    });
    test('verb: GET; search on type', async () => {
        const results: INTERACTION = getInteraction('GET', '/Patient');
        expect(results).toEqual(INTERACTION.SEARCH);
    });
    test('verb: GET; search globally', async () => {
        const results: INTERACTION = getInteraction('GET', '');
        expect(results).toEqual(INTERACTION.SEARCH);
    });
    test('verb: POST; search on type', async () => {
        const results: INTERACTION = getInteraction('POST', '/Patient/_search');
        expect(results).toEqual(INTERACTION.SEARCH);
    });
    test('verb: POST; search globally', async () => {
        const results: INTERACTION = getInteraction('POST', '/_search');
        expect(results).toEqual(INTERACTION.SEARCH);
    });
    test('verb: POST; batch', async () => {
        const results: INTERACTION = getInteraction('POST', '');
        expect(results).toEqual(INTERACTION.TRANSACTION);
    });
    test('verb: POST; create', async () => {
        const results: INTERACTION = getInteraction('POST', 'Patient');
        expect(results).toEqual(INTERACTION.CREATE);
    });
    test('verb: FAKE', async () => {
        expect(() => {
            getInteraction('FAKE', '/Patient');
        }).toThrow(Error);
    });
});
describe('getResource', () => {
    test('interaction: CREATE', async () => {
        const results = getResource('Patient', INTERACTION.CREATE);
        expect(results).toEqual(R4_RESOURCE.Patient);
    });
    test('interaction: UPDATE', async () => {
        const results = getResource('Patient/1234', INTERACTION.UPDATE);
        expect(results).toEqual(R4_RESOURCE.Patient);
    });
    test('interaction: READ', async () => {
        const results = getResource('Patient/1234', INTERACTION.READ);
        expect(results).toEqual(R4_RESOURCE.Patient);
    });
    test('interaction: READ; Invalid type', async () => {
        expect(() => {
            getResource('/FAKE/1234', INTERACTION.READ);
        }).toThrow(Error);
    });
    test('interaction: HISTORY; specific Patient', async () => {
        const results = getResource('Patient/1234/_history', INTERACTION.HISTORY);
        expect(results).toEqual(R4_RESOURCE.Patient);
    });
    test('interaction: HISTORY; all Patient', async () => {
        const results = getResource('Patient/_history', INTERACTION.HISTORY);
        expect(results).toEqual(R4_RESOURCE.Patient);
    });
    test('interaction: HISTORY; everything', async () => {
        const results = getResource('/_history', INTERACTION.HISTORY);
        expect(results).toEqual(undefined);
    });
    test('interaction: VREAD; specific', async () => {
        const results = getResource('Patient/1234/_history/1234', INTERACTION.VREAD);
        expect(results).toEqual(R4_RESOURCE.Patient);
    });
    test('interaction: DELETE', async () => {
        const results = getResource('Patient', INTERACTION.DELETE);
        expect(results).toEqual(R4_RESOURCE.Patient);
    });
    test('interaction: SEARCH; generic', async () => {
        const results = getResource('', INTERACTION.SEARCH);
        expect(results).toEqual(undefined);
    });
    test('interaction: SEARCH; specific', async () => {
        const results = getResource('/Patient', INTERACTION.SEARCH);
        expect(results).toEqual(R4_RESOURCE.Patient);
    });
    test('interaction: TRANSACTION', async () => {
        const results = getResource('', INTERACTION.TRANSACTION);
        expect(results).toEqual(undefined);
    });
});
