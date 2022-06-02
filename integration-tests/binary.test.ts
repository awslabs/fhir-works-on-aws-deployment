import axios, { AxiosInstance } from 'axios';
import { getFhirClient } from './utils';

jest.setTimeout(60 * 1000);

describe('Binary operations', () => {
    let client: AxiosInstance;
    beforeAll(async () => {
        client = await getFhirClient();
    });

    const testFileContent = 'This is a test file for binary functionality';
    const binaryTxtRequestBody = {
        resourceType: 'Binary',
        contentType: 'text/plain',
    };

    test('Create(POST) binary', async () => {
        // OPERATE
        const postBinaryResult = await client.post('Binary', binaryTxtRequestBody);
        const { id, presignedPutUrl } = postBinaryResult.data;
        await axios.put(presignedPutUrl, Buffer.from(testFileContent));

        // CHECK
        const getBinaryResponse = await client.get(`Binary/${id}`);
        const getFileResponse = await axios.get(getBinaryResponse.data.presignedGetUrl);
        expect(getBinaryResponse.data).toMatchObject({ ...binaryTxtRequestBody, id, meta: { versionId: '1' } });
        expect(getFileResponse.data).toEqual(testFileContent);
    });

    test('Update(PUT) binary', async () => {
        // BUILD
        const postBinaryResult = await client.post('Binary', binaryTxtRequestBody);
        const { id } = postBinaryResult.data;
        await axios.put(postBinaryResult.data.presignedPutUrl, Buffer.from(testFileContent));

        // OPERATE
        const putBinaryResult = await client.put(`Binary/${id}`, {
            ...binaryTxtRequestBody,
            id,
        });
        const anotherTestFileContent = 'This is another test file for binary functionality';
        await axios.put(putBinaryResult.data.presignedPutUrl, Buffer.from(anotherTestFileContent));

        // CHECK
        const getBinaryResponse = await client.get(`Binary/${id}`);
        const getFileResponse = await axios.get(getBinaryResponse.data.presignedGetUrl);
        expect(getBinaryResponse.data).toMatchObject({ ...binaryTxtRequestBody, id, meta: { versionId: '2' } });
        expect(getFileResponse.data).toEqual(anotherTestFileContent);
    });

    test('Delete binary', async () => {
        // BUILD
        const postBinaryResult = await client.post('Binary', binaryTxtRequestBody);
        const { id } = postBinaryResult.data;
        await axios.put(postBinaryResult.data.presignedPutUrl, Buffer.from(testFileContent));

        // OPERATE
        await client.delete(`Binary/${id}`);

        // CHECK
        await expect(client.get(`Binary/${id}`)).rejects.toMatchObject({
            response: { status: 404 },
        });
    });
});
