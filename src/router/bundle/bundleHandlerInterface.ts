/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export default interface BundleHandlerInterface {
    processBatch(resource: any, accessKey: string): any;
    processTransaction(resource: any, accessKey: string): any;
}
