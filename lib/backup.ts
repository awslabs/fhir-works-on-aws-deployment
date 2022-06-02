import { Stack, StackProps } from 'aws-cdk-lib';
import {
    BackupPlan,
    BackupPlanRule,
    BackupResource,
    BackupSelection,
    BackupVault,
    TagOperation,
} from 'aws-cdk-lib/aws-backup';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { Role, ServicePrincipal, PolicyDocument, PolicyStatement, Effect, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface BackupProps extends StackProps {
    backupKMSKey: Key;
}

export default class Backup extends Stack {
    backupVaultWithDailyBackups: BackupVault;

    backupPlanWithDailyBackups: BackupPlan;

    tagBasedBackupSelection: BackupSelection;

    constructor(scope: Construct, id: string, props?: BackupProps) {
        super(scope, id, props);
        this.backupVaultWithDailyBackups = new BackupVault(scope, 'backupVaultWithDailyBackups', {
            backupVaultName: 'BackupVaultWithDailyBackups',
            encryptionKey: props?.backupKMSKey,
        });

        this.backupPlanWithDailyBackups = new BackupPlan(scope, 'backupPlanWithDailyBackups', {
            backupPlanName: 'BackupPlanWithDailyBackups',
            backupPlanRules: [
                new BackupPlanRule({
                    ruleName: 'RuleForDailyBackups',
                    backupVault: this.backupVaultWithDailyBackups,
                    scheduleExpression: Schedule.cron({
                        minute: '0',
                        hour: '5',
                        day: '?',
                        month: '*',
                        weekDay: '*',
                        year: '*',
                    }),
                }),
            ],
        });

        this.tagBasedBackupSelection = new BackupSelection(scope, 'tagBasedBackupSelection', {
            backupSelectionName: 'TagBasedBackupSelection',
            role: new Role(scope, 'BackupRole', {
                assumedBy: new ServicePrincipal('backup.amazonaws.com'),
                inlinePolicies: {
                    AssumeRolePolicyDocument: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                principals: [new ServicePrincipal('backup.amazonaws.com')],
                                actions: ['sts:AssumeRole'],
                            }),
                        ],
                    }),
                },
                managedPolicies: [
                    ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBackupServiceRolePolicyForBackup'),
                    ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBackupServiceRolePolicyForRestores'),
                ],
            }),
            resources: [
                BackupResource.fromTag('backup', 'daily', TagOperation.STRING_EQUALS),
                BackupResource.fromTag('fhir', 'service', TagOperation.STRING_EQUALS),
            ],
            backupPlan: this.backupPlanWithDailyBackups,
        });
    }
}
