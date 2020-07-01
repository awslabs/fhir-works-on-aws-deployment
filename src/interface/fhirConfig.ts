declare module Hearth {
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
        excludedR4Resources?: Hearth.R4Resource[];
        excludedR3Resources?: Hearth.R3Resource[];
        searchParam: boolean;
    }

    export interface Resource {
        operations: Hearth.Operation[];
        versions: Hearth.FhirVersion[];
    }

    export interface Resources {
        [resourceName: string]: Resource;
    }

    export interface Profile {
        version: Hearth.FhirVersion;
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
}
