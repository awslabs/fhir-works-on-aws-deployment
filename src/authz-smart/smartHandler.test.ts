/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { AuthorizationRequest, SystemOperation, TypeOperation } from 'fhir-works-on-aws-interface';
import { SMARTHandler } from './smartHandler';
import { SMARTConfig, ScopeRule } from './smartConfig';

const allReadOperations: (TypeOperation | SystemOperation)[] = [
    'read',
    'vread',
    'search-type',
    'search-system',
    'history-instance',
    'history-type',
    'history-system',
];

const allWriteOperations: (TypeOperation | SystemOperation)[] = [
    'create',
    'update',
    'delete',
    'patch',
    'transaction',
    'batch',
];

const scopeRule: ScopeRule = {
    patient: {
        read: allReadOperations,
        write: ['update', 'patch', 'create'],
    },
    user: {
        read: allReadOperations,
        write: [],
    },
    system: {
        read: allReadOperations,
        write: allWriteOperations,
    },
    launch: {
        launch: allReadOperations,
        patient: allReadOperations,
        encounter: allReadOperations,
    },
};

const noFHIRScopesAccess: string =
    'eyJraWQiOiJETmJFNVpJalFmR2FJTEY3RlBmZHVZMjdCQ1R0THZ0QTVCTGRlWUFQcFFRIiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULjZhN2tuY1RDcHUxWDllbzJRaEgxel9XTFVLNFR5VjQzbl85STZrWk53UFkiLCJpc3MiOiJodHRwczovL2Rldi02NDYwNjExLm9rdGEuY29tL29hdXRoMi9kZWZhdWx0IiwiYXVkIjoiYXBpOi8vZGVmYXVsdCIsImlhdCI6MTYwMzExODEzOCwiZXhwIjoxNjAzMTIxNzM4LCJjaWQiOiIwb2E4bXVhektTeWs5Z1A1eTVkNSIsInVpZCI6IjAwdTg1b3p3ampXUmQxN1BCNWQ1Iiwic2NwIjpbImZoaXJVc2VyIiwib3BlbmlkIiwicHJvZmlsZSJdLCJzdWIiOiJzbWF5ZGE0NEBnbWFpbC5jb20iLCJmaGlyVXNlciI6IlBhdGllbnQvMTIzNCJ9.wvziVAfCAM3Lmg2xeiZ991fuKtVSIY7uJItBCYfOc_fNceZzCitMTRhbBFBR65C9qPemmJOGgnVIWsy2fWwkWqIS9f4jhYW5VstmxsJpZDpJFi1Junrhb3kFzTQr80yP3unGlQMLv91x4E4RWcmXOr0akh9Z7PuO2M0LUwup4riix4X2do-nqepVp-7PTd-t3AqC8ohK5_vrPbi4YFKOtp7TJEfSm251OMI_TaXr0o83Gr8i25QITo8uZE87mIlWw9Y84mETos2U8fpYfHE1rvTev1zu5Qu38DCZeuppDnftvTvOfZY25TbdjzrUEUNypVGro38UxVoLh9d5rGZZxw';
const audWrongAccess: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXIiOjEsImp0aSI6IkFULjZhN2tuY1RDcHUxWDllbzJRaEgxel9XTFVLNFR5VjQzbl85STZrWk53UFkiLCJpc3MiOiJodHRwczovL2Rldi02NDYwNjExLm9rdGEuY29tL29hdXRoMi9kZWZhdWx0IiwiYXVkIjoiYXBpOi8vZGVmYXVsdHFxcSIsImlhdCI6MTYwMzExODEzOCwiZXhwIjoxNjAzMTIxNzM4LCJjaWQiOiIwb2E4bXVhektTeWs5Z1A1eTVkNSIsInVpZCI6IjAwdTg1b3p3ampXUmQxN1BCNWQ1Iiwic2NwIjpbImZoaXJVc2VyIiwib3BlbmlkIiwicHJvZmlsZSIsInBhdGllbnQvKi4qIl0sInN1YiI6InNtYXlkYTQ0QGdtYWlsLmNvbSIsImZoaXJVc2VyIjoiUGF0aWVudC8xMjM0In0.7SWjgXwiHdZHH9p3GX6ef994ZdPO3XLC2St-HSIpuCA';
const issWrongAccess: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXIiOjEsImp0aSI6IkFULjZhN2tuY1RDcHUxWDllbzJRaEgxel9XTFVLNFR5VjQzbl85STZrWk53UFkiLCJpc3MiOiJodHRwczovL2Rldi02NDYwNjExLm9rdGEuY29tL2Zha2UvZGVmYXVsdCIsImF1ZCI6ImFwaTovL2RlZmF1bHQiLCJpYXQiOjE2MDMxMTgxMzgsImV4cCI6MTYwMzEyMTczOCwiY2lkIjoiMG9hOG11YXpLU3lrOWdQNXk1ZDUiLCJ1aWQiOiIwMHU4NW96d2pqV1JkMTdQQjVkNSIsInNjcCI6WyJmaGlyVXNlciIsIm9wZW5pZCIsInByb2ZpbGUiLCJwYXRpZW50LyouKiJdLCJzdWIiOiJzbWF5ZGE0NEBnbWFpbC5jb20iLCJmaGlyVXNlciI6IlBhdGllbnQvMTIzNCJ9.KD39_myQqMW5lckO4iS_XAU9Ygs59t5i70EZFFTxe7U';
const launchAccess: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXIiOjEsImp0aSI6IkFULjZhN2tuY1RDcHUxWDllbzJRaEgxel9XTFVLNFR5VjQzbl85STZrWk53UFkiLCJpc3MiOiJodHRwczovL2Rldi02NDYwNjExLm9rdGEuY29tL29hdXRoMi9kZWZhdWx0IiwiYXVkIjoiYXBpOi8vZGVmYXVsdCIsImlhdCI6MTYwMzExODEzOCwiZXhwIjoxNjAzMTIxNzM4LCJjaWQiOiIwb2E4bXVhektTeWs5Z1A1eTVkNSIsInVpZCI6IjAwdTg1b3p3ampXUmQxN1BCNWQ1Iiwic2NwIjpbImZoaXJVc2VyIiwib3BlbmlkIiwicHJvZmlsZSIsImxhdW5jaCJdLCJzdWIiOiJzbWF5ZGE0NEBnbWFpbC5jb20iLCJmaGlyVXNlciI6IlBhdGllbnQvMTIzNCJ9.d7bx2yTIVVuqgxclrJe-TOfRuslTKi5np4hM_B6VQ_o';
const launchPatientAccess: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXIiOjEsImp0aSI6IkFULjZhN2tuY1RDcHUxWDllbzJRaEgxel9XTFVLNFR5VjQzbl85STZrWk53UFkiLCJpc3MiOiJodHRwczovL2Rldi02NDYwNjExLm9rdGEuY29tL29hdXRoMi9kZWZhdWx0IiwiYXVkIjoiYXBpOi8vZGVmYXVsdCIsImlhdCI6MTYwMzExODEzOCwiZXhwIjoxNjAzMTIxNzM4LCJjaWQiOiIwb2E4bXVhektTeWs5Z1A1eTVkNSIsInVpZCI6IjAwdTg1b3p3ampXUmQxN1BCNWQ1Iiwic2NwIjpbImZoaXJVc2VyIiwib3BlbmlkIiwicHJvZmlsZSIsImxhdW5jaC9wYXRpZW50Il0sInN1YiI6InNtYXlkYTQ0QGdtYWlsLmNvbSIsImZoaXJVc2VyIjoiUGF0aWVudC8xMjM0In0.0pXNJUUCUyIfCkbMnyA6c68YT1Yk9gdgy_54gCIvwMI';
const launchEncounterAccess: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXIiOjEsImp0aSI6IkFULjZhN2tuY1RDcHUxWDllbzJRaEgxel9XTFVLNFR5VjQzbl85STZrWk53UFkiLCJpc3MiOiJodHRwczovL2Rldi02NDYwNjExLm9rdGEuY29tL29hdXRoMi9kZWZhdWx0IiwiYXVkIjoiYXBpOi8vZGVmYXVsdCIsImlhdCI6MTYwMzExODEzOCwiZXhwIjoxNjAzMTIxNzM4LCJjaWQiOiIwb2E4bXVhektTeWs5Z1A1eTVkNSIsInVpZCI6IjAwdTg1b3p3ampXUmQxN1BCNWQ1Iiwic2NwIjpbImZoaXJVc2VyIiwib3BlbmlkIiwicHJvZmlsZSIsImxhdW5jaC9lbmNvdW50ZXIiXSwic3ViIjoic21heWRhNDRAZ21haWwuY29tIiwiZmhpclVzZXIiOiJQYXRpZW50LzEyMzQifQ.Nl6yRFGCFnSXszg9kBHS4sbMQio7YnOUajGWOkaLdUA';
const manyReadAccess: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXIiOjEsImp0aSI6IkFULjZhN2tuY1RDcHUxWDllbzJRaEgxel9XTFVLNFR5VjQzbl85STZrWk53UFkiLCJpc3MiOiJodHRwczovL2Rldi02NDYwNjExLm9rdGEuY29tL29hdXRoMi9kZWZhdWx0IiwiYXVkIjoiYXBpOi8vZGVmYXVsdCIsImlhdCI6MTYwMzExODEzOCwiZXhwIjoxNjAzMTIxNzM4LCJjaWQiOiIwb2E4bXVhektTeWs5Z1A1eTVkNSIsInVpZCI6IjAwdTg1b3p3ampXUmQxN1BCNWQ1Iiwic2NwIjpbImZoaXJVc2VyIiwib3BlbmlkIiwicHJvZmlsZSIsImxhdW5jaC9lbmNvdW50ZXIiLCJwYXRpZW50L1BhdGllbnQucmVhZCIsInBhdGllbnQvT2JzZXJ2YXRpb24ucmVhZCJdLCJzdWIiOiJzbWF5ZGE0NEBnbWFpbC5jb20iLCJmaGlyVXNlciI6IlBhdGllbnQvMTIzNCJ9.k_uqVL_uXo49ETrhSwaNXw0LYDadvt4LJuwrKh-0FJo';
const manyWriteAccess: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXIiOjEsImp0aSI6IkFULjZhN2tuY1RDcHUxWDllbzJRaEgxel9XTFVLNFR5VjQzbl85STZrWk53UFkiLCJpc3MiOiJodHRwczovL2Rldi02NDYwNjExLm9rdGEuY29tL29hdXRoMi9kZWZhdWx0IiwiYXVkIjoiYXBpOi8vZGVmYXVsdCIsImlhdCI6MTYwMzExODEzOCwiZXhwIjoxNjAzMTIxNzM4LCJjaWQiOiIwb2E4bXVhektTeWs5Z1A1eTVkNSIsInVpZCI6IjAwdTg1b3p3ampXUmQxN1BCNWQ1Iiwic2NwIjpbImZoaXJVc2VyIiwib3BlbmlkIiwicHJvZmlsZSIsInVzZXIvUGF0aWVudC53cml0ZSIsInN5c3RlbS9PYnNlcnZhdGlvbi53cml0ZSIsInBhdGllbnQvKi53cml0ZSJdLCJzdWIiOiJzbWF5ZGE0NEBnbWFpbC5jb20iLCJmaGlyVXNlciI6IlBhdGllbnQvMTIzNCJ9.tRx8pf60I98vUJI7Q87sZkvI24ii6ADQ_jSw88Q42EY';
const allSysAccess: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXIiOjEsImp0aSI6IkFULjZhN2tuY1RDcHUxWDllbzJRaEgxel9XTFVLNFR5VjQzbl85STZrWk53UFkiLCJpc3MiOiJodHRwczovL2Rldi02NDYwNjExLm9rdGEuY29tL29hdXRoMi9kZWZhdWx0IiwiYXVkIjoiYXBpOi8vZGVmYXVsdCIsImlhdCI6MTYwMzExODEzOCwiZXhwIjoxNjAzMTIxNzM4LCJjaWQiOiIwb2E4bXVhektTeWs5Z1A1eTVkNSIsInVpZCI6IjAwdTg1b3p3ampXUmQxN1BCNWQ1Iiwic2NwIjpbInN5c3RlbS8qLioiXSwic3ViIjoic21heWRhNDRAZ21haWwuY29tIiwiZmhpclVzZXIiOiJQYXRpZW50LzEyMzQifQ.prsPxDrXt3vg1WpKJCLSHm9bFItL3wItYMb8Hvk6K3I';
const manyReadAccessScopeSpaces: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXIiOjEsImp0aSI6IkFULjZhN2tuY1RDcHUxWDllbzJRaEgxel9XTFVLNFR5VjQzbl85STZrWk53UFkiLCJpc3MiOiJodHRwczovL2Rldi02NDYwNjExLm9rdGEuY29tL29hdXRoMi9kZWZhdWx0IiwiYXVkIjoiYXBpOi8vZGVmYXVsdCIsImlhdCI6MTYwMzExODEzOCwiZXhwIjoxNjAzMTIxNzM4LCJjaWQiOiIwb2E4bXVhektTeWs5Z1A1eTVkNSIsInVpZCI6IjAwdTg1b3p3ampXUmQxN1BCNWQ1Iiwic2NwIjoiZmhpclVzZXIgb3BlbmlkIHByb2ZpbGUgbGF1bmNoL2VuY291bnRlciBwYXRpZW50L1BhdGllbnQucmVhZCBwYXRpZW50L09ic2VydmF0aW9uLnJlYWQiLCJzdWIiOiJzbWF5ZGE0NEBnbWFpbC5jb20iLCJmaGlyVXNlciI6IlBhdGllbnQvMTIzNCJ9.XXzFDtWFUreMDg39xTDlC3cNBc6TVZZ6i4IRD-6RcOA';
const manyReadAccessScopeSpacesJustLaunch: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXIiOjEsImp0aSI6IkFULjZhN2tuY1RDcHUxWDllbzJRaEgxel9XTFVLNFR5VjQzbl85STZrWk53UFkiLCJpc3MiOiJodHRwczovL2Rldi02NDYwNjExLm9rdGEuY29tL29hdXRoMi9kZWZhdWx0IiwiYXVkIjoiYXBpOi8vZGVmYXVsdCIsImlhdCI6MTYwMzExODEzOCwiZXhwIjoxNjAzMTIxNzM4LCJjaWQiOiIwb2E4bXVhektTeWs5Z1A1eTVkNSIsInVpZCI6IjAwdTg1b3p3ampXUmQxN1BCNWQ1Iiwic2NwIjoiZmhpclVzZXIgb3BlbmlkIHByb2ZpbGUgbGF1bmNoIiwic3ViIjoic21heWRhNDRAZ21haWwuY29tIiwiZmhpclVzZXIiOiJQYXRpZW50LzEyMzQifQ.mExtrUuJhXRaKlpJ72-3CrsX5CezkYC-tVY1dg4frlw';

const cases: (string | boolean | AuthorizationRequest)[][] = [
    ['aud_failure', { accessToken: audWrongAccess, operation: 'create', resourceType: 'Patient' }, false],
    ['iss_failure', { accessToken: issWrongAccess, operation: 'create', resourceType: 'Patient' }, false],
    ['no_fhir_scopes', { accessToken: noFHIRScopesAccess, operation: 'create', resourceType: 'Patient' }, false],
    ['launch_scope', { accessToken: launchAccess, operation: 'create', resourceType: 'Patient' }, false],
    ['launch/patient', { accessToken: launchPatientAccess, operation: 'search-system' }, true],
    [
        'launch/encounter',
        { accessToken: launchEncounterAccess, operation: 'read', resourceType: 'Patient', id: '123' },
        true,
    ],
    ['manyRead_Write', { accessToken: manyReadAccess, operation: 'update', resourceType: 'Patient', id: '12' }, false],
    [
        'manyRead_Read',
        { accessToken: manyReadAccess, operation: 'vread', resourceType: 'Observation', id: '1', vid: '1' },
        true,
    ],
    ['manyRead_search', { accessToken: manyReadAccess, operation: 'search-type', resourceType: 'Observation' }, true],
    ['manyWrite_Read', { accessToken: manyWriteAccess, operation: 'read', resourceType: 'Patient', id: '12' }, false],
    [
        'manyWrite_Write_transaction. patient scope does not have access to transaction',
        { accessToken: manyWriteAccess, operation: 'transaction' },
        false,
    ],
    [
        'manyRead_withSpaceScope',
        { accessToken: manyReadAccessScopeSpaces, operation: 'vread', resourceType: 'Observation', id: '1', vid: '1' },
        false,
    ],
    ['manyWrite_Write_create', { accessToken: manyWriteAccess, operation: 'create', resourceType: 'Patient' }, true],
    ['sys_read', { accessToken: allSysAccess, operation: 'read', resourceType: 'Patient', id: '12' }, true],
    ['sys_transaction', { accessToken: allSysAccess, operation: 'transaction' }, true],
    ['sys_history', { accessToken: allSysAccess, operation: 'history-system' }, true],
    ['sys_fakeType', { accessToken: allSysAccess, operation: 'create', resourceType: 'Fake' }, true],
];

const expectedAud = 'api://default';
const expectedIss = 'https://dev-6460611.okta.com/oauth2/default';

const authZConfig: SMARTConfig = {
    version: 1.0,
    scopeKey: 'scp',
    scopeValueType: 'array',
    scopeRule,
    expectedAudValue: expectedAud,
    expectedIssValue: expectedIss,
    expectedFhirUserClaimKey: 'fhirUser',
    fhirUserClaimRegex: /(\w+)\/(\w+)/g,
    authZUserInfoUrl: `${expectedIss}/userInfo`,
};

const mock = new MockAdapter(axios);
afterEach(() => {
    mock.reset();
});
expect.hasAssertions();
describe('constructor', () => {
    test('ERROR: Attempt to create a handler to support a new config version', async () => {
        expect(() => {
            // eslint-disable-next-line no-new
            new SMARTHandler({
                ...authZConfig,
                version: 2.0,
            });
        }).toThrow(new Error('Authorization configuration version does not match handler version'));
    });
});
describe('isAuthorized; scopes are in an array', () => {
    const authZHandler: SMARTHandler = new SMARTHandler(authZConfig);
    test.each(cases)('CASE: %p', async (_firstArg, request, expectedResult) => {
        mock.onPost(authZConfig.authZUserInfoUrl).reply(200, { fhirUser: '123' });
        const result = await authZHandler.isAuthorized(<AuthorizationRequest>request);
        expect(result).toEqual(expectedResult);
    });
});

const spaceCases: (string | boolean | AuthorizationRequest)[][] = [
    [
        'manyRead_Write',
        { accessToken: manyReadAccessScopeSpaces, operation: 'update', resourceType: 'Patient', id: '12' },
        false,
    ],
    [
        'manyRead_Read',
        { accessToken: manyReadAccessScopeSpaces, operation: 'vread', resourceType: 'Observation', id: '1', vid: '1' },
        true,
    ],
    [
        'manyRead_search',
        { accessToken: manyReadAccessScopeSpaces, operation: 'search-type', resourceType: 'Observation' },
        true,
    ],
    [
        'manyRead_launchScopeOnly',
        { accessToken: manyReadAccessScopeSpacesJustLaunch, operation: 'read', resourceType: 'Observation', id: '1' },
        true,
    ],
    [
        'manyRead_withArrayScope',
        { accessToken: manyReadAccess, operation: 'vread', resourceType: 'Observation', id: '1', vid: '1' },
        false,
    ],
];

describe('isAuthorized; scopes are space delimited', () => {
    const authZHandler: SMARTHandler = new SMARTHandler({
        ...authZConfig,
        scopeValueType: 'space',
    });
    test.each(spaceCases)('CASE: %p', async (_firstArg, request, expectedResult) => {
        mock.onPost(authZConfig.authZUserInfoUrl).reply(200, { fhirUser: '123' });
        const result = await authZHandler.isAuthorized(<AuthorizationRequest>request);
        expect(result).toEqual(expectedResult);
    });
});
const apiCases: (string | boolean | AuthorizationRequest | number | any)[][] = [
    [
        '200; sucess',
        { accessToken: manyReadAccess, operation: 'search-type', resourceType: 'Observation' },
        200,
        { [authZConfig.expectedFhirUserClaimKey]: '1234' },
        true,
    ],
    [
        '202; success',
        { accessToken: manyWriteAccess, operation: 'create', resourceType: 'Patient' },
        202,
        { [authZConfig.expectedFhirUserClaimKey]: '1234' },
        true,
    ],
    ['4XX; failure', { accessToken: manyWriteAccess, operation: 'create', resourceType: 'Patient' }, 403, {}, false],
    ['5XX; failure', { accessToken: manyWriteAccess, operation: 'create', resourceType: 'Patient' }, 500, {}, false],
    [
        'Cannot find claim',
        { accessToken: allSysAccess, operation: 'read', resourceType: 'Patient', id: '12' },
        200,
        { stuff: '1234' },
        false,
    ],
];
describe('isAuthorized; scopes are in an array', () => {
    const authZHandler: SMARTHandler = new SMARTHandler(authZConfig);
    test.each(apiCases)('CASE: %p', async (_firstArg, request, authRespCode, authRespBody, expectedResult) => {
        mock.onPost(authZConfig.authZUserInfoUrl).reply(<number>authRespCode, authRespBody);
        const result = await authZHandler.isAuthorized(<AuthorizationRequest>request);
        expect(result).toEqual(expectedResult);
    });
});
