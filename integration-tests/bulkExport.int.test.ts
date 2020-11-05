import axios from 'axios';
import { groupBy, mapValues } from 'lodash';
import sampleBundle from './sampleBundle.json';
import BulkExportTestHelper from './bulkExportTestHelper';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
const ONE_MINUTE_IN_MS = 60 * 1000;
const { API_URL, API_ACCESS_TOKEN, API_KEY } = process.env;
let createdResourceBundleResponse: any;
// const createdResourceBundleResponse = {
//     resourceType: 'Bundle',
//     id: '91e576b7-abf9-4848-8a1d-0d8fc1e37f8c',
//     type: 'transaction-response',
//     link: [{ relation: 'self', url: 'https://rzm26l8d7k.execute-api.us-west-2.amazonaws.com/bulkexport' }],
//     entry: [
//         {
//             response: {
//                 status: '201 Created',
//                 location: 'Patient/3c01558b-01b3-4248-86fe-fe9712609180',
//                 etag: '1',
//                 lastModified: '2020-11-05T18:29:26.399Z',
//             },
//         },
//         {
//             response: {
//                 status: '201 Created',
//                 location: 'Practitioner/2293f199-19e0-4706-869c-cd3f6b689804',
//                 etag: '1',
//                 lastModified: '2020-11-05T18:29:26.401Z',
//             },
//         },
//         {
//             response: {
//                 status: '201 Created',
//                 location: 'Encounter/d1032df5-0e4d-4026-ace7-00f2182d723c',
//                 etag: '1',
//                 lastModified: '2020-11-05T18:29:26.402Z',
//             },
//         },
//     ],
// };

describe('Bulk Export', () => {
    let bulkExportTestHelper: BulkExportTestHelper;

    beforeAll(async () => {
        if (API_URL === undefined) {
            throw new Error('API_URL environment variable is not defined');
        }
        if (API_ACCESS_TOKEN === undefined) {
            throw new Error('API_ACCESS_TOKEN environment variable is not defined');
        }
        if (API_KEY === undefined) {
            throw new Error('API_KEY environment variable is not defined');
        }

        const fhirUserAxios = axios.create({
            headers: {
                'x-api-key': API_KEY,
                Authorization: `Bearer ${API_ACCESS_TOKEN}`,
            },
            baseURL: API_URL,
        });

        bulkExportTestHelper = new BulkExportTestHelper(fhirUserAxios);
        try {
            const response = await fhirUserAxios.post('/', sampleBundle);
            createdResourceBundleResponse = response.data;
            console.log('Successfully preloaded data into DB', JSON.stringify(response.data));
        } catch (e) {
            console.log('Failed to preload data into DB', e);
            throw new Error(e);
        }
        return Promise.resolve();
    }, ONE_MINUTE_IN_MS);

    const getExpectedResources = (): Record<string, any> => {
        const resourceTypeToResource: any = {};
        sampleBundle.entry.forEach((entry: any) => {
            resourceTypeToResource[entry.resource.resourceType] = entry.resource;
        });

        const resourceTypeToExpectedResource: Record<string, any> = {};
        createdResourceBundleResponse.entry.forEach((entry: any) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [location, resourceType, id] = entry.response.location.match(/(\w+)\/(.+)/);
            const res = resourceTypeToResource[resourceType];
            res.id = id;
            res.meta = {
                lastUpdated: entry.response.lastModified,
                versionId: entry.response.etag,
            };
            resourceTypeToExpectedResource[resourceType] = res;
        });

        return resourceTypeToExpectedResource;
    };

    const checkResourceAreInExportedFiles = async (outputs: { url: string; type: string }[]) => {
        const resourceTypeToExpectedResources = getExpectedResources();

        // For each resourceType get all fileUrls
        const resourceTypeToFileUrls: Record<string, string[]> = mapValues(
            groupBy(outputs, 'type'),
            (outs: { url: string; type: string }[]) => {
                return outs.map(out => {
                    return out.url;
                });
            },
        );

        // Get all file data for each resourceType
        const resourceTypeToFileData: Record<string, any[]> = {};
        // eslint-disable-next-line no-restricted-syntax
        for (const [resourceType, urls] of Object.entries(resourceTypeToFileUrls)) {
            const fileDataPromises = urls.map(url => {
                return BulkExportTestHelper.downloadFile(url);
            });
            // eslint-disable-next-line no-await-in-loop
            resourceTypeToFileData[resourceType] = (await Promise.all(fileDataPromises)).flat();
        }

        // Check that expected resource is in the corresponding files
        // eslint-disable-next-line no-restricted-syntax
        Object.entries(resourceTypeToFileData).forEach(entry => {
            const [resourceType, fileData] = entry;
            expect(fileData).toContainEqual(resourceTypeToExpectedResources[resourceType]);
        });
    };

    test(
        'Export job completed successfully',
        async () => {
            // const responseBody = await getExportStatus(
            //     'https://rzm26l8d7k.execute-api.us-west-2.amazonaws.com/bulkexport/$export/9a6bdda8-f236-4ac5-bd5f-5c8c90ade9f5',
            // );
            const statusPollUrl = await bulkExportTestHelper.startExportJob();
            const responseBody = await bulkExportTestHelper.getExportStatus(statusPollUrl);
            return checkResourceAreInExportedFiles(responseBody.output);
        },
        FIVE_MINUTES_IN_MS,
    );

    test(
        'Stop export job completed successfully',
        async () => {
            const statusPollUrl = await bulkExportTestHelper.startExportJob();
            await bulkExportTestHelper.stopExportJob(statusPollUrl);
            await bulkExportTestHelper.getExportStatus(statusPollUrl, 'Export job has been canceled');
        },
        FIVE_MINUTES_IN_MS,
    );
});
