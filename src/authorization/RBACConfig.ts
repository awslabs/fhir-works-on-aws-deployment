import { INTERACTION, R4_RESOURCE } from '../constants';

export interface RBACConfig {
    version: number;
    groupRules: GroupRule;
}

export interface GroupRule {
    [groupName: string]: Rule;
}
export interface Rule {
    interactions: INTERACTION[];
    resources: R4_RESOURCE[];
}
