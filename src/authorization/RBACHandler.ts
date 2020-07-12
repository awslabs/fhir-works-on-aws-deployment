import { decode } from 'jsonwebtoken';
import { Authorization, AuthorizationRequest, AuthorizationBundleRequest } from '../interface/authorization';
import { Rule, RBACConfig } from './RBACConfig';
import { BatchReadWriteRequest } from '../interface/bundle';
import { TypeOperation, SystemOperation } from '../interface/constants';

const { IS_OFFLINE } = process.env;

export default class RBACHandler implements Authorization {
    private readonly version: number = 1.0;

    private readonly rules: RBACConfig;

    constructor(rules: RBACConfig) {
        this.rules = rules;
        if (this.rules.version !== this.version) {
            throw Error('Configuration version does not match handler version');
        }
    }

    isAuthorized(request: AuthorizationRequest): boolean {
        if (IS_OFFLINE === 'true') {
            return true;
        }
        const decoded = decode(request.accessToken, { json: true }) || {};
        const groups: string[] = decoded['cognito:groups'] || [];

        return this.isAllowed(groups, request.operation, request.resourceType);
    }

    async isBundleRequestAuthorized(request: AuthorizationBundleRequest): Promise<boolean> {
        if (IS_OFFLINE === 'true') {
            return true;
        }
        const decoded = decode(request.accessToken, { json: true }) || {};

        const groups: string[] = decoded['cognito:groups'] || [];

        const authZPromises: Promise<boolean>[] = request.requests.map(async (batch: BatchReadWriteRequest) => {
            return this.isAllowed(groups, batch.operation, batch.resourceType);
        });
        const authZResponses: boolean[] = await Promise.all(authZPromises);
        return authZResponses.every(Boolean);
    }

    private isAllowed(groups: string[], operation: TypeOperation | SystemOperation, resourceType?: string): boolean {
        if (operation === 'read' && resourceType === 'metadata') {
            return true; // capabilities statement
        }
        for (let index = 0; index < groups.length; index += 1) {
            const group: string = groups[index];
            if (this.rules.groupRules[group]) {
                const rule: Rule = this.rules.groupRules[group];
                if (
                    rule.operations.includes(operation) &&
                    ((resourceType && rule.resources.includes(resourceType)) || !resourceType)
                ) {
                    return true;
                }
            }
        }
        return false;
    }
}
