import express from 'express';
import GenericResourceRoute from './routes/genericResourceRoute';
import ConfigHandler from './configHandler';
import fhirConfig from './config';
import MetadataRoute from './routes/metadataRoute';
import DynamoDbDataService from './dataServices/ddb/dynamoDbDataService';
import ResourceHandler from './handlers/resourceHandler';
import BinaryHandler from './handlers/binaryHandler';
import S3ObjectStorageService from './objectStorageService/s3ObjectStorageService';
import ElasticSearchService from './searchService/elasticSearchService';
import BundleResourceRoute from './routes/bundleResourceRoute';
import { DynamoDb } from './dataServices/ddb/dynamoDb';
import RBACHandler from './authorization/RBACHandler';
import RBACRules from './authorization/RBACRules';
import { cleanAuthHeader } from './common/utilities';

const { IS_OFFLINE } = process.env;

// TODO handle multi versions in one server
const configHandler: ConfigHandler = new ConfigHandler(fhirConfig);
const fhirVersion: Hearth.FhirVersion = fhirConfig.profile.version;
const serverUrl: string = fhirConfig.server.url;

const genericOperations: Hearth.Operation[] = configHandler.getGenericOperations(fhirVersion);
const searchParams = configHandler.getSearchParam();

const dynamoDbDataService = new DynamoDbDataService(DynamoDb);
const authService = new RBACHandler(RBACRules);

const genericResourceHandler: ResourceHandler = new ResourceHandler(
    dynamoDbDataService,
    ElasticSearchService,
    fhirVersion,
    serverUrl,
);

const genericRoute: GenericResourceRoute = new GenericResourceRoute(
    genericOperations,
    searchParams,
    genericResourceHandler,
);

const metadataRoute: MetadataRoute = new MetadataRoute(fhirVersion, fhirConfig);

// Make a list of resources to make
const genericFhirResources: string[] = configHandler.getGenericResources(fhirVersion);

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(
    express.json({
        type: ['application/json', 'application/fhir+json'],
    }),
);

// AuthZ
app.use(async (req: express.Request, res: express.Response, next) => {
    try {
        const isAllowed: boolean = authService.isAuthorized(
            cleanAuthHeader(req.headers.authorization),
            req.method,
            req.path,
        );
        if (isAllowed || IS_OFFLINE === 'true') {
            next();
        } else {
            res.status(403).json({ message: 'Forbidden' });
        }
    } catch (e) {
        res.status(403).json({ message: `Forbidden. ${e.message}` });
    }
});

// Capability Statement
app.use('/metadata', metadataRoute.router);

// Are we handling Binary Generically
if (configHandler.isBinaryGeneric(fhirVersion)) {
    const binaryHandler: BinaryHandler = new BinaryHandler(dynamoDbDataService, S3ObjectStorageService, fhirVersion);
    const binaryRoute: GenericResourceRoute = new GenericResourceRoute(genericOperations, searchParams, binaryHandler);
    app.use('/Binary', binaryRoute.router);
}

// Set up Resource for each generic resource
genericFhirResources.forEach((resourceType: string) => {
    app.use(`/${resourceType}`, genericRoute.router);
});

// We're not using the GenericResourceRoute because Bundle '/' path only support POST
const bundleResourceRoute = new BundleResourceRoute(dynamoDbDataService, authService, fhirVersion, serverUrl);
app.use('/', bundleResourceRoute.router);

// Handle errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const statusCode = err.statusCode || 500;
    console.error('Error', err);
    res.status(statusCode).send(err.errorDetail);
});

export default app;
