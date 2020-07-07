import express, { Router } from 'express';
import { Persistence } from '../../interface/persistence';
import RouteHelper from './routeHelper';
import BadRequestError from '../../interface/errors/BadRequestError';
import BundleHandler from '../bundle/bundleHandler';
import { Authorization } from '../../interface/authorization';
import { cleanAuthHeader } from '../../interface/utilities';
import { Bundle } from '../../interface/bundle';
import { FhirVersion } from '../../interface/constants';

export default class BundleResourceRoute {
    readonly router: Router;

    private bundleHandler: BundleHandler;

    constructor(
        dataService: Persistence,
        bundleService: Bundle,
        authService: Authorization,
        fhirVersion: FhirVersion,
        serverUrl: string,
    ) {
        this.router = express.Router();
        this.bundleHandler = new BundleHandler(dataService, bundleService, authService, serverUrl, fhirVersion);
        this.init();
    }

    init() {
        this.router.post(
            '/',
            RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
                if (req.body.resourceType === 'Bundle') {
                    const response = await this.bundleHandler.processTransaction(
                        req.body,
                        cleanAuthHeader(req.headers.authorization),
                    );
                    res.send(response);
                } else {
                    throw new BadRequestError('This path can only process Bundle');
                }
            }),
        );
    }
}
