import { decode } from 'jsonwebtoken';
import AuthorizationInterface from './authorizationInterface';
import { Rule, RBACConfig } from './RBACConfig';
import { getOperation, getResource, cleanUrlPath } from '../common/utilities';
import BatchReadWriteRequest, { BatchTypeToOperation } from '../dataServices/ddb/batchReadWriteRequest';

export default class RBACHandler implements AuthorizationInterface {
    private readonly version: number = 1.0;

    private readonly rules: RBACConfig;

    constructor(rules: RBACConfig) {
        this.rules = rules;
        if (this.rules.version !== this.version) {
            throw Error('Configuration version does not match handler version');
        }
    }

    isAuthorized(accessToken: string, httpVerb: string, urlPath: string): boolean {
        const path = cleanUrlPath(urlPath);
        const urlSplit = path.split('/');

        // Capabilities statement; everyone can ask and see it
        if (httpVerb === 'GET' && urlSplit[0] === 'metadata') {
            return true;
        }

        const decoded = decode(accessToken, { json: true }) || {};
        const groups: string[] = decoded['cognito:groups'] || [];

        const operation: Hearth.Operation = getOperation(httpVerb, path);

        return this.isAllowed(groups, operation, getResource(path, operation));
    }

    async isBatchRequestAuthorized(accessToken: string, batchRequests: BatchReadWriteRequest[]): Promise<boolean> {
        const decoded = decode(accessToken, { json: true }) || {};
        const groups: string[] = decoded['cognito:groups'] || [];

        const authZPromises: Promise<boolean>[] = batchRequests.map(async (request: BatchReadWriteRequest) => {
            const operation: Hearth.Operation = BatchTypeToOperation[request.type];

            return this.isAllowed(groups, operation, request.resourceType);
        });
        const authZResponses: boolean[] = await Promise.all(authZPromises);
        return authZResponses.every(Boolean);
    }

    private isAllowed(groups: string[], operation: Hearth.Operation, resourceType?: string): boolean {
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
