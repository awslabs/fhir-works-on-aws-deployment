/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FhirConfig } from './interface/fhirConfig';
import { FhirVersion, TypeOperation } from './interface/constants';

export default class ConfigHandler {
    readonly config: FhirConfig;

    readonly supportedGenericResources: string[];

    constructor(config: FhirConfig, supportedGenericResources: string[]) {
        this.config = config;
        this.supportedGenericResources = supportedGenericResources;
    }

    isVersionSupported(fhirVersion: FhirVersion): boolean {
        return this.config.profile.fhirVersion === fhirVersion;
    }

    getExcludedResourceTypes(fhirVersion: FhirVersion): string[] {
        const { genericResource } = this.config.profile;
        if (genericResource && genericResource.fhirVersions.includes(fhirVersion)) {
            if (fhirVersion === '3.0.1') {
                return genericResource.excludedR3Resources || [];
            }
            if (fhirVersion === '4.0.1') {
                return genericResource.excludedR4Resources || [];
            }
        }
        return [];
    }

    getSpecialResourceTypes(fhirVersion: FhirVersion): string[] {
        const { resources } = this.config.profile;
        if (resources) {
            let specialResources = Object.keys(resources);
            specialResources = specialResources.filter(r => resources[r].fhirVersions.includes(fhirVersion));
            return specialResources;
        }
        return [];
    }

    getSpecialResourceOperations(resourceType: string, fhirVersion: FhirVersion): TypeOperation[] {
        const { resources } = this.config.profile;
        if (resources && resources[resourceType] && resources[resourceType].fhirVersions.includes(fhirVersion)) {
            return resources[resourceType].operations;
        }
        return [];
    }

    getGenericOperations(fhirVersion: FhirVersion): TypeOperation[] {
        const { genericResource } = this.config.profile;
        if (genericResource && genericResource.fhirVersions.includes(fhirVersion)) {
            return genericResource.operations;
        }
        return [];
    }

    getGenericResources(fhirVersion: FhirVersion, specialResources: string[] = []): string[] {
        const excludedResources = this.getExcludedResourceTypes(fhirVersion);
        const resources = this.supportedGenericResources.filter(
            r => !excludedResources.includes(r) && !specialResources.includes(r),
        );

        return resources;
    }
}
