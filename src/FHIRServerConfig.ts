import { R4_RESOURCE, R3_RESOURCE, VERSION, INTERACTION } from './constants';

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
    excludedR4Resources?: R4_RESOURCE[];
    excludedR3Resources?: R3_RESOURCE[];
    searchParam: boolean;
}

export interface Resource {
    interactions: INTERACTION[];
    versions: VERSION[];
}

export interface Resources {
    [resourceName: string]: Resource;
}

export interface Profile {
    version: VERSION;
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
