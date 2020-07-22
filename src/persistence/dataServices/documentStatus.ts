/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

const enum DOCUMENT_STATUS {
    LOCKED = 'LOCKED',
    PENDING = 'PENDING',
    PENDING_DELETE = 'PENDING_DELETE',
    DELETED = 'DELETED',
    AVAILABLE = 'AVAILABLE',
}

export default DOCUMENT_STATUS;
