import express, { Router } from 'express';
import MetadataHandler from '../metadata/metadataHandler';

export default class MetadataRoute {
    readonly fhirVersion: Hearth.FhirVersion;

    readonly router: Router;

    private metadataHandler: MetadataHandler;

    constructor(fhirVersion: Hearth.FhirVersion, fhirConfig: Hearth.FhirConfig) {
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
