import express, { Router } from 'express';
import DataServiceInterface from '../dataServices/dataServiceInterface';
import { VERSION } from '../constants';
import RouteHelper from './routeHelper';
import BadRequestError from '../errors/BadRequestError';
import BundleHandler from '../bundle/bundleHandler';
import AuthorizationInterface from '../authorization/authorizationInterface';
import { cleanAuthHeader } from '../common/utilities';

export default class BundleResourceRoute {
    readonly router: Router;

    private bundleHandler: BundleHandler;

    constructor(
        dataService: DataServiceInterface,
        authService: AuthorizationInterface,
        fhirVersion: VERSION,
        serverUrl: string,
    ) {
        this.router = express.Router();
        this.bundleHandler = new BundleHandler(dataService, authService, fhirVersion, serverUrl);
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
