import { BatchReadWriteRequestType } from './batchReadWriteRequest';

export default interface BatchReadWriteResponse {
    id: string;
    versionId: number;
    resourceType: string;
    type: BatchReadWriteRequestType;
    resource: any;
    lastModified: string;
}
