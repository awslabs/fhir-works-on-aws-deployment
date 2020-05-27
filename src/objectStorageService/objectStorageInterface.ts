// eslint-disable-next-line no-unused-vars
import ServiceResponse from '../common/serviceResponse';

export default interface ObjectStorageInterface {
    uploadObject(base64Data: string, fileName: string, contentType: string): Promise<ServiceResponse>;
    readObject(fileName: string): Promise<ServiceResponse>;
    deleteObject(fileName: string): Promise<ServiceResponse>;
    getPresignedPutUrl(fileName: string): Promise<ServiceResponse>;
    deleteBasedOnPrefix(prefix: string): Promise<ServiceResponse>;
    getPresignedGetUrl(fileName: string): Promise<ServiceResponse>;
}
