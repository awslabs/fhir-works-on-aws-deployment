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
    SystemOperation,
    TypeOperation,
} from 'fhir-works-on-aws-interface';
import axios from 'axios';
import { LaunchType, ScopeType, SMARTConfig } from './smartConfig';

// eslint-disable-next-line import/prefer-default-export
export class SMARTHandler implements Authorization {
    static readonly SCOPE_REGEX = /(patient|user|system|launch)\/(\w+|\*)\.?(\w+|\*)?|(^launch$)/;

    private readonly version: number = 1.0;

    private readonly config: SMARTConfig;

    constructor(config: SMARTConfig) {
        if (config.version !== this.version) {
            throw Error('Authorization configuration version does not match handler version');
        }
        this.config = config;
    }

    async isAuthorized(request: AuthorizationRequest): Promise<boolean> {
        const decoded = decode(request.accessToken, { json: true }) || {};
        const { aud, iss } = decoded;
        // verify aud & iss
        if (this.config.expectedAudValue !== aud || this.config.expectedIssValue !== iss) {
            console.error('aud or iss is not matching');
            return false;
        }
        // verify scope
        let scopes: string[] = [];
        if (this.config.scopeValueType === 'space' && typeof decoded[this.config.scopeKey] === 'string') {
            scopes = decoded[this.config.scopeKey].split(' ');
        } else if (this.config.scopeValueType === 'array' && Array.isArray(decoded[this.config.scopeKey])) {
            scopes = decoded[this.config.scopeKey];
        }
        if (!this.isScopeSufficient(scopes, request.operation, request.resourceType)) {
            console.error('scopes are insuffiecient');
            console.error(`scopes: ${scopes}`);
            console.error(`operation: ${request.operation}`);
            console.error(`resourceType: ${request.resourceType}`);
            return false;
        }

        // Verify token
        if (this.config.authZUserInfoUrl) {
            console.log('Posting to AuthZ for more customer information');
            let result;
            try {
                result = await axios.post(
                    this.config.authZUserInfoUrl,
                    {},
                    { headers: { Authorization: `Bearer ${request.accessToken}` } },
                );
            } catch (e) {
                console.error('Post to authZUserInfoUrl failed');
                console.error(e);
            }
            if (!result || !result.data[this.config.expectedFhirUserClaimKey]) {
                console.error(`result from AuthZ did not have ${this.config.expectedFhirUserClaimKey} claim`);
                return false;
            }
        }
        return true;
    }

    // eslint-disable-next-line class-methods-use-this
    async isBundleRequestAuthorized(request: AuthorizationBundleRequest): Promise<boolean> {
        // stubbed
        return this.isAuthorized({ accessToken: request.accessToken, operation: 'transaction' });
    }

    async getAllowedResourceTypesForOperation(request: AllowedResourceTypesForOperationRequest): Promise<string[]> {
        // stubbed
        if (this.isAuthorized(request)) {
            return ['Patient'];
        }
        return [];
    }

    private isScopeSufficient(
        scopes: string[],
        operation: TypeOperation | SystemOperation,
        resourceType?: string,
    ): boolean {
        const { scopeRule } = this.config;
        let isAuthorized = false;
        for (let i = 0; i < scopes.length && !isAuthorized; i += 1) {
            const scope = scopes[i];
            const results = scope.match(SMARTHandler.SCOPE_REGEX);
            if (results !== null && results.length > 4) {
                const scopeType: string = results[1] || results[4];
                const scopeResourceType: string = results[2];
                const accessType: string = results[3];
                let validOperations: (TypeOperation | SystemOperation)[] = [];
                if (scopeType === 'launch') {
                    // TODO: should launch have access to only certain resourceTypes?
                    if (['patient', 'encounter'].includes(scopeResourceType)) {
                        validOperations = scopeRule[scopeType][<LaunchType>scopeResourceType];
                    } else if (!scopeResourceType) {
                        validOperations = scopeRule[scopeType].launch;
                    }
                } else if (['patient', 'user', 'system'].includes(scopeType)) {
                    if (resourceType) {
                        if (scopeResourceType === '*' || scopeResourceType === resourceType) {
                            validOperations = this.getValidOperation(<ScopeType>scopeType, accessType);
                        }
                    } else if (scopeResourceType === '*') {
                        validOperations = this.getValidOperation(<ScopeType>scopeType, accessType);
                    }
                }
                isAuthorized = validOperations.includes(operation);
            }
        }
        return isAuthorized;
    }

    private getValidOperation(scopeType: ScopeType, accessType: string) {
        let validOperations: (TypeOperation | SystemOperation)[] = [];
        if (accessType === '*' || accessType === 'read') {
            validOperations = this.config.scopeRule[scopeType].read;
        }
        if (accessType === '*' || accessType === 'write') {
            validOperations = validOperations.concat(this.config.scopeRule[scopeType].write);
        }
        return validOperations;
    }
}
