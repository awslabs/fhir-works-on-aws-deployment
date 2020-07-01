import GenericResponse from './genericResponse';

export interface CapabilitiesRequest {
    version: Hearth.FhirVersion;
}

export interface Capabilities {
    /**
     * Return the capabilities statement. This specifies what the server supports
     * https://www.hl7.org/fhir/capabilitystatement-definitions.html#CapabilityStatement.format
     */
    capabilities(request: CapabilitiesRequest): Promise<GenericResponse>;
}
