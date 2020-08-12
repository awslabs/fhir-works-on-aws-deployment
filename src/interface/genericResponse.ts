/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export default interface GenericResponse {
    readonly message: string;
    readonly resource?: any;
}
