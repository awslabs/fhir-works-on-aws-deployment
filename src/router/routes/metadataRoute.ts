import express, { Router } from 'express';
import MetadataHandler from '../metadata/metadataHandler';
import { FhirVersion } from '../../interface/constants';
import ConfigHandler from '../../configHandler';

export default class MetadataRoute {
    readonly fhirVersion: FhirVersion;

    readonly router: Router;

    private metadataHandler: MetadataHandler;

    constructor(fhirVersion: FhirVersion, fhirConfigHandler: ConfigHandler) {
        this.fhirVersion = fhirVersion;
        this.metadataHandler = new MetadataHandler(fhirConfigHandler);
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
