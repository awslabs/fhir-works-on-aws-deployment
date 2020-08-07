/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-restricted-syntax */
import uuidv4 from 'uuid/v4';
import flatten from 'flat';
import get from 'lodash/get';
import set from 'lodash/set';
import GenericResponse from '../../interface/genericResponse';
import { BatchReadWriteRequest, Reference } from '../../interface/bundle';
import {
    captureFullUrlParts,
    captureIdFromUrn,
    captureResourceIdRegExp,
    captureResourceTypeRegExp,
} from '../../regExpressions';
import { Persistence } from '../../interface/persistence';
import { TypeOperation, SystemOperation } from '../../interface/constants';
import { getRequestInformation } from '../../interface/utilities';

export default class BundleParser {
    static SELF_CONTAINED_REFERENCE = 'SELF_CONTAINED_REFERENCE';

    /**
     * Parse a Bundle request to make sure the request is valid, and update the internal references
     * of the Bundle entries to be valid and internally consistent
     * @param bundleRequestJson - the full Bundle json request as a JS object
     * @param dataService - the Persistence object that will be used to verify references to resource on the server
     * @param serverUrl - the base URL of thhe server
     * @return BatchReadWriteRequests that can be executed to write the Bundle entries to the Database
     */
    public static async parseResource(
        bundleRequestJson: any,
        dataService: Persistence,
        serverUrl: string,
    ): Promise<BatchReadWriteRequest[]> {
        const requests: BatchReadWriteRequest[] = [];
        bundleRequestJson.entry.forEach((entry: any) => {
            const operation = this.getOperation(entry);
            const request: BatchReadWriteRequest = {
                operation,
                resource: entry.resource || entry.request.url, // GET requests, only contains the URL of the resource
                fullUrl: entry.fullUrl || '',
                resourceType: this.getResourceType(entry, operation),
                id: this.getResourceId(entry, operation),
            };

            const references = this.getReferences(entry);
            if (references.length > 0) {
                request.references = references;
            }
            requests.push(request);
        });

        return this.updateReferenceRequestsIfNecessary(requests, dataService, serverUrl);
    }

    /**
     * Given a Bundle entry, parse that entry to see what operation that entry wants to perform. Throw an error
     * if the FHIR server does not support that operation for Bundles
     * @param entry - The Bundle entry we want to get the operation for
     * @return TypeOperation
     * @throws Error
     */
    private static getOperation(entry: any): TypeOperation {
        const { operation } = getRequestInformation(entry.request.method, entry.request.url);
        if (operation === 'vread') {
            throw new Error('We currently do not support V_READ entries in the Bundle');
        }
        if (operation === 'search-system' || operation === 'search-type') {
            throw new Error('We currently do not support SEARCH entries in the Bundle');
        }
        if (operation === 'history-system' || operation === 'history-type' || operation === 'history-instance') {
            throw new Error('We currently do not support HISTORY entries in the Bundle');
        }
        if (operation === 'transaction' || operation === 'batch') {
            throw new Error('We currently do not support Bundle entries in the Bundle');
        }
        if (operation === 'patch') {
            throw new Error('We currently do not support PATCH entries in the Bundle');
        }
        return operation;
    }

    /**
     * Given a Bundle, get all of the resources and the operations on those resources for that Bundle
     * Eg. Patient: ['create', 'update'], means there were at least two entries in the bundle. There was at least
     * one entry requesting to create Patient, and at least one entry requesting to update Patient.
     * @param bundleRequestJson - the full Bundle json request as a JS object
     * @return Record with resourceType as the key, and an array of TypeOperations as the value
     */
    public static getResourceTypeOperationsInBundle(bundleRequestJson: any): Record<string, TypeOperation[]> {
        const resourceTypeToOperations: Record<string, TypeOperation[]> = {};
        bundleRequestJson.entry.forEach((entry: any) => {
            const operation = this.getOperation(entry);
            const resourceType = this.getResourceType(entry, operation);
            if (resourceTypeToOperations[resourceType]) {
                const operations = new Set(resourceTypeToOperations[resourceType]);
                operations.add(operation);
                resourceTypeToOperations[resourceType] = Array.from(operations);
            } else {
                resourceTypeToOperations[resourceType] = [operation];
            }
        });
        return resourceTypeToOperations;
    }

    /**
     * Check that all references within the Bundle is valid and update them as required
     * If entry X in the bundle has a reference to entry Y within the bundle,
     * update the reference to use the server assigned id for entry Y
     * @param requests - entries from the Bundle that has been parsed into BatchReadWriteRequests
     * @param dataService - the Persistence object that will be used to verify references to resource on the server
     * @param serverUrl - the base URL of thhe server
     * return BatchReadWriteRequests that can be executed to write the Bundle entries to the Database
     */
    private static async updateReferenceRequestsIfNecessary(
        requests: BatchReadWriteRequest[],
        dataService: Persistence,
        serverUrl: string,
    ): Promise<BatchReadWriteRequest[]> {
        const fullUrlToRequest: Record<string, BatchReadWriteRequest> = {};
        const idToRequestWithRef: Record<string, BatchReadWriteRequest> = {};
        const allRequests: BatchReadWriteRequest[] = [];
        const requestsWithReference: BatchReadWriteRequest[] = [];
        const requestsWithoutReference: BatchReadWriteRequest[] = [];
        const orderedBundleEntriesId: string[] = [];

        requests.forEach(req => {
            orderedBundleEntriesId.push(req.id);
            if (req.references) {
                requestsWithReference.push(req);
            } else {
                requestsWithoutReference.push(req);
            }
        });

        requestsWithoutReference.forEach(request => {
            if (request.fullUrl) {
                fullUrlToRequest[request.fullUrl] = request;
            } else {
                // Resource without a fullUrl can't be referenced, therefore we won't need to do any transformation on it
                allRequests.push(request);
            }
        });

        requestsWithReference.forEach(request => {
            idToRequestWithRef[request.id] = request;
            // request with a fullUrl have the potential of being referenced
            if (request.fullUrl) {
                fullUrlToRequest[request.fullUrl] = request;
            }
        });

        return this.checkReferences(
            orderedBundleEntriesId,
            idToRequestWithRef,
            fullUrlToRequest,
            allRequests,
            serverUrl,
            dataService,
        );
    }

    /**
     * Check that references are valid, and update the id of internal references
     * @param orderedBundleEntriesId - Ordered list of ids from the Bundle entries
     * @param idToRequestWithRef - Record with request Id as the key and a request that has a reference as the value
     * @param fullUrlToRequest - Record with full url of the request as key and the request as the value
     * @param allRequests - all requests in the Bundle that does not have a full Url
     * @param serverUrl - the base URL of thhe server
     * @param dataService - the Persistence object that will be used to verify references to resource on the server
     * @return BatchReadWriteRequests that can be executed to write the Bundle entries to the Database
     */
    private static async checkReferences(
        orderedBundleEntriesId: string[],
        idToRequestWithRef: Record<string, BatchReadWriteRequest>,
        fullUrlToRequest: Record<string, BatchReadWriteRequest>,
        allRequests: BatchReadWriteRequest[],
        serverUrl: string,
        dataService: Persistence,
    ): Promise<BatchReadWriteRequest[]> {
        for (let i = 0; i < Object.values(idToRequestWithRef).length; i += 1) {
            const requestWithRef = Object.values(idToRequestWithRef)[i];
            if (requestWithRef.references) {
                for (let j = 0; j < requestWithRef.references.length; j += 1) {
                    const reference = requestWithRef.references[j];

                    let referenceIsFound = false;
                    if (reference.referenceFullUrl === this.SELF_CONTAINED_REFERENCE) {
                        referenceIsFound = this.checkReferencesForContainedResources(requestWithRef, reference);
                    }

                    // If reference refers to another resource in the bundle, change the id of the reference to match the
                    // id of the resource.
                    if (reference.referenceFullUrl in fullUrlToRequest) {
                        const reqBeingReferenced: BatchReadWriteRequest = fullUrlToRequest[reference.referenceFullUrl];
                        const { id } = reqBeingReferenced;

                        set(
                            requestWithRef,
                            `resource.${reference.referencePath}`,
                            `${reqBeingReferenced.resourceType}/${id}`,
                        );
                        referenceIsFound = true;
                        requestWithRef.references[j] = reference;
                    }

                    // If references in the Bundle entries does not match the fullUrl of any entries in the Bundle and the reference has the same
                    // rootUrl as the server, we check if the server has that reference. If the server does not have the
                    // reference we throw an error
                    if (!referenceIsFound && [serverUrl, `${serverUrl}/`].includes(reference.rootUrl)) {
                        let response: GenericResponse;
                        if (reference.vid) {
                            // eslint-disable-next-line no-await-in-loop
                            response = await dataService.vReadResource({
                                resourceType: reference.resourceType,
                                id: reference.id,
                                vid: reference.vid,
                            });
                        } else {
                            try {
                                // eslint-disable-next-line no-await-in-loop
                                response = await dataService.readResource({
                                    resourceType: reference.resourceType,
                                    id: reference.id,
                                });
                            } catch (err) {
                                response = { success: false, message: '' };
                            }
                        }
                        if (response.success) {
                            set(
                                requestWithRef,
                                `resource.${reference.referencePath}`,
                                `${requestWithRef.resourceType}/${reference.id}`,
                            );
                            referenceIsFound = true;
                        } else {
                            throw new Error(
                                `This entry refer to a resource that does not exist on this server. Entry is referring to '${reference.resourceType}/${reference.id}'`,
                            );
                        }
                    }
                    if (!referenceIsFound) {
                        console.log('This resource has a reference to an external server', requestWithRef.fullUrl);
                    }
                }
                allRequests.push(requestWithRef);
            }
        }
        const allRequestIds = allRequests.map(req => {
            return req.id;
        });

        // Add to allRequests, request with fullUrl but was not referenced by any bundle entry
        Object.values(fullUrlToRequest).forEach(req => {
            if (!allRequestIds.includes(req.id)) {
                allRequests.push(req);
            }
        });

        // @ts-ignore
        const orderedAllRequests: BatchReadWriteRequest[] = orderedBundleEntriesId.map(id => {
            return allRequests.find(request => {
                return id === request.id;
            });
        });

        return Object.values(orderedAllRequests).map(request => {
            const updatedRequest = request;
            delete updatedRequest.references;
            return updatedRequest;
        });
    }

    /**
     * Check whether the reference in a request refers to a contained resource, and if it does, check
     * whether the contained resource exist
     * @param requestWithRef - A request that has references
     * @param reference - A reference belonging to that request
     * @return Whether the contained resource the reference is referring to exist in the request
     */
    private static checkReferencesForContainedResources(
        requestWithRef: BatchReadWriteRequest,
        reference: Reference,
    ): boolean {
        // https://www.hl7.org/fhir/references.html#contained
        let isFound: boolean = false;
        if (requestWithRef.resource.contained) {
            const containedIds = requestWithRef.resource.contained.map((containedResource: any) => {
                return containedResource.id;
            });
            isFound = containedIds.includes(reference.id);
        }
        if (!isFound) {
            throw new Error(
                `This entry refer to a contained resource that does not exist. Contained resource is referring to #${reference.id}`,
            );
        }
        return isFound;
    }

    /**
     * Given a Bundle entry, get all references in the Bundle entry
     * @param entry - An entry from the Bundle
     * @return - any references that the entry contains
     */
    private static getReferences(entry: any): Reference[] {
        const flattenResource: any = flatten(get(entry, 'resource', {}));
        const referencePaths: string[] = Object.keys(flattenResource).filter(key => key.includes('reference'));
        if (referencePaths.length === 0) {
            return [];
        }

        const references: Reference[] = referencePaths.map(referencePath => {
            const entryReference = get(entry.resource, referencePath);
            const idFromUrnMatch = entryReference.match(captureIdFromUrn);
            if (idFromUrnMatch) {
                const urlRoot = idFromUrnMatch[1];
                return {
                    resourceType: '',
                    id: idFromUrnMatch[2],
                    vid: '',
                    rootUrl: urlRoot,
                    referenceFullUrl: `${urlRoot}${idFromUrnMatch[2]}`,
                    referencePath,
                    referenceIsValidated: false,
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
                const vid = fullUrlMatch[4];
                if (vid) {
                    fullUrl += `/_history/${vid}`;
                }
                return {
                    resourceType,
                    id,
                    vid,
                    rootUrl,
                    referenceFullUrl: fullUrl,
                    referencePath,
                    referenceIsValidated: false,
                };
            }
            // https://www.hl7.org/fhir/references.html#contained
            if (entryReference.substring(0, 1) === '#') {
                return {
                    resourceType: '',
                    id: entryReference.substring(1, entryReference.length),
                    vid: '',
                    rootUrl: '',
                    referenceFullUrl: this.SELF_CONTAINED_REFERENCE,
                    referencePath,
                    referenceIsValidated: false,
                };
            }

            throw new Error(
                `This entry's reference is not recognized. Entry's reference is: ${entryReference} . Valid format includes "<url>/resourceType/id" or "<urn:uuid:|urn:oid:><id>`,
            );
        });

        return references;
    }

    /**
     * Get the resource id specified in the entry
     * @param entry - Entry to parse
     * @param operation - Operation specified in the entry
     */
    private static getResourceId(entry: any, operation: TypeOperation | SystemOperation) {
        let id = '';
        if (operation === 'create') {
            id = uuidv4();
        } else if (operation === 'update' || operation === 'patch') {
            id = entry.resource.id;
        } else if (
            operation === 'read' ||
            operation === 'vread' ||
            operation === 'history-instance' ||
            operation === 'delete'
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

    /**
     * Get the resource type specified in the entry
     * @param entry - Entry to parse
     * @param operation - Operation speficied in the entry
     */
    private static getResourceType(entry: any, operation: TypeOperation | SystemOperation) {
        let resourceType = '';
        if (operation === 'create' || operation === 'update' || operation === 'patch') {
            resourceType = entry.resource.resourceType;
        } else if (
            operation === 'read' ||
            operation === 'vread' ||
            operation === 'search-type' ||
            operation === 'history-type' ||
            operation === 'history-instance' ||
            operation === 'delete'
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
}
