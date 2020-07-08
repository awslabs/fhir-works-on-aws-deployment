/* eslint-disable class-methods-use-this */
// eslint-disable-next-line import/extensions
import mime from 'mime-types';
import { SEPARATOR } from '../../constants';
import {
    Persistence,
    ReadResourceRequest,
    vReadResourceRequest,
    CreateResourceRequest,
    DeleteResourceRequest,
    UpdateResourceRequest,
    PatchResourceRequest,
    ConditionalDeleteResourceRequest,
} from '../../interface/persistence';
import GenericResponse from '../../interface/genericResponse';
import S3ObjectStorageService from './s3ObjectStorageService';
import { FhirVersion } from '../../interface/constants';

export default class S3DataService implements Persistence {
    updateCreateSupported: boolean = false;

    private readonly dbPersistenceService: Persistence;

    private readonly fhirVersion: FhirVersion;

    constructor(dbPersistenceService: Persistence, fhirVersion: FhirVersion) {
        this.dbPersistenceService = dbPersistenceService;
        this.fhirVersion = fhirVersion;
    }

    async readResource(request: ReadResourceRequest): Promise<GenericResponse> {
        const getResponse = await this.dbPersistenceService.readResource(request);
        return this.getBinaryGetUrl(getResponse, request.id);
    }

    async vReadResource(request: vReadResourceRequest): Promise<GenericResponse> {
        const getResponse = await this.dbPersistenceService.vReadResource(request);
        return this.getBinaryGetUrl(getResponse, request.id);
    }

    async createResource(request: CreateResourceRequest) {
        // Delete binary data because we don't want to store the content in the data service, we store the content
        // as an object in the objStorageService
        if (this.fhirVersion === '3.0.1') {
            delete request.resource.content;
        } else {
            delete request.resource.data;
        }

        const createResponse = await this.dbPersistenceService.createResource(request);
        if (!createResponse.success) {
            return createResponse;
        }
        const { resource } = createResponse;

        const fileName = this.getFileName(resource.id, resource.meta.versionId, resource.contentType);

        const presignedPutUrlResponse = await S3ObjectStorageService.getPresignedPutUrl(fileName);
        if (!presignedPutUrlResponse.success) {
            await this.dbPersistenceService.deleteResource({ resourceType: request.resourceType, id: resource.id });
            const message = 'Failed to generate presigned PUT Url';
            return { success: false, message };
        }

        const updatedResource = { ...resource };
        updatedResource.presignedPutUrl = presignedPutUrlResponse.message;
        return {
            success: true,
            message: 'Resource created',
            resource: updatedResource,
        };
    }

    async updateResource(request: UpdateResourceRequest) {
        if (this.fhirVersion === '3.0.1') {
            delete request.resource.content;
        } else {
            delete request.resource.data;
        }

        const updateResponse = await this.dbPersistenceService.updateResource(request);
        if (!updateResponse.success) {
            return updateResponse;
        }
        const { resource } = updateResponse;

        const fileName = this.getFileName(resource.id, resource.meta.versionId, resource.contentType);

        const presignedPutUrlResponse = await S3ObjectStorageService.getPresignedPutUrl(fileName);
        if (!presignedPutUrlResponse.success) {
            // TODO make this an update
            await this.dbPersistenceService.deleteResource({ resourceType: request.resourceType, id: resource.id });
            const message = 'Failed to generate presigned PUT Url';
            return { success: false, message };
        }

        const updatedResource = { ...resource };
        updatedResource.presignedPutUrl = presignedPutUrlResponse.message;
        return {
            success: true,
            message: 'Resource updated',
            resource: updatedResource,
        };
    }

    async deleteResource(request: DeleteResourceRequest) {
        const getResponse = await this.dbPersistenceService.readResource(request);
        if (getResponse.success) {
            const deleteObjResponse = await S3ObjectStorageService.deleteBasedOnPrefix(request.id);
            if (!deleteObjResponse.success) {
                const message = 'Failed to delete binary resource from object storage';
                return { success: false, message };
            }
        } else {
            return getResponse;
        }

        const deleteResponse = await this.dbPersistenceService.deleteResource(request);
        if (!deleteResponse.success) {
            return deleteResponse;
        }

        return { success: true, message: 'Resource deleted' };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    conditionalCreateResource(request: CreateResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    conditionalUpdateResource(request: UpdateResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    patchResource(request: PatchResourceRequest): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    conditionalPatchResource(request: PatchResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    conditionalDeleteResource(request: ConditionalDeleteResourceRequest, queryParams: any): Promise<GenericResponse> {
        throw new Error('Method not implemented.');
    }

    private getFileName(id: string, versionId: string, contentType: string) {
        const fileExtension = mime.extension(contentType);
        return `${id}${SEPARATOR}${versionId}.${fileExtension}`;
    }

    private async getBinaryGetUrl(dbResponse: GenericResponse, id: string): Promise<GenericResponse> {
        if (!dbResponse.success) {
            return dbResponse;
        }
        const fileName = this.getFileName(id, dbResponse.resource.meta.versionId, dbResponse.resource.contentType);
        const presignedGetUrlResponse = await S3ObjectStorageService.getPresignedGetUrl(fileName);

        if (!presignedGetUrlResponse.success) {
            const message = 'Unable to retrieve binary object';
            return { success: false, message };
        }

        const binary = dbResponse.resource;
        // Add binary content to message
        binary.presignedGetUrl = presignedGetUrlResponse.message;

        return { success: true, message: 'Item found', resource: binary };
    }
}
