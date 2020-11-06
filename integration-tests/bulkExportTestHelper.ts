/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable class-methods-use-this */
/*  eslint-disable import/no-extraneous-dependencies */
import axios, { AxiosInstance } from 'axios';
import { cloneDeep, groupBy, mapValues } from 'lodash';
import createBundle from './createPatientPractitionerEncounterBundle.json';

export default class BulkExportTestHelper {
    THREE_MINUTES_IN_MS = 3 * 60 * 1000;

    fhirUserAxios: AxiosInstance;

    constructor(fhirUserAxios: AxiosInstance) {
        this.fhirUserAxios = fhirUserAxios;
    }

    async startExportJob(startExportJobParam: StartExportJobParam) {
        try {
            const params: any = {
                _outputFormat: 'ndjson',
            };
            if (startExportJobParam.since) {
                // eslint-disable-next-line no-underscore-dangle
                params._since = startExportJobParam.since.toISOString();
            }
            if (startExportJobParam.type) {
                // eslint-disable-next-line no-underscore-dangle
                params._type = startExportJobParam.type;
            }
            // const urlSearchParams = new URLSearchParams(params);
            const response = await this.fhirUserAxios.get('/$export', { params });
            const statusPollUrl = response.headers['content-location'];
            console.log('statusPollUrl', statusPollUrl);
            return statusPollUrl;
        } catch (e) {
            console.error('Failed to start export job', e);
            throw e;
        }
    }

    async stopExportJob(statusPollUrl: string) {
        try {
            await this.fhirUserAxios.delete(statusPollUrl);
        } catch (e) {
            console.error('Failed to stop export job', e);
            throw e;
        }
    }

    async getExportStatus(statusPollUrl: string, expectedSubstring = ''): Promise<any> {
        const threeMinuteFromNow = new Date(new Date().getTime() + this.THREE_MINUTES_IN_MS);
        while (new Date().getTime() < threeMinuteFromNow.getTime()) {
            try {
                console.log('Checking export status');
                // eslint-disable-next-line no-await-in-loop
                const response = await this.fhirUserAxios.get(statusPollUrl);
                if (response.status === 200) {
                    if (expectedSubstring === '' || (expectedSubstring && response.data === expectedSubstring)) {
                        return response.data;
                    }
                }
                // eslint-disable-next-line no-await-in-loop
                await this.sleep(5000);
            } catch (e) {
                console.error('Failed to getExport status', e);
                throw e;
            }
        }
        throw new Error(
            `Expected export status did not occur during polling time frame of ${this.THREE_MINUTES_IN_MS /
                1000} seconds`,
        );
    }

    async sendCreateResourcesRequest() {
        try {
            const response = await this.fhirUserAxios.post('/', createBundle);
            console.log('Successfully sent create resource request to FHIR server', JSON.stringify(response.data));
            return response.data;
        } catch (e) {
            console.log('Failed to preload data into DB', e);
            throw new Error(e);
        }
    }

    // This method does not require FHIR user credentials in the header because the url is an S3 presigned URL
    static async downloadFile(url: string): Promise<any[]> {
        try {
            const resp = await axios.get(url, { responseType: 'blob' });
            // When export file only has one line, axios parse the response as an object, otherwise
            // axios parse the response as a string
            return typeof resp.data === 'string'
                ? resp.data.split('\n').map((resource: string) => JSON.parse(resource))
                : [resp.data];
        } catch (e) {
            console.error('Failed to download file', e);
            throw e;
        }
    }

    getResources(bundleResponse: any): Record<string, any> {
        const resourceTypeToResource: any = {};
        cloneDeep(createBundle).entry.forEach((entry: any) => {
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
    }

    async checkResourceInExportedFiles(
        outputs: ExportStatusOutput[],
        resTypToResExpectedInExport: Record<string, any>,
        resTypToResNotExpectedInExport: Record<string, any> = {},
    ) {
        // For each resourceType get all fileUrls
        const resourceTypeToFileUrls: Record<string, string[]> = mapValues(
            groupBy(outputs, 'type'),
            (outs: ExportStatusOutput[]) => {
                return outs.map(out => out.url);
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

        expect(Object.keys(resourceTypeToResourcesInExportedFiles).sort()).toEqual(
            Object.keys(resTypToResExpectedInExport).sort(),
        );
        // Check that resources were exported to S3 files
        Object.entries(resourceTypeToResourcesInExportedFiles).forEach(entry => {
            const [resourceType, resourcesInExportedFile] = entry;
            expect(resourcesInExportedFile).toContainEqual(resTypToResExpectedInExport[resourceType]);
        });

        // Check that resources were not exported to S3 files
        if (Object.keys(resTypToResNotExpectedInExport).length > 0) {
            Object.entries(resourceTypeToResourcesInExportedFiles).forEach(entry => {
                const [resourceType, fileData] = entry;
                expect(fileData).not.toContainEqual(resTypToResNotExpectedInExport[resourceType]);
            });
        }
    }

    async sleep(milliseconds: number) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }
}
export interface ExportStatusOutput {
    url: string;
    type: string;
}

export interface StartExportJobParam {
    since?: Date;
    type?: string;
}
