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
        const { version } = this.config.profile;
        return version === fhirVersion;
    }

    getExcludedResourceTypes(fhirVersion: FhirVersion): string[] {
        const { genericResource } = this.config.profile;
        if (genericResource && genericResource.versions.includes(fhirVersion)) {
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
            specialResources = specialResources.filter(r => resources[r].versions.includes(fhirVersion));
            return specialResources;
        }
        return [];
    }

    getSpecialResourceOperations(resourceType: string, fhirVersion: FhirVersion): TypeOperation[] {
        const { resources } = this.config.profile;
        if (resources && resources[resourceType] && resources[resourceType].versions.includes(fhirVersion)) {
            return resources[resourceType].operations;
        }
        return [];
    }

    getGenericOperations(fhirVersion: FhirVersion): TypeOperation[] {
        const { genericResource } = this.config.profile;
        if (genericResource && genericResource.versions.includes(fhirVersion)) {
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
