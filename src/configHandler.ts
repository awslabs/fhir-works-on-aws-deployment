import { VERSION, R4_RESOURCE, INTERACTION, R3_RESOURCE } from './constants';
import { FhirConfig } from './FHIRServerConfig';

export default class ConfigHandler {
    readonly config: FhirConfig;

    constructor(config: FhirConfig) {
        this.config = config;
    }

    isVersionSupported(fhirVersion: VERSION): boolean {
        const { version } = this.config.profile;
        return version === fhirVersion;
    }

    getExcludedResourceTypes(fhirVersion: VERSION): string[] {
        const { genericResource } = this.config.profile;
        if (genericResource && genericResource.versions.includes(fhirVersion)) {
            if (fhirVersion === VERSION.R3_0_1) {
                return genericResource.excludedR3Resources || [];
            }
            if (fhirVersion === VERSION.R4_0_1) {
                return genericResource.excludedR4Resources || [];
            }
        }
        return [];
    }

    getSpecialResourceTypes(fhirVersion: VERSION): string[] {
        const { resources } = this.config.profile;
        if (resources) {
            let specialResources = Object.keys(resources);
            specialResources = specialResources.filter(r => resources[r].versions.includes(fhirVersion));
            return specialResources;
        }
        return [];
    }

    getSpecialResourceInteractions(resourceType: string, fhirVersion: VERSION): INTERACTION[] {
        const { resources } = this.config.profile;
        if (resources && resources[resourceType] && resources[resourceType].versions.includes(fhirVersion)) {
            return resources[resourceType].interactions;
        }
        return [];
    }

    getGenericInteractions(fhirVersion: VERSION): INTERACTION[] {
        const { genericResource } = this.config.profile;
        if (genericResource && genericResource.versions.includes(fhirVersion)) {
            return genericResource.interactions;
        }
        return [];
    }

    getSearchParam() {
        if (this.config.profile.genericResource) {
            return this.config.profile.genericResource.searchParam;
        }
        return false;
    }

    isBinaryGeneric(fhirVersion: VERSION): boolean {
        const excludedResources: string[] = this.getExcludedResourceTypes(fhirVersion);
        let result = !excludedResources.includes(R4_RESOURCE.Binary);
        const { resources } = this.config.profile;
        if (result && resources) {
            result = !Object.keys(resources).includes(R4_RESOURCE.Binary);
        }
        return result;
    }

    getGenericResources(fhirVersion: VERSION, specialResources: string[] = []): string[] {
        let genericFhirResources: string[] =
            fhirVersion === VERSION.R3_0_1 ? Object.values(R3_RESOURCE) : Object.values(R4_RESOURCE);
        const excludedResources = this.getExcludedResourceTypes(fhirVersion);
        genericFhirResources = genericFhirResources.filter(
            r => !excludedResources.includes(r) && !specialResources.includes(r),
        );

        return genericFhirResources;
    }
}
