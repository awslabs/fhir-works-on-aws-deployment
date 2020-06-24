export interface RBACConfig {
    version: number;
    groupRules: GroupRule;
}

export interface GroupRule {
    [groupName: string]: Rule;
}
export interface Rule {
    operations: Hearth.Operation[];
    resources: string[]; // This will be able to support any type of resource
}
