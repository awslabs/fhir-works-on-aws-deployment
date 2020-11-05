/* eslint-disable class-methods-use-this */
// eslint-disable-next-line import/no-extraneous-dependencies
import axios, { AxiosInstance } from 'axios';

export default class BulkExportTestHelper {
    THREE_MINUTES_IN_MS = 3 * 60 * 1000;

    fhirUserAxios: AxiosInstance;

    constructor(fhirUserAxios: AxiosInstance) {
        this.fhirUserAxios = fhirUserAxios;
    }

    async startExportJob() {
        try {
            const response = await this.fhirUserAxios.get('/$export?_outputFormat=ndjson');
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

    async sleep(milliseconds: number) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }
}
