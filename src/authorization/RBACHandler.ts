import { decode } from 'jsonwebtoken';
import { INTERACTION, R4_RESOURCE } from '../constants';
import AuthorizationInterface from './authorizationInterface';
import { Rule, RBACConfig } from './RBACConfig';
import { getInteraction, getResource, cleanUrlPath } from '../common/utilities';
import BatchReadWriteRequest, { BatchTypeToInteraction } from '../dataServices/ddb/batchReadWriteRequest';

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

        if (groups.length === 0) {
            // No group assigned found in user
            return false;
        }

        const interaction: INTERACTION = getInteraction(httpVerb, path);
        const resourceType: R4_RESOURCE | undefined = getResource(path, interaction);

        for (let index = 0; index < groups.length; index += 1) {
            const group = groups[index];
            if (this.isAllowed(group, interaction, resourceType)) {
                return true;
            }
        }
        return false;
    }

    async isBatchRequestAuthorized(accessToken: string, batchRequest: BatchReadWriteRequest): Promise<boolean> {
        const decoded = decode(accessToken, { json: true }) || {};
        const groups: string[] = decoded['cognito:groups'] || [];

        if (groups.length === 0) {
            // No group assigned found in user
            return false;
        }

        const interaction: INTERACTION = BatchTypeToInteraction[batchRequest.type];
        const resourceType: R4_RESOURCE | undefined = (<any>R4_RESOURCE)[batchRequest.resourceType];

        for (let index = 0; index < groups.length; index += 1) {
            const group = groups[index];
            if (this.isAllowed(group, interaction, resourceType)) {
                return true;
            }
        }
        return false;
    }

    private isAllowed(group: string, interaction: INTERACTION, resourceType: R4_RESOURCE | undefined): boolean {
        if (this.rules.groupRules[group]) {
            const rule: Rule = this.rules.groupRules[group];
            return (
                rule.interactions.includes(interaction) &&
                ((resourceType && rule.resources.includes(resourceType)) || !resourceType)
            );
        }

        return false;
    }
}
