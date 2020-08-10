/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import express, { Router } from 'express';
import { CapabilityMode } from '../../interface/capabilities';
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
            const mode: CapabilityMode = (req.query.mode as CapabilityMode) || 'full';
            const response = await this.metadataHandler.capabilities({
                fhirVersion: this.fhirVersion,
                mode,
            });
            res.send(response.resource);
        });
    }
}
