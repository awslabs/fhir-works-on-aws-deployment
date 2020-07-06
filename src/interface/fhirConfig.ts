import { FhirVersion, Operation, R4Resource, R3Resource } from './constants';

export interface Strategy {
    oauthUrl?: string;
}

export interface Auth {
    strategy: Strategy;
}

export interface Server {
    url: string;
}

export interface Logging {
    level: string;
}

export interface GenericResource extends Resource {
    excludedR4Resources?: R4Resource[];
    excludedR3Resources?: R3Resource[];
    searchParam: boolean;
}

export interface Resource {
    operations: Operation[];
    versions: FhirVersion[];
}

export interface Resources {
    [resourceName: string]: Resource;
}

export interface Profile {
    version: FhirVersion;
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
