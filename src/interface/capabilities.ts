import GenericResponse from './genericResponse';

// https://www.hl7.org/fhir/http.html#capabilities
export type CapabilityMode = 'full' | 'normative' | 'terminology';

export interface CapabilitiesRequest {
    version: Hearth.FhirVersion;
    mode: CapabilityMode;
}

export interface Capabilities {
    /**
     * Return the capabilities statement. This specifies what the server supports
     * https://www.hl7.org/fhir/capabilitystatement-definitions.html#CapabilityStatement.format
     */
    capabilities(request: CapabilitiesRequest): Promise<GenericResponse>;
}
