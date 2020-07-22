/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export default interface GenericResponse {
    readonly success: boolean;
    readonly message: string;
    readonly resource?: any;
}
