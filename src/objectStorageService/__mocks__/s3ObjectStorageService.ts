/* eslint-disable @typescript-eslint/no-unused-vars */
import ObjectStorageInterface from '../objectStorageInterface';
import ServiceResponse from '../../common/serviceResponse';

const ObjectStorageService: ObjectStorageInterface = class {
    static uploadObject(base64Data: string, fileName: string, contentType: string) {
        return Promise.resolve(new ServiceResponse(true, ''));
    }

    static readObject(fileName: string) {
        return Promise.resolve(new ServiceResponse(true, ''));
    }

    static deleteObject(fileName: string) {
        return Promise.resolve(new ServiceResponse(true, ''));
    }

    static getPresignedPutUrl(fileName: string) {
        return Promise.resolve(new ServiceResponse(true, 'https://VALID_S3_PUT_URL.com'));
    }

    static getPresignedGetUrl(fileName: string) {
        return Promise.resolve(new ServiceResponse(true, 'https://VALID_S3_GET_URL.com'));
    }

    static deleteBasedOnPrefix(fileName: string) {
        return Promise.resolve(new ServiceResponse(true, ''));
    }
};

export default ObjectStorageService;
