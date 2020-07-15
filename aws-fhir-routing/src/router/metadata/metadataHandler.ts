import { FhirVersion } from 'aws-fhir-interface';
import { makeGenericResources, makeResource } from './cap.rest.resource.template';
import makeSecurity from './cap.rest.security.template';
import makeRest from './cap.rest.template';
import makeStatement from './cap.template';
import ConfigHandler from '../../configHandler';
import OperationsGenerator from '../operationsGenerator';

export default class MetadataHandler {
    configHandler: ConfigHandler;

    constructor(handler: ConfigHandler) {
        this.configHandler = handler;
    }

    private generateResources(fhirVersion: FhirVersion) {
        const specialResourceTypes = this.configHandler.getSpecialResourceTypes(fhirVersion);
        let generatedResources = [];
        if (this.configHandler.config.profile.genericResource) {
            const generatedResourcesTypes = this.configHandler.getGenericResources(fhirVersion, specialResourceTypes);
            generatedResources = makeGenericResources(
                generatedResourcesTypes,
                this.configHandler.getGenericOperations(fhirVersion),
            );
        }

        // Add the special resources
        specialResourceTypes.forEach((resourceType: string) => {
            generatedResources.push(
                makeResource(resourceType, this.configHandler.getSpecialResourceOperations(resourceType, fhirVersion)),
            );
        });

        return generatedResources;
    }

    generateCapabilityStatement(fhirVersion: FhirVersion) {
        const { auth, orgName, server, profile } = this.configHandler.config;

        if (!this.configHandler.isVersionSupported(fhirVersion)) {
            return OperationsGenerator.generateError(`FHIR version ${fhirVersion} is not supported`);
        }

        const generatedResources = this.generateResources(fhirVersion);
        const security = makeSecurity(auth);
        const rest = makeRest(generatedResources, security, profile.systemOperations);
        const capStatement = makeStatement(rest, orgName, server.url, fhirVersion);

        return capStatement;
    }
}
