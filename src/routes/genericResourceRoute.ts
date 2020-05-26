import express, { Router } from 'express';
import { INTERACTION } from '../constants';
import CrudHandlerInterface from '../handlers/CrudHandlerInterface';
import OperationsGenerator from '../operationsGenerator';
import BadRequestError from '../errors/BadRequestError';
import RouteHelper from './routeHelper';

export default class GenericResourceRoute {
    readonly interactions: INTERACTION[];

    readonly searchParam: boolean;

    readonly router: Router;

    private handler: CrudHandlerInterface;

    constructor(interactions: INTERACTION[], searchParam: boolean, handler: CrudHandlerInterface) {
        this.interactions = interactions;
        this.searchParam = searchParam;
        this.handler = handler;
        this.router = express.Router();
        this.init();
    }

    private init() {
        // TODO handle HTTP response code
        if (this.interactions.includes(INTERACTION.READ)) {
            // READ
            this.router.get(
                '/:id',
                RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
                    // Get the ResourceType looks like '/Patient'
                    const resourceType = req.baseUrl.substr(1);
                    const { id } = req.params;
                    const response = await this.handler.get(resourceType, id);
                    if (response.meta) {
                        res.set({ ETag: `W/"${response.meta.versionId}"`, 'Last-Modified': response.meta.lastUpdated });
                    }
                    res.send(response);
                }),
            );
        }

        // VREAD
        if (this.interactions.includes(INTERACTION.VREAD)) {
            this.router.get(
                '/:id/_history/:vid',
                RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
                    // Get the ResourceType looks like '/Patient'
                    const resourceType = req.baseUrl.substr(1);
                    const { id, vid } = req.params;
                    const response = await this.handler.getHistory(resourceType, id, vid);
                    if (response.meta) {
                        res.set({ ETag: `W/"${response.meta.versionId}"`, 'Last-Modified': response.meta.lastUpdated });
                    }
                    res.send(response);
                }),
            );
        }

        if (this.searchParam) {
            // SEARCH
            this.router.get(
                '/',
                RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
                    // Get the ResourceType looks like '/Patient'
                    const resourceType = req.baseUrl.substr(1);
                    const searchParamQuery = req.query;
                    const response = await this.handler.search(resourceType, searchParamQuery);
                    res.send(response);
                }),
            );
        }

        // CREATE
        if (this.interactions.includes(INTERACTION.CREATE)) {
            this.router.post(
                '/',
                RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
                    // Get the ResourceType looks like '/Patient'
                    const resourceType = req.baseUrl.substr(1);
                    const { body } = req;

                    const response = await this.handler.create(resourceType, body);
                    if (response.meta) {
                        res.set({ ETag: `W/"${response.meta.versionId}"`, 'Last-Modified': response.meta.lastUpdated });
                    }
                    res.status(201).send(response);
                }),
            );
        }

        // UPDATE
        if (this.interactions.includes(INTERACTION.UPDATE)) {
            this.router.put(
                '/:id',
                RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
                    const resourceType = req.baseUrl.substr(1);
                    const { id } = req.params;
                    const { body } = req;

                    if (body.id === null || body.id !== id) {
                        const response = OperationsGenerator.generateUpdateResourceIdsNotMatching(id, body.id);
                        throw new BadRequestError(response);
                    }

                    const response = await this.handler.update(resourceType, id, body);
                    if (response.meta) {
                        res.set({ ETag: `W/"${response.meta.versionId}"`, 'Last-Modified': response.meta.lastUpdated });
                    }
                    res.send(response);
                }),
            );
        }

        // DELETE
        if (this.interactions.includes(INTERACTION.DELETE)) {
            this.router.delete(
                '/:id',
                RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
                    // Get the ResourceType looks like '/Patient'
                    const resourceType = req.baseUrl.substr(1);
                    const { id } = req.params;
                    const response = await this.handler.delete(resourceType, id);
                    res.send(response);
                }),
            );
        }
    }
}
