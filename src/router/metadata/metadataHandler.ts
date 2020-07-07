import { makeGenericResources, makeResource } from './cap.rest.resource.template';
import makeSecurity from './cap.rest.security.template';
import makeRest from './cap.rest.template';
import makeStatement from './cap.template';
import ConfigHandler from '../../configHandler';
import OperationsGenerator from '../operationsGenerator';
import { FhirConfig } from '../../interface/fhirConfig';
import { FhirVersion } from '../../interface/constants';

export default class MetadataHandler {
    configHandler: ConfigHandler;

    constructor(config: FhirConfig) {
        this.configHandler = new ConfigHandler(config);
    }

    private generateResources(fhirVersion: FhirVersion) {
        const specialResourceTypes = this.configHandler.getSpecialResourceTypes(fhirVersion);
        let generatedResources = [];
        if (this.configHandler.config.profile.genericResource) {
            const generatedResourcesTypes = this.configHandler.getGenericResources(fhirVersion, specialResourceTypes);
            const searchParam = this.configHandler.getSearchParam();
            generatedResources = makeGenericResources(
                generatedResourcesTypes,
                this.configHandler.getGenericOperations(fhirVersion),
                searchParam,
            );
        }

        // Add the special resources
        specialResourceTypes.forEach((resourceType: string) => {
            generatedResources.push(
                makeResource(
                    resourceType,
                    this.configHandler.getSpecialResourceOperations(resourceType, fhirVersion),
                    this.configHandler.getSearchParam(),
                ),
            );
        });

        return generatedResources;
    }

    generateCapabilityStatement(fhirVersion: FhirVersion) {
        const { auth, orgName, server } = this.configHandler.config;

        if (!this.configHandler.isVersionSupported(fhirVersion)) {
            return OperationsGenerator.generateError(`FHIR version ${fhirVersion} is not supported`);
        }

        const generatedResources = this.generateResources(fhirVersion);
        const security = makeSecurity(auth);
        const rest = makeRest(generatedResources, security);
        const capStatement = makeStatement(rest, orgName, server.url, fhirVersion);

        return capStatement;
    }
}
