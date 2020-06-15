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

        const interaction: INTERACTION = getInteraction(httpVerb, path);
        const resourceType: R4_RESOURCE | undefined = getResource(path, interaction);

        return this.isAllowed(groups, interaction, resourceType);
    }

    async isBatchRequestAuthorized(accessToken: string, batchRequests: BatchReadWriteRequest[]): Promise<boolean> {
        const decoded = decode(accessToken, { json: true }) || {};
        const groups: string[] = decoded['cognito:groups'] || [];

        const authZPromises: Promise<boolean>[] = batchRequests.map(async (request: BatchReadWriteRequest) => {
            const interaction: INTERACTION = BatchTypeToInteraction[request.type];
            const resourceType: R4_RESOURCE | undefined = (<any>R4_RESOURCE)[request.resourceType];

            return this.isAllowed(groups, interaction, resourceType);
        });
        const authZResponses: boolean[] = await Promise.all(authZPromises);
        return authZResponses.every(Boolean);
    }

    private isAllowed(groups: string[], interaction: INTERACTION, resourceType: R4_RESOURCE | undefined): boolean {
        for (let index = 0; index < groups.length; index += 1) {
            const group: string = groups[index];
            if (this.rules.groupRules[group]) {
                const rule: Rule = this.rules.groupRules[group];
                if (
                    rule.interactions.includes(interaction) &&
                    ((resourceType && rule.resources.includes(resourceType)) || !resourceType)
                ) {
                    return true;
                }
            }
        }
        return false;
    }
}
