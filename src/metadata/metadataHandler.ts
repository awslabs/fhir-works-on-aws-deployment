import { makeGenericResources, makeResource } from './cap.rest.resource.template';
import makeSecurity from './cap.rest.security.template';
import makeRest from './cap.rest.template';
import makeStatement from './cap.template';
import { VERSION } from '../constants';
import { FhirConfig } from '../FHIRServerConfig';
import ConfigHandler from '../configHandler';
import OperationsGenerator from '../operationsGenerator';

export default class MetadataHandler {
    configHandler: ConfigHandler;

    constructor(config: FhirConfig) {
        this.configHandler = new ConfigHandler(config);
    }

    private generateResources(fhirVersion: VERSION) {
        const specialResourceTypes = this.configHandler.getSpecialResourceTypes(fhirVersion);
        let generatedResources = [];
        if (this.configHandler.config.profile.genericResource) {
            const generatedResourcesTypes = this.configHandler.getGenericResources(fhirVersion, specialResourceTypes);
            const searchParam = this.configHandler.getSearchParam();
            generatedResources = makeGenericResources(
                generatedResourcesTypes,
                this.configHandler.getGenericInteractions(fhirVersion),
                searchParam,
            );
        }

        // Add the special resources
        specialResourceTypes.forEach((resourceType: string) => {
            generatedResources.push(
                makeResource(
                    resourceType,
                    this.configHandler.getSpecialResourceInteractions(resourceType, fhirVersion),
                    this.configHandler.getSearchParam(),
                ),
            );
        });

        return generatedResources;
    }

    generateCapabilityStatement(fhirVersion: VERSION) {
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
