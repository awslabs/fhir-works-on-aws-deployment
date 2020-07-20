import express from 'express';
import GenericResourceRoute from './router/routes/genericResourceRoute';
import ConfigHandler from './configHandler';
import MetadataRoute from './router/routes/metadataRoute';
import ResourceHandler from './router/handlers/resourceHandler';
import RootRoute from './router/routes/rootRoute';
import { cleanAuthHeader, getRequestInformation } from './interface/utilities';
import { FhirVersion, TypeOperation } from './interface/constants';
import { FhirConfig } from './interface/fhirConfig';

export default function generateServerlessRouter(fhirConfig: FhirConfig, supportedGenericResources: string[]) {
    const configHandler: ConfigHandler = new ConfigHandler(fhirConfig, supportedGenericResources);
    const fhirVersion: FhirVersion = fhirConfig.profile.version;
    const serverUrl: string = fhirConfig.server.url;
    const app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(
        express.json({
            type: ['application/json', 'application/fhir+json', 'application/json-patch+json'],
        }),
    );

    // AuthZ
    app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const requestInformation = getRequestInformation(req.method, req.path);
            const accessToken: string = cleanAuthHeader(req.headers.authorization);
            const isAllowed: boolean = fhirConfig.auth.authorization.isAuthorized({
                ...requestInformation,
                accessToken,
            });
            if (isAllowed) {
                next();
            } else {
                res.status(403).json({ message: 'Forbidden' });
            }
        } catch (e) {
            res.status(403).json({ message: `Forbidden. ${e.message}` });
        }
    });

    // Metadata
    const metadataRoute: MetadataRoute = new MetadataRoute(fhirVersion, configHandler);
    app.use('/metadata', metadataRoute.router);

    // Generic Resource Support
    if (fhirConfig.profile.genericResource) {
        const genericOperations: TypeOperation[] = configHandler.getGenericOperations(fhirVersion);

        const genericResourceHandler: ResourceHandler = new ResourceHandler(
            fhirConfig.profile.genericResource.persistence,
            fhirConfig.profile.genericResource.typeSearch,
            fhirConfig.profile.genericResource.typeHistory,
            fhirVersion,
            serverUrl,
        );

        const genericRoute: GenericResourceRoute = new GenericResourceRoute(genericOperations, genericResourceHandler);

        // Make a list of resources to make
        const genericFhirResources: string[] = configHandler.getGenericResources(fhirVersion);

        // Set up Resource for each generic resource
        genericFhirResources.forEach(async (resourceType: string) => {
            app.use(`/${resourceType}`, genericRoute.router);
        });
    }

    // Special Resources
    if (fhirConfig.profile.resources) {
        Object.entries(fhirConfig.profile.resources).forEach(async resourceEntry => {
            const { operations, persistence, typeSearch, typeHistory } = resourceEntry[1];

            const resourceHandler: ResourceHandler = new ResourceHandler(
                persistence,
                typeSearch,
                typeHistory,
                fhirVersion,
                serverUrl,
            );

            const route: GenericResourceRoute = new GenericResourceRoute(operations, resourceHandler);
            app.use(`/${resourceEntry[0]}`, route.router);
        });
    }

    // Root Post (Bundle/Global Search)
    if (fhirConfig.profile.systemOperations.length > 0) {
        const rootRoute = new RootRoute(
            fhirConfig.profile.systemOperations,
            fhirVersion,
            serverUrl,
            fhirConfig.profile.bundle,
            fhirConfig.profile.systemSearch,
            fhirConfig.profile.systemHistory,
            fhirConfig.auth.authorization,
            fhirConfig.profile.genericResource,
            fhirConfig.profile.resources,
        );
        app.use('/', rootRoute.router);
    }

    // Handle errors
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        const statusCode = err.statusCode || 500;
        console.error('Error', err);
        res.status(statusCode).send(err.errorDetail);
    });

    return app;
}
