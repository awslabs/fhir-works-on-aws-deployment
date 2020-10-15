/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { decode } from 'jsonwebtoken';
import {
    Authorization,
    AuthorizationRequest,
    AuthorizationBundleRequest,
    AllowedResourceTypesForOperationRequest,
} from 'fhir-works-on-aws-interface';
import { SMARTConfig } from './smartConfig';

// eslint-disable-next-line import/prefer-default-export
export class SMARTHandler implements Authorization {
    private readonly version: number = 1.0;

    private readonly config: SMARTConfig;

    constructor(config: SMARTConfig) {
        this.config = config;
        if (this.config.version !== this.version) {
            throw Error('Configuration version does not match handler version');
        }
    }

    async isAuthorized(request: AuthorizationRequest): Promise<boolean> {
        return true;
    }

    async isBundleRequestAuthorized(request: AuthorizationBundleRequest): Promise<boolean> {
        return true;
    }

    async getAllowedResourceTypesForOperation(request: AllowedResourceTypesForOperationRequest): Promise<string[]> {
        return [];
    }
}
