import GenericResponse from './serviceResponse';

export interface CapabilitiesRequest {
    version: Hearth.FhirVersion;
}
export interface Capabilities {
    /**
     * Return the capabilities statement. This specifyies what the server supports
     * https://www.hl7.org/fhir/capabilitystatement-definitions.html#CapabilityStatement.format
     */
    capabilities(request: CapabilitiesRequest): Promise<GenericResponse>;
}
