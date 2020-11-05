import axios, { AxiosInstance } from 'axios';
import { groupBy, mapValues, reduce } from 'lodash';
import { type } from 'os';
import sampleBundle from './sampleBundle.json';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
const sleep = async (milliseconds: number) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
};
const { API_URL, API_ACCESS_TOKEN, API_KEY } = process.env;
// let bundleResponse: any;
const bundleResponse = {
    resourceType: 'Bundle',
    id: '91e576b7-abf9-4848-8a1d-0d8fc1e37f8c',
    type: 'transaction-response',
    link: [{ relation: 'self', url: 'https://rzm26l8d7k.execute-api.us-west-2.amazonaws.com/bulkexport' }],
    entry: [
        {
            response: {
                status: '201 Created',
                location: 'Patient/3c01558b-01b3-4248-86fe-fe9712609180',
                etag: '1',
                lastModified: '2020-11-05T18:29:26.399Z',
            },
        },
        {
            response: {
                status: '201 Created',
                location: 'Practitioner/2293f199-19e0-4706-869c-cd3f6b689804',
                etag: '1',
                lastModified: '2020-11-05T18:29:26.401Z',
            },
        },
        {
            response: {
                status: '201 Created',
                location: 'Encounter/d1032df5-0e4d-4026-ace7-00f2182d723c',
                etag: '1',
                lastModified: '2020-11-05T18:29:26.402Z',
            },
        },
    ],
};

describe('Bulk Export', () => {
    let fhirUserAxios: AxiosInstance;
    beforeAll(async () => {
        // Fix jest not failing if failed
        // https://github.com/facebook/jest/issues/2713
        if (API_URL === undefined) {
            throw new Error('API_URL environment variable is not defined');
        }
        if (API_ACCESS_TOKEN === undefined) {
            throw new Error('API_ACCESS_TOKEN environment variable is not defined');
        }
        if (API_KEY === undefined) {
            throw new Error('API_KEY environment variable is not defined');
        }

        fhirUserAxios = axios.create({
            headers: {
                'x-api-key': API_KEY,
                Authorization: `Bearer ${API_ACCESS_TOKEN}`,
            },
            baseURL: API_URL,
        });
        // try {
        //     const response = await fhirUserAxios.post('/', sampleBundle);
        //     bundleResponse = response.data;
        //     console.log('Successfully preloaded data into DB', JSON.stringify(response.data));
        // } catch (e) {
        //     console.log('Failed to preload data into DB', e);
        //     throw new Error(e);
        // }
        return Promise.resolve();
    }, FIVE_MINUTES_IN_MS);

    const startExportJob = async () => {
        try {
            const response = await fhirUserAxios.get('/$export?_outputFormat=ndjson', { baseURL: API_URL });
            const statusPollUrl = response.headers['content-location'];
            console.log('statusPollUrl', statusPollUrl);
            return statusPollUrl;
        } catch (e) {
            console.error('Failed to start export job', e);
            throw e;
        }
    };

    const getExportStatus = async (statusPollUrl: string): Promise<any> => {
        const fiveMinuteFromNow = new Date(new Date().getTime() + FIVE_MINUTES_IN_MS);
        while (new Date().getTime() < fiveMinuteFromNow.getTime()) {
            try {
                console.log('Checking for export to be completed');
                // eslint-disable-next-line no-await-in-loop
                const response = await fhirUserAxios.get(statusPollUrl);
                if (response.status === 200) {
                    return response.data;
                }
                // eslint-disable-next-line no-await-in-loop
                await sleep(5000);
            } catch (e) {
                console.error('Failed to getExport status', e);
                throw e;
            }
        }

        return {};
    };

    const downloadFile = async (url: string): Promise<any[]> => {
        try {
            const resp = await axios.get(url, { responseType: 'blob' });
            console.log({ url, data: resp.data });
            return typeof resp.data === 'string'
                ? resp.data.split('\n').map((resource: string) => JSON.parse(resource))
                : [resp.data];
        } catch (e) {
            console.error('Failed to download file', e);
            throw e;
        }
    };

    const getExpectedResources = () => {
        // TODO: Consider using lodash to make this simpler
        const expectedResourceTypeToResource: any = {};
        const resourceTypeToResource: any = {};
        sampleBundle.entry.forEach((entry: any) => {
            resourceTypeToResource[entry.resource.resourceType] = entry.resource;
        });

        const resourceTypeToInfo: any = {};
        bundleResponse.entry.forEach((entry: any) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [location, resourceType, id] = entry.response.location.match(/(\w+)\/(.+)/);
            resourceTypeToInfo[resourceType] = {
                id,
                meta: {
                    lastUpdated: entry.response.lastModified,
                    versionId: entry.response.etag,
                },
            };
        });

        Object.keys(resourceTypeToInfo).forEach(resourceType => {
            const res = resourceTypeToResource[resourceType];
            res.id = resourceTypeToInfo[resourceType].id;
            res.meta = resourceTypeToInfo[resourceType].meta;
            expectedResourceTypeToResource[resourceType] = res;
        });

        return expectedResourceTypeToResource;
    };

    const checkResourceAreInExportedFiles = async (outputs: { url: string; type: string }[]) => {
        console.log('output', outputs);
        const resourceTypeToExpectedResources = getExpectedResources();
        // Check all files exported for each resource type for the expected resource
        const resourceTypeToUrls: Record<string, string[]> = mapValues(
            groupBy(outputs, 'type'),
            (outs: { url: string; type: string }[]) => {
                let urls: string[] = [];
                outs.forEach(out => {
                    urls = urls.concat(out.url);
                });
                return urls;
            },
        );

        console.log('resourceTypeToUrls', resourceTypeToUrls);
        const resourceTypeToAll: Record<string, []> = {};
        // eslint-disable-next-line no-restricted-syntax
        for (const [resourceType, urls] of Object.entries(resourceTypeToUrls)) {
            let allFileData: [] = [];
            // eslint-disable-next-line no-restricted-syntax
            for (const url of urls) {
                // eslint-disable-next-line no-await-in-loop
                const data: any[] = await downloadFile(url);
                // @ts-ignore
                allFileData = allFileData.concat(data);
            }
            resourceTypeToAll[resourceType] = allFileData;
        }

        // console.log('resourceTypeToAll', resourceTypeToAll);

        const entries = Object.entries(resourceTypeToAll);
        for (let i = 0; i < entries.length; i += 1) {
            const resourceType = entries[i][0];
            const fileData = entries[i][1];

            expect(fileData).toContainEqual(resourceTypeToExpectedResources[resourceType]);
        }
    };

    test(
        'Export job completed successfully',
        async () => {
            // TODO Figure out how to check multiple exported file of one resource type
            // const statusPollUrl = await startExportJob();
            // const responseBody = await getExportStatus(statusPollUrl);
            const responseBody = await getExportStatus(
                'https://rzm26l8d7k.execute-api.us-west-2.amazonaws.com/bulkexport/$export/9a6bdda8-f236-4ac5-bd5f-5c8c90ade9f5\n',
            );
            return checkResourceAreInExportedFiles(responseBody.output);
        },
        FIVE_MINUTES_IN_MS,
    );
});
