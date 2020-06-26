import { SUPPORTED_R3_RESOURCES, SUPPORTED_R4_RESOURCES } from './constants';

export default class ConfigHandler {
    readonly config: Hearth.FhirConfig;

    constructor(config: Hearth.FhirConfig) {
        this.config = config;
    }

    isVersionSupported(fhirVersion: Hearth.FhirVersion): boolean {
        const { version } = this.config.profile;
        return version === fhirVersion;
    }

    getExcludedResourceTypes(fhirVersion: Hearth.FhirVersion): string[] {
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

    getSpecialResourceTypes(fhirVersion: Hearth.FhirVersion): string[] {
        const { resources } = this.config.profile;
        if (resources) {
            let specialResources = Object.keys(resources);
            specialResources = specialResources.filter(r => resources[r].versions.includes(fhirVersion));
            return specialResources;
        }
        return [];
    }

    getSpecialResourceOperations(resourceType: string, fhirVersion: Hearth.FhirVersion): Hearth.Operation[] {
        const { resources } = this.config.profile;
        if (resources && resources[resourceType] && resources[resourceType].versions.includes(fhirVersion)) {
            return resources[resourceType].operations;
        }
        return [];
    }

    getGenericOperations(fhirVersion: Hearth.FhirVersion): Hearth.Operation[] {
        const { genericResource } = this.config.profile;
        if (genericResource && genericResource.versions.includes(fhirVersion)) {
            return genericResource.operations;
        }
        return [];
    }

    getSearchParam(): boolean {
        if (this.config.profile.genericResource) {
            return this.config.profile.genericResource.searchParam;
        }
        return false;
    }

    isBinaryGeneric(fhirVersion: Hearth.FhirVersion): boolean {
        const excludedResources: string[] = this.getExcludedResourceTypes(fhirVersion);
        let result = !excludedResources.includes('Binary');
        const { resources } = this.config.profile;
        if (result && resources) {
            result = !Object.keys(resources).includes('Binary');
        }
        return result;
    }

    getGenericResources(fhirVersion: Hearth.FhirVersion, specialResources: string[] = []): string[] {
        let genericFhirResources: string[] = fhirVersion === '3.0.1' ? SUPPORTED_R3_RESOURCES : SUPPORTED_R4_RESOURCES;
        const excludedResources = this.getExcludedResourceTypes(fhirVersion);
        genericFhirResources = genericFhirResources.filter(
            r => !excludedResources.includes(r) && !specialResources.includes(r),
        );

        return genericFhirResources;
    }
}
