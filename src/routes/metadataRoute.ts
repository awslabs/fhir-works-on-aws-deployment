import express, { Router } from 'express';
import MetadataHandler from '../metadata/metadataHandler';
import { VERSION } from '../constants';
import { FhirConfig } from '../FHIRServerConfig';

export default class MetadataRoute {
    readonly fhirVersion: VERSION;

    readonly router: Router;

    private metadataHandler: MetadataHandler;

    constructor(fhirVersion: VERSION, fhirConfig: FhirConfig) {
        this.fhirVersion = fhirVersion;
        this.metadataHandler = new MetadataHandler(fhirConfig);
        this.router = express.Router();
        this.init();
    }

    private init() {
        // READ
        this.router.get('/', async (req: express.Request, res: express.Response) => {
            // TODO have this be dynamic
            const response = await this.metadataHandler.generateCapabilityStatement(this.fhirVersion);
            res.send(response);
        });
    }
}
