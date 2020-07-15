import { captureFullUrlParts } from './regExpressions';

describe('captureFullUrlParts', () => {
    test('Capture rootUrl, resourceType, id, versionId', () => {
        const url = 'https://API_URL.com/Observation/123/_history/1';

        const actualMatch = url.match(captureFullUrlParts);

        const expectedMatch = [
            'https://API_URL.com/Observation/123/_history/1',
            'https://API_URL.com/',
            'Observation',
            '123',
            '/_history/1',
        ];

        for (let i = 0; i < expectedMatch.length; i += 1) {
            // @ts-ignore
            expect(actualMatch[i]).toEqual(expectedMatch[i]);
        }
    });

    test('Capture rootUrl, resourceType, id', () => {
        const url = 'https://API_URL.com/Observation/123';

        const actualMatch = url.match(captureFullUrlParts);

        const expectedMatch = [
            'https://API_URL.com/Observation/123',
            'https://API_URL.com/',
            'Observation',
            '123',
            undefined,
        ];

        // @ts-ignore
        expect([...actualMatch]).toEqual([...expectedMatch]);
    });

    test('Capture resourceType, id', () => {
        const url = 'Observation/123';

        const actualMatch = url.match(captureFullUrlParts);

        const expectedMatch = ['Observation/123', undefined, 'Observation', '123', undefined];

        // @ts-ignore
        expect([...actualMatch]).toEqual([...expectedMatch]);
    });
});
