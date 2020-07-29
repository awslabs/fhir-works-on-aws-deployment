/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// eslint-disable-next-line no-unused-vars
import GenericResponse from '../../interface/genericResponse';

export default interface ObjectStorageInterface {
    uploadObject(base64Data: string, fileName: string, contentType: string): Promise<GenericResponse>;
    readObject(fileName: string): Promise<GenericResponse>;
    deleteObject(fileName: string): Promise<GenericResponse>;
    getPresignedPutUrl(fileName: string): Promise<GenericResponse>;
    deleteBasedOnPrefix(prefix: string): Promise<GenericResponse>;
    getPresignedGetUrl(fileName: string): Promise<GenericResponse>;
}
