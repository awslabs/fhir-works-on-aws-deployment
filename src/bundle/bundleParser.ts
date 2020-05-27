/* eslint-disable import/extensions */
/* eslint-disable no-restricted-syntax */
import uuidv4 from 'uuid/v4';
import flatten from 'flat';
import get from 'lodash/get';
import set from 'lodash/set';
import BatchReadWriteRequest, {
    BatchReadWriteRequestType,
    HttpTypeToBatchReadWriteRequestType,
} from '../dataServices/ddb/batchReadWriteRequest';
import {
    captureFullUrlParts,
    captureIdFromUrn,
    captureResourceIdRegExp,
    captureResourceTypeRegExp,
    captureVersionIdRegExp,
} from '../regExpressions';
import DataServiceInterface from '../dataServices/dataServiceInterface';
import ServiceResponse from '../common/serviceResponse';

export default class BundleParser {
    public static async parseResource(
        bundleRequestJson: any,
        dataService: DataServiceInterface,
        serverUrl: string,
    ): Promise<BatchReadWriteRequest[]> {
        const requestsWithReference: BatchReadWriteRequestWithReference[] = [];
        const requests: BatchReadWriteRequest[] = [];
        bundleRequestJson.entry.forEach((entry: any) => {
            const bundleEntryRequestType = this.getBundleType(entry.request.url, entry.request.method);
            if (bundleEntryRequestType === BatchReadWriteRequestType.V_READ) {
                throw new Error('We currently do not support V_READ entries in the Bundle');
            }
            if (bundleEntryRequestType === BatchReadWriteRequestType.SEARCH) {
                throw new Error('We currently do not support SEARCH entries in the Bundle');
            }

            const request: any = {
                type: bundleEntryRequestType,
                resource: entry.resource || entry.request.url, // GET requests, only contains the URL of the resource
                fullUrl: entry.fullUrl || '',
                resourceType: this.getResourceType(entry, bundleEntryRequestType),
                id: this.getResourceId(entry, bundleEntryRequestType),
            };

            const references = this.getReferences(entry);
            if (references) {
                request.references = references;
                requestsWithReference.push(request);
            } else {
                requests.push(request);
            }
        });

        return this.updateReferenceRequestsIfNecessary(requests, requestsWithReference, dataService, serverUrl);
    }

    private static async updateReferenceRequestsIfNecessary(
        requests: BatchReadWriteRequest[],
        requestsWithReference: BatchReadWriteRequestWithReference[],
        dataService: DataServiceInterface,
        serverUrl: string,
    ): Promise<BatchReadWriteRequest[]> {
        const resourceFullUrlToRequest: Record<string, BatchReadWriteRequest> = {};

        const resourceWithReferenceIdToRequest: Record<string, BatchReadWriteRequestWithReference> = {};

        const allResourceIdToRequests: Record<string, BatchReadWriteRequest> = {};
        requests.forEach(request => {
            if (request.fullUrl) {
                resourceFullUrlToRequest[request.fullUrl] = request;
            } else {
                // Resource without a fullUrl can't be referenced, therefore we won't need to do any transformation on it
                allResourceIdToRequests[request.id] = request;
            }
        });

        requestsWithReference.forEach(request => {
            resourceWithReferenceIdToRequest[request.id] = request;
            // request with a fullUrl have the potential of being referenced
            if (request.fullUrl) {
                resourceFullUrlToRequest[request.fullUrl] = request;
            }
        });

        /*
        Handle internal references cases

        For each resource that has reference(s) to another resource
            For each of those reference
                Does the reference refer to another resource in the Bundle?
                    If the resource refers to another resource in the Bundle, update this resource's referenceId to be the id of the resourceBeingReferenced
        */
        for (const [resourceWithReferenceId, resWithReferenceRequest] of Object.entries(
            resourceWithReferenceIdToRequest,
        )) {
            let resourceWithReferenceIdWasUpdated = false;
            resWithReferenceRequest.references.forEach(reference => {
                if (reference.referenceFullUrl in resourceFullUrlToRequest) {
                    const resourceBeingReferenced: BatchReadWriteRequest =
                        resourceFullUrlToRequest[reference.referenceFullUrl];
                    const { id } = resourceBeingReferenced;

                    // If resourceBeingReferenced is not already in allResourceIdToRequests, then add it to allResourceIdToRequests
                    if (!(resourceBeingReferenced.id in allResourceIdToRequests)) {
                        // @ts-ignore
                        allResourceIdToRequests[resourceBeingReferenced.id] = resourceBeingReferenced;
                    }

                    set(
                        resWithReferenceRequest,
                        `resource.${reference.referencePath}`,
                        `${resourceBeingReferenced.resourceType}/${id}`,
                    );
                    resourceWithReferenceIdWasUpdated = true;
                }
            });

            if (resourceWithReferenceIdWasUpdated) {
                allResourceIdToRequests[resourceWithReferenceId] = resWithReferenceRequest;
                delete resourceWithReferenceIdToRequest[resourceWithReferenceId];
            }
        }

        // If references in Bundle does not match the fullUrl of any entries in the Bundle and the reference has the same
        // rootUrl as the server, we check if the server has that reference. If server does not have the
        // reference we throw an error
        for (const [resWithReferenceId, resWithRefRequest] of Object.entries(resourceWithReferenceIdToRequest)) {
            let resWithRefRequestWasUpdated = false;
            for (let i = 0; i < resWithRefRequest.references.length; i += 1) {
                const reference = resWithRefRequest.references[i];
                if ([serverUrl, `${serverUrl}/`].includes(reference.rootUrl)) {
                    let response = new ServiceResponse(false);
                    if (reference.versionId) {
                        // eslint-disable-next-line no-await-in-loop
                        response = await dataService.getVersionedResource(
                            reference.resourceType,
                            reference.id,
                            reference.versionId,
                        );
                    } else {
                        // eslint-disable-next-line no-await-in-loop
                        response = await dataService.getResource(reference.resourceType, reference.id);
                    }
                    if (response.success) {
                        resWithRefRequestWasUpdated = true;
                        set(
                            resWithRefRequest,
                            `resource.${reference.referencePath}`,
                            `${resWithRefRequest.resourceType}/${reference.id}`,
                        );
                    } else {
                        throw new Error(
                            `This entry refer to a resource that does not exist on this server. Entry is referring to '${reference.resourceType}/${reference.id}'`,
                        );
                    }
                }
            }
            if (resWithRefRequestWasUpdated) {
                allResourceIdToRequests[resWithReferenceId] = resWithRefRequest;
                delete resourceWithReferenceIdToRequest[resWithReferenceId];
            }
        }

        // If we still have any entries in 'resourceWithReferenceIdToRequest' then those entries must not be referencing to any entry
        // in the Bundle or on the server. Those entries must be referring to resources on an external server
        Object.keys(resourceWithReferenceIdToRequest).forEach((resWithRefId: string) => {
            if (!(resWithRefId in allResourceIdToRequests)) {
                const request = resourceWithReferenceIdToRequest[resWithRefId];
                console.log('This resource has a reference to an external server', request.fullUrl);
                allResourceIdToRequests[resWithRefId] = request;
            }
        });

        // Add back in any resources with fullUrl that wasn't referenced
        const fullUrlsOfUpdatedRequests = Object.values(allResourceIdToRequests).map(req => req.fullUrl);
        for (const [resFullUrl, req] of Object.entries(resourceFullUrlToRequest)) {
            if (!(resFullUrl in fullUrlsOfUpdatedRequests)) {
                allResourceIdToRequests[req.id] = req;
            }
        }

        return Object.values(allResourceIdToRequests).map(request => {
            const updatedRequest = request;
            delete updatedRequest.references;
            return updatedRequest;
        });
    }

    private static getReferences(entry: any): Reference[] | undefined {
        const flattenResource: any = flatten(get(entry, 'resource', {}));
        const referencePaths: string[] = Object.keys(flattenResource).filter(key => key.includes('reference'));
        if (referencePaths.length === 0) {
            return undefined;
        }

        const references: Reference[] = referencePaths.map(referencePath => {
            const entryReference = get(entry.resource, referencePath);
            const idFromUrnMatch = entryReference.match(captureIdFromUrn);
            if (idFromUrnMatch) {
                const urlRoot = idFromUrnMatch[1];
                return {
                    resourceType: '',
                    id: idFromUrnMatch[2],
                    versionId: '',
                    rootUrl: urlRoot,
                    referenceFullUrl: `${urlRoot}${idFromUrnMatch[2]}`,
                    referencePath,
                };
            }

            const fullUrlMatch = entryReference.match(captureFullUrlParts);
            if (fullUrlMatch) {
                let rootUrl = fullUrlMatch[1];
                // If the reference doesn't have a urlRoot, check if the entry's fullUrl has a urlRoot
                if (rootUrl === undefined) {
                    if (entry.fullUrl.length > 0 && entry.fullUrl.match(captureFullUrlParts)) {
                        // eslint-disable-next-line prefer-destructuring
                        rootUrl = entry.fullUrl.match(captureFullUrlParts)[1];
                    }
                }
                const resourceType = fullUrlMatch[2];
                const id = fullUrlMatch[3];
                let fullUrl = `${rootUrl}${resourceType}/${id}`;
                const versionId = fullUrlMatch[4];
                if (versionId) {
                    fullUrl += `/_history/${versionId}`;
                }
                return {
                    resourceType,
                    id,
                    versionId,
                    rootUrl,
                    referenceFullUrl: fullUrl,
                    referencePath,
                };
            }

            throw new Error(
                `This entry's reference is not recognized. Entry's reference is: ${entryReference} . Valid format includes "<url>/resourceType/id" or "<urn:uuid:|urn:oid:><id>`,
            );
        });

        return references;
    }

    private static getVersionId(url: string): number {
        const match = url.match(captureVersionIdRegExp);
        if (!match) {
            throw new Error(`Bundle entry does not contain versionId: ${url}`);
        }
        // IDs are in the form <resource-type>/<id>/_history/<versionId>
        // exp. Patient/abcd1234/_history/2
        // eslint-disable-next-line prefer-destructuring
        const versionId = Number(match[1]);
        return versionId;
    }

    private static getResourceId(entry: any, bundleEntryRequestType: BatchReadWriteRequestType) {
        let id = '';
        if (bundleEntryRequestType === BatchReadWriteRequestType.CREATE) {
            id = uuidv4();
        } else if (bundleEntryRequestType === BatchReadWriteRequestType.UPDATE) {
            id = entry.resource.id;
        } else if (
            bundleEntryRequestType === BatchReadWriteRequestType.READ ||
            bundleEntryRequestType === BatchReadWriteRequestType.V_READ ||
            bundleEntryRequestType === BatchReadWriteRequestType.SEARCH ||
            bundleEntryRequestType === BatchReadWriteRequestType.DELETE
        ) {
            const { url } = entry.request;
            const match = url.match(captureResourceIdRegExp);
            if (!match) {
                throw new Error(`Bundle entry does not contain resourceId: ${url}`);
            }
            // IDs are in the form <resource-type>/id
            // exp. Patient/abcd1234
            // eslint-disable-next-line prefer-destructuring
            id = match[1];
        }

        return id;
    }

    private static getResourceType(entry: any, bundleEntryRequestType: BatchReadWriteRequestType) {
        let resourceType = '';
        if (
            bundleEntryRequestType === BatchReadWriteRequestType.CREATE ||
            bundleEntryRequestType === BatchReadWriteRequestType.UPDATE
        ) {
            resourceType = entry.resource.resourceType;
        } else if (
            bundleEntryRequestType === BatchReadWriteRequestType.READ ||
            bundleEntryRequestType === BatchReadWriteRequestType.V_READ ||
            bundleEntryRequestType === BatchReadWriteRequestType.SEARCH ||
            bundleEntryRequestType === BatchReadWriteRequestType.DELETE
        ) {
            const { url } = entry.request;
            const match = url.match(captureResourceTypeRegExp);
            if (!match) {
                throw new Error(`Bundle entry does not contain valid url format: ${url}`);
            }
            // IDs are in the form <resource-type>/id
            // exp. Patient/abcd1234
            // eslint-disable-next-line prefer-destructuring
            resourceType = match[1];
        }
        return resourceType;
    }

    // eslint-disable-next-line class-methods-use-this
    private static getBundleType(url: string, method: string) {
        if (method === 'GET') {
            if (url.match(captureVersionIdRegExp)) {
                return BatchReadWriteRequestType.V_READ;
            }
            if (url.match(captureResourceIdRegExp)) {
                return BatchReadWriteRequestType.READ;
            }
            return BatchReadWriteRequestType.SEARCH;
        }
        return HttpTypeToBatchReadWriteRequestType[method];
    }
}

interface BatchReadWriteRequestWithReference extends BatchReadWriteRequest {
    references: Reference[];
}

interface Reference {
    resourceType: string;
    id: string;
    versionId: string;
    rootUrl: string;
    referenceFullUrl: string;
    referencePath: string;
}
