import axios from 'axios';
import { groupBy, mapValues, uniq, isEqual } from 'lodash';
import sampleBundle from './sampleBundle.json';
import BulkExportTestHelper, { ExportStatusOutput } from './bulkExportTestHelper';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
const { API_URL, API_ACCESS_TOKEN, API_KEY } = process.env;

describe('Bulk Export', () => {
    let bulkExportTestHelper: BulkExportTestHelper;

    beforeAll(() => {
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
    });

    const getExpectedResources = (bundleResponse: any): Record<string, any> => {
        const resourceTypeToResource: any = {};
        sampleBundle.entry.forEach((entry: any) => {
            resourceTypeToResource[entry.resource.resourceType] = entry.resource;
        });

        const resourceTypeToExpectedResource: Record<string, any> = {};
        bundleResponse.entry.forEach((entry: any) => {
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

    const checkResourceInExportedFiles = async (
        outputs: ExportStatusOutput[],
        oldCreatedResourceBundleResponse: any,
        newlyCreatedResourceBundleResponse: any,
    ) => {
        // For each resourceType get all fileUrls
        const resourceTypeToFileUrls: Record<string, string[]> = mapValues(
            groupBy(outputs, 'type'),
            (outs: ExportStatusOutput[]) => {
                return outs.map(out => {
                    return out.url;
                });
            },
        );

        // Get all resources from exported files for each resourceType
        const resourceTypeToResourcesInExportedFiles: Record<string, any[]> = {};
        // eslint-disable-next-line no-restricted-syntax
        for (const [resourceType, urls] of Object.entries(resourceTypeToFileUrls)) {
            const fileDataPromises = urls.map(url => {
                return BulkExportTestHelper.downloadFile(url);
            });
            // eslint-disable-next-line no-await-in-loop
            resourceTypeToResourcesInExportedFiles[resourceType] = (await Promise.all(fileDataPromises)).flat();
        }

        const resourceTypeToExpectedResourcesInFile = getExpectedResources(newlyCreatedResourceBundleResponse);
        // Check that resource is in the corresponding exported data
        Object.entries(resourceTypeToResourcesInExportedFiles).forEach(entry => {
            const [resourceType, fileData] = entry;
            expect(fileData).toContainEqual(resourceTypeToExpectedResourcesInFile[resourceType]);
        });

        // Check that old resources are not in exported data
        if (Object.keys(oldCreatedResourceBundleResponse).length > 0) {
            const resourceTypeToOldResources = getExpectedResources(oldCreatedResourceBundleResponse);
            Object.entries(resourceTypeToResourcesInExportedFiles).forEach(entry => {
                const [resourceType, fileData] = entry;
                expect(fileData).not.toContainEqual(resourceTypeToOldResources[resourceType]);
            });
        }
    };

    test(
        'Successfully export all data added to DB after currentTime',
        async () => {
            // BUILD
            const oldCreatedResourceBundleResponse = await bulkExportTestHelper.sendCreateResourcesRequest();
            const currentTime = new Date();
            const newCreatedResourceBundleResponse = await bulkExportTestHelper.sendCreateResourcesRequest();

            // OPERATE
            // Only export resources that were created after 'currentTime'
            const statusPollUrl = await bulkExportTestHelper.startExportJob({ since: currentTime });
            const responseBody = await bulkExportTestHelper.getExportStatus(statusPollUrl);

            // CHECK
            return checkResourceInExportedFiles(
                responseBody.output,
                oldCreatedResourceBundleResponse,
                newCreatedResourceBundleResponse,
            );
        },
        FIVE_MINUTES_IN_MS,
    );

    function checkOnlyFilesSpecifiedByTypeAreExported(outputs: ExportStatusOutput[], type: string) {
        const expectedFileTypes = type.split(',');
        const fileTypesExported = uniq(
            outputs.map(out => {
                return out.type;
            }),
        );
        expect(isEqual(expectedFileTypes.sort(), fileTypesExported.sort())).toBeTruthy();
    }

    test(
        'Successfully export just Patient data',
        async () => {
            // BUILD
            const newCreatedResourceBundleResponse = await bulkExportTestHelper.sendCreateResourcesRequest();
            const type = 'Patient';

            // OPERATE
            const statusPollUrl = await bulkExportTestHelper.startExportJob({ type });
            const responseBody = await bulkExportTestHelper.getExportStatus(statusPollUrl);

            // CHECK
            checkOnlyFilesSpecifiedByTypeAreExported(responseBody.output, type);
            return checkResourceInExportedFiles(responseBody.output, {}, newCreatedResourceBundleResponse);
        },
        FIVE_MINUTES_IN_MS,
    );

    test(
        'Successfully stop a running export job',
        async () => {
            // BUILD
            const statusPollUrl = await bulkExportTestHelper.startExportJob({});
            // OPERATE
            await bulkExportTestHelper.stopExportJob(statusPollUrl);
            // CHECK
            return bulkExportTestHelper.getExportStatus(statusPollUrl, 'Export job has been canceled');
        },
        FIVE_MINUTES_IN_MS,
    );
});
