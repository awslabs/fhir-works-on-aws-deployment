// eslint-disable-next-line no-unused-vars
import ServiceResponse from '../common/serviceResponse';
import BatchReadWriteRequest from './ddb/batchReadWriteRequest';
import BatchReadWriteServiceResponse from './ddb/batchReadWriteServiceResponse';

export default interface DataServiceInterface {
    createResource(resourceType: string, id: string, resource: any): Promise<ServiceResponse>;
    updateResource(resourceType: string, id: string, resource: any): Promise<ServiceResponse>;
    getResource(resourceType: string, id: string): Promise<ServiceResponse>;
    getVersionedResource(resourceType: string, id: string, versionId: string): Promise<ServiceResponse>;
    deleteResource(resourceType: string, id: string): Promise<ServiceResponse>;
    deleteVersionedResource(resourceType: string, id: string, versionId: string): Promise<ServiceResponse>;
    atomicallyReadWriteResources(
        requests: BatchReadWriteRequest[],
        startTime: Date,
    ): Promise<BatchReadWriteServiceResponse>;
}
