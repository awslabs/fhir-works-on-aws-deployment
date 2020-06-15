import RBACHandler from './RBACHandler';
import RBACRules from './RBACRules';

const noGroupsAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwibmFtZSI6Im5vdCByZWFsIiwiaWF0IjoxNTE2MjM5MDIyfQ.kCA912Pb__JP54WjgZOazu1x8w5KU-kL0iRwQEVFNPw';
const nonPractAndAuditorAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiY29nbml0bzpncm91cHMiOlsibm9uLXByYWN0aXRpb25lciIsImF1ZGl0b3IiXSwibmFtZSI6Im5vdCByZWFsIiwiaWF0IjoxNTE2MjM5MDIyfQ.HBNrpqQZPvj43qv1QNFr5u9PoHrtqK4ApsRpN2t7Rz8';
const practitionerAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiY29nbml0bzpncm91cHMiOlsicHJhY3RpdGlvbmVyIl0sIm5hbWUiOiJub3QgcmVhbCIsImlhdCI6MTUxNjIzOTAyMn0.bhZZ2O8Vph5aiPfs1n34Enw0075Tt4Cnk2FL2C3mHaQ';
describe('isAuthorized', () => {
    const RBACHandlers: RBACHandler = new RBACHandler(RBACRules);

    test('TRUE; GET direct patient; practitioner', async () => {
        const results: boolean = await RBACHandlers.isAuthorized(practitionerAccessToken, 'GET', 'Patient/1324');
        expect(results).toEqual(true);
    });
    test('TRUE; POST direct patient; practitioner', async () => {
        const results: boolean = await RBACHandlers.isAuthorized(practitionerAccessToken, 'POST', '/Patient');
        expect(results).toEqual(true);
    });
    test('TRUE; POST bundle; practitioner', async () => {
        const results: boolean = await RBACHandlers.isAuthorized(practitionerAccessToken, 'POST', '/');
        expect(results).toEqual(true);
    });
    test('TRUE; PUT direct patient; practitioner', async () => {
        const results: boolean = await RBACHandlers.isAuthorized(practitionerAccessToken, 'PUT', '/Patient/1324');
        expect(results).toEqual(true);
    });
    test('TRUE; DELETE patient; practitioner', async () => {
        const results: boolean = await RBACHandlers.isAuthorized(practitionerAccessToken, 'DELETE', 'Patient/1324');
        expect(results).toEqual(true);
    });
    test('TRUE; GET capability statement; no groups', async () => {
        const results: boolean = await RBACHandlers.isAuthorized('notReal', 'GET', 'metadata');
        expect(results).toEqual(true);
    });
    test('FALSE; GET Patient; no groups', async () => {
        const results: boolean = await RBACHandlers.isAuthorized(noGroupsAccessToken, 'GET', 'Patient');
        expect(results).toEqual(false);
    });
    test('FALSE; POST Patient; non-practitioner/auditor', async () => {
        const results: boolean = await RBACHandlers.isAuthorized(nonPractAndAuditorAccessToken, 'POST', 'Patient');
        expect(results).toEqual(false);
    });
    test('TRUE; GET Patient; non-practitioner/auditor', async () => {
        const results: boolean = await RBACHandlers.isAuthorized(nonPractAndAuditorAccessToken, 'GET', 'Patient/1234');
        expect(results).toEqual(true);
    });
    test('TRUE; POST Patient Search; non-practitioner/auditor', async () => {
        const results: boolean = await RBACHandlers.isAuthorized(
            nonPractAndAuditorAccessToken,
            'POST',
            '/Patient/_search',
        );
        expect(results).toEqual(true);
    });
    test('TRUE; POST Global Search; non-practitioner/auditor', async () => {
        const results: boolean = await RBACHandlers.isAuthorized(nonPractAndAuditorAccessToken, 'POST', '/_search');
        expect(results).toEqual(true);
    });
    test('TRUE; GET specific Patient history; non-practitioner/auditor', async () => {
        const results: boolean = await RBACHandlers.isAuthorized(
            nonPractAndAuditorAccessToken,
            'GET',
            '/Patient/1234/_history/456',
        );
        expect(results).toEqual(true);
    });
    test('FALSE; GET Patient history; non-practitioner/auditor', async () => {
        const results: boolean = await RBACHandlers.isAuthorized(
            nonPractAndAuditorAccessToken,
            'GET',
            '/Patient/1234/_history',
        );
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
