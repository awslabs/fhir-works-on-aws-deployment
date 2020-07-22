/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FhirVersion, TypeOperation, R4Resource, R3Resource, SystemOperation } from './constants';
import { Persistence } from './persistence';
import { History } from './history';
import { Search } from './search';
import { Authorization } from './authorization';
import { Bundle } from './bundle';

export interface Strategy {
    oauthUrl?: string;
    // https://www.hl7.org/fhir/codesystem-restful-security-service.html
    service?: 'OAuth' | 'SMART-on-FHIR' | 'NTLM' | 'Basic' | 'Kerberos' | 'Certificates';
}

export interface Auth {
    strategy: Strategy;
    authorization: Authorization;
}

export interface Server {
    url: string;
}

export interface Logging {
    level: 'debug' | 'info' | 'warn' | 'error';
}

export interface GenericResource extends Resource {
    excludedR4Resources?: R4Resource[];
    excludedR3Resources?: R3Resource[];
}

export interface Resource {
    operations: TypeOperation[];
    versions: FhirVersion[];
    persistence: Persistence;
    typeHistory: History;
    typeSearch: Search;
}

export interface Resources {
    [resourceName: string]: Resource;
}

export interface Profile {
    version: FhirVersion;
    systemOperations: SystemOperation[];
    systemSearch: Search;
    systemHistory: History;
    bundle: Bundle;
    genericResource?: GenericResource;
    resources?: Resources;
}

export interface FhirConfig {
    orgName: string;
    auth: Auth;
    server: Server;
    logging: Logging;
    profile: Profile;
}
