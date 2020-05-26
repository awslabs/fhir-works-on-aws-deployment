import { S3, FHIR_BINARY_BUCKET } from './s3';
// eslint-disable-next-line no-unused-vars
import ObjectStorageInterface from './objectStorageInterface';
import ServiceResponse from '../common/serviceResponse';

const S3ObjectStorageService: ObjectStorageInterface = class {
    static S3_KMS_KEY = process.env.S3_KMS_KEY || '';

    static SSE_ALGORITHM = 'aws:kms';

    static PRESIGNED_URL_EXPIRATION_IN_SECONDS = 300;

    static async uploadObject(data: string, fileName: string, contentType: string): Promise<ServiceResponse> {
        // @ts-ignore
        // eslint-disable-next-line new-cap
        const base64Data = new Buffer.from(data, 'base64');

        const params = {
            Bucket: FHIR_BINARY_BUCKET,
            Key: fileName,
            Body: base64Data,
            ContentEncoding: 'base64',
            ContentType: contentType,
            ServerSideEncryption: this.SSE_ALGORITHM,
            SSEKMSKeyId: this.S3_KMS_KEY,
        };

        try {
            const { Key } = await S3.upload(params).promise();
            return new ServiceResponse(true, Key);
        } catch (e) {
            const message = 'Failed uploading binary data to S3';
            console.error(message, e);
            return new ServiceResponse(false, message);
        }
    }

    static async readObject(fileName: string): Promise<ServiceResponse> {
        const params = {
            Bucket: FHIR_BINARY_BUCKET,
            Key: fileName,
        };

        try {
            const object = await S3.getObject(params).promise();
            if (object.Body) {
                const base64Data = object.Body.toString('base64');
                return new ServiceResponse(true, base64Data);
            }
            return new ServiceResponse(false, 'S3 object body is empty');
        } catch (e) {
            const message = "Can't read object";
            console.error(message, e);
            return new ServiceResponse(false, message);
        }
    }

    static async deleteObject(fileName: string): Promise<ServiceResponse> {
        const params = {
            Bucket: FHIR_BINARY_BUCKET,
            Key: fileName,
        };
        console.log('Delete Params', params);
        try {
            await S3.deleteObject(params).promise();
            return new ServiceResponse(true, '');
        } catch (e) {
            return new ServiceResponse(false, '');
        }
    }

    static async getPresignedPutUrl(fileName: string) {
        try {
            const url = await S3.getSignedUrlPromise('putObject', {
                Bucket: FHIR_BINARY_BUCKET,
                Key: fileName,
                Expires: this.PRESIGNED_URL_EXPIRATION_IN_SECONDS,
                ServerSideEncryption: this.SSE_ALGORITHM,
                SSEKMSKeyId: this.S3_KMS_KEY,
            });
            return new ServiceResponse(true, url);
        } catch (e) {
            console.error('Failed creating presigned S3 PUT URL', e);
            return new ServiceResponse(false, e.message);
        }
    }

    static async getPresignedGetUrl(fileName: string) {
        // Check to see whether S3 file exists
        try {
            await S3.headObject({
                Bucket: FHIR_BINARY_BUCKET,
                Key: fileName,
            }).promise();
        } catch (e) {
            console.error(`File does not exist. FileName: ${fileName}`);
            return new ServiceResponse(false, 'S3 file does not exist');
        }

        try {
            const url = await S3.getSignedUrlPromise('getObject', {
                Bucket: FHIR_BINARY_BUCKET,
                Key: fileName,
                Expires: this.PRESIGNED_URL_EXPIRATION_IN_SECONDS,
            });
            return new ServiceResponse(true, url);
        } catch (e) {
            console.error('Failed creating presigned S3 GET URL', e);
            return new ServiceResponse(false, e.message);
        }
    }

    static async deleteBasedOnPrefix(prefix: string): Promise<ServiceResponse> {
        let token;
        const promises = [];
        do {
            const listParams: any = {
                Bucket: FHIR_BINARY_BUCKET,
                Prefix: prefix,
                ContinuationToken: token,
            };
            // eslint-disable-next-line no-await-in-loop
            const results = await S3.listObjectsV2(listParams).promise();
            const contents = results.Contents || [];
            token = results.ContinuationToken;
            const keysToDelete: any[] = contents.map(content => {
                return { Key: content.Key };
            });
            const params = {
                Bucket: FHIR_BINARY_BUCKET,
                Delete: {
                    Objects: keysToDelete,
                },
            };
            console.log('Delete Params', params);
            promises.push(S3.deleteObjects(params).promise());
        } while (token);

        try {
            await Promise.all(promises);
        } catch (e) {
            const message = 'Deletion has failed, please retry';
            console.error(message, e);
            return new ServiceResponse(false, message);
        }
        return new ServiceResponse(true, '');
    }
};

export default S3ObjectStorageService;
