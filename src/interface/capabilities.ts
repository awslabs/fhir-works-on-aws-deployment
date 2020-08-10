/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import GenericResponse from './genericResponse';
import { FhirVersion } from './constants';

// https://www.hl7.org/fhir/http.html#capabilities
export type CapabilityMode = 'full' | 'normative' | 'terminology';

export interface CapabilitiesRequest {
    fhirVersion: FhirVersion;
    mode: CapabilityMode;
}

export interface Capabilities {
    /**
     * Return the capabilities statement. This specifies what the server supports
     * https://www.hl7.org/fhir/capabilitystatement-definitions.html#CapabilityStatement.format
     */
    capabilities(request: CapabilitiesRequest): Promise<GenericResponse>;
}
