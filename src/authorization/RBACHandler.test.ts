import RBACHandler from './RBACHandler';
import RBACRules from './RBACRules';

const noGroupsAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwibmFtZSI6Im5vdCByZWFsIiwiaWF0IjoxNTE2MjM5MDIyfQ.kCA912Pb__JP54WjgZOazu1x8w5KU-kL0iRwQEVFNPw';
const nonPractAndAuditorAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiY29nbml0bzpncm91cHMiOlsibm9uLXByYWN0aXRpb25lciIsImF1ZGl0b3IiXSwibmFtZSI6Im5vdCByZWFsIiwiaWF0IjoxNTE2MjM5MDIyfQ.HBNrpqQZPvj43qv1QNFr5u9PoHrtqK4ApsRpN2t7Rz8';
const practitionerAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiY29nbml0bzpncm91cHMiOlsicHJhY3RpdGlvbmVyIl0sIm5hbWUiOiJub3QgcmVhbCIsImlhdCI6MTUxNjIzOTAyMn0.bhZZ2O8Vph5aiPfs1n34Enw0075Tt4Cnk2FL2C3mHaQ';
describe('isAuthorized', () => {
    const authZHandler: RBACHandler = new RBACHandler(RBACRules);

    test('TRUE; read direct patient; practitioner', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: practitionerAccessToken,
            resourceType: 'Patient',
            operation: 'read',
            id: '1324',
        });
        expect(results).toEqual(true);
    });
    test('TRUE; create direct patient; practitioner', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: practitionerAccessToken,
            resourceType: 'Patient',
            operation: 'create',
        });
        expect(results).toEqual(true);
    });
    test('TRUE; bundle; practitioner', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: practitionerAccessToken,
            operation: 'bundle',
        });
        expect(results).toEqual(true);
    });
    test('TRUE; update direct patient; practitioner', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: practitionerAccessToken,
            resourceType: 'Patient',
            operation: 'update',
            id: '1324',
        });
        expect(results).toEqual(true);
    });
    test('TRUE; DELETE patient; practitioner', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: practitionerAccessToken,
            resourceType: 'Patient',
            operation: 'delete',
            id: '1324',
        });
        expect(results).toEqual(true);
    });

    test('FASLE; patch patient; practitioner', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: practitionerAccessToken,
            resourceType: 'Patient',
            operation: 'patch',
            id: '1324',
        });
        expect(results).toEqual(false);
    });
    test('TRUE; GET capability statement; no groups', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: 'notReal',
            operation: 'read',
            resourceType: 'metadata',
        });
        expect(results).toEqual(true);
    });
    test('FALSE; GET Patient; no groups', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: noGroupsAccessToken,
            resourceType: 'Patient',
            operation: 'read',
            id: '1324',
        });
        expect(results).toEqual(false);
    });
    test('FALSE; POST Patient; non-practitioner/auditor', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            resourceType: 'Patient',
            operation: 'create',
        });
        expect(results).toEqual(false);
    });
    test('TRUE; GET Patient; non-practitioner/auditor', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            resourceType: 'Patient',
            operation: 'read',
            id: '1324',
        });
        expect(results).toEqual(true);
    });
    test('TRUE; Patient Search; non-practitioner/auditor', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            resourceType: 'Patient',
            operation: 'type-search',
        });
        expect(results).toEqual(true);
    });
    test('FASLSE; Global Search; non-practitioner/auditor', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            operation: 'search',
        });
        expect(results).toEqual(false);
    });
    test('TRUE; GET specific Patient history; non-practitioner/auditor', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            resourceType: 'Patient',
            operation: 'vread',
            id: '1324',
            vid: '1324',
        });
        expect(results).toEqual(true);
    });
    test('FALSE; GET Patient history; non-practitioner/auditor', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            resourceType: 'Patient',
            operation: 'type-history',
        });
        expect(results).toEqual(false);
    });

    test('ERROR: Attempt to create a handler to support a new config version', async () => {
        expect(() => {
            // eslint-disable-next-line no-new
            new RBACHandler({
                version: 2.0,
                groupRules: {},
            });
        }).toThrow(new Error('Configuration version does not match handler version'));
    });
});

describe('isBundleRequestAuthorized', () => {
    const authZHandler: RBACHandler = new RBACHandler(RBACRules);

    test('TRUE; create direct patient in bundle; practitioner', async () => {
        const results: boolean = await authZHandler.isBundleRequestAuthorized({
            accessToken: practitionerAccessToken,
            requests: [{ operation: 'create', id: 'id', resource: { active: true }, resourceType: 'Patient' }],
        });
        expect(results).toEqual(true);
    });

    test('TRUE; create & read direct patient in bundle; practitioner', async () => {
        const results: boolean = await authZHandler.isBundleRequestAuthorized({
            accessToken: practitionerAccessToken,
            requests: [
                { operation: 'create', id: 'id', resource: { active: true }, resourceType: 'Patient' },
                { operation: 'read', id: 'id', resource: 'Patient/id', resourceType: 'Patient' },
            ],
        });
        expect(results).toEqual(true);
    });

    test('FALSE; create & read direct patient in bundle; nonPractAndAuditor', async () => {
        const results: boolean = await authZHandler.isBundleRequestAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            requests: [
                { operation: 'read', id: 'id', resource: 'Patient/id', resourceType: 'Patient' },
                { operation: 'create', id: 'id', resource: { active: true }, resourceType: 'Patient' },
            ],
        });
        expect(results).toEqual(false);
    });
    test('FALSE; create & read direct patient in bundle; nonPractAndAuditor', async () => {
        const results: boolean = await authZHandler.isBundleRequestAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            requests: [
                { operation: 'create', id: 'id', resource: 'Patient/id', resourceType: 'Patient' },
                { operation: 'create', id: 'id', resource: { active: true }, resourceType: 'Patient' },
            ],
        });
        expect(results).toEqual(false);
    });
});
