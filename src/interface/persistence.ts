import GenericResponse from './genericResponse';

export interface CreateResourceRequest {
    resourceType: string;
    resource: any;
}

export interface UpdateResourceRequest {
    id: string;
    resourceType: string;
    resource: any;
}

export interface GetResourceRequest {
    id: string;
    resourceType: string;
}

export interface GetVersionedResourceRequest {
    id: string;
    vid: string;
    resourceType: string;
}

export interface DeleteResourceRequest {
    id: string;
    resourceType: string;
}

export interface Persistence {
    readonly updateCreateSupported: boolean;

    /**
     * Create a new FHIR resource
     */
    createResource(request: CreateResourceRequest): Promise<GenericResponse>;
    /**
     * Update a FHIR resource; Note this method may support 'Update as Create' where it is
     * a 'create' that allows the client to supply the resourceId. This behavior should be
     * dependent on the supplied updateCreateSupported parameter
     */
    updateResource(request: UpdateResourceRequest): Promise<GenericResponse>;
    /**
     * Operation that accesses the current contents of a resource
     */
    getResource(request: GetResourceRequest): Promise<GenericResponse>;
    /**
     * Performs a version specific read of the resource
     */
    getVersionedResource(request: GetVersionedResourceRequest): Promise<GenericResponse>;
    /**
     * Delete interaction means that subsequent non-version specific reads cannot be found and that the resource is no
     * longer found through search interactions
     *
     * For servers that maintain a version history, the delete interaction does not remove a resource's
     * version history. From a version history respect, deleting a resource is the equivalent of creating
     * a special kind of history entry that has no content and is marked as deleted.
     *
     * NOTE: implementors are free to completely delete the resource and it's history if policy or business rules make this
     * the appropriate action to take.
     */
    deleteResource(request: DeleteResourceRequest): Promise<GenericResponse>;
}
