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
    static readonly CLINICAL_SCOPE_REGEX = /^(patient|user|system)\/([a-zA-Z]+|\*)\.(read|write|\*)$/;

    static readonly LAUNCH_SCOPE_REGEX = /^(launch)(\/(patient|encounter))?$/;

    private readonly version: number = 1.0;

    private readonly config: SMARTConfig;

    constructor(config: SMARTConfig) {
        if (config.version !== this.version) {
            throw Error('Authorization configuration version does not match handler version');
        }
        this.config = config;
    }

    async isAuthorized(request: AuthorizationRequest): Promise<boolean> {
        const authZPromise = axios.post(
            this.config.authZUserInfoUrl,
            {},
            { headers: { Authorization: `Bearer ${request.accessToken}` } },
        );

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
            console.error(
                `User supplied scopes are insuffiecient\nscopes: ${scopes}\noperation: ${request.operation}\nresourceType: ${request.resourceType}`,
            );
            return false;
        }

        // Verify token
        if (authZPromise) {
            console.log('Posting to AuthZ for more customer information');
            let response;
            try {
                response = await authZPromise;
            } catch (e) {
                console.error('Post to authZUserInfoUrl failed', e);
            }
            if (!response || !response.data[this.config.expectedFhirUserClaimKey]) {
                console.error(`result from AuthZ did not have ${this.config.expectedFhirUserClaimKey} claim`);
                return false;
            }
        }
        return true;
    }

    async isBundleRequestAuthorized(request: AuthorizationBundleRequest): Promise<boolean> {
        // TODO this is stubbed for now
        return this.isAuthorized({ accessToken: request.accessToken, operation: 'transaction' });
    }

    async getAllowedResourceTypesForOperation(request: AllowedResourceTypesForOperationRequest): Promise<string[]> {
        // TODO this is stubbed for now
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
            let results = scope.match(SMARTHandler.LAUNCH_SCOPE_REGEX);
            if (!results) {
                results = scope.match(SMARTHandler.CLINICAL_SCOPE_REGEX);
            }
            if (results !== null && results.length > 3) {
                const scopeType: string = results[1];
                let validOperations: (TypeOperation | SystemOperation)[] = [];
                if (scopeType === 'launch') {
                    const launchType: string = results[3];
                    // TODO: should launch have access to only certain resourceTypes?
                    if (['patient', 'encounter'].includes(launchType)) {
                        validOperations = scopeRule[scopeType][<LaunchType>launchType];
                    } else if (!launchType) {
                        validOperations = scopeRule[scopeType].launch;
                    }
                } else if (['patient', 'user', 'system'].includes(scopeType)) {
                    const scopeResourceType: string = results[2];
                    const accessType: string = results[3];
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
