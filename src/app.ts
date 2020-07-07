import express from 'express';
import GenericResourceRoute from './router/routes/genericResourceRoute';
import ConfigHandler from './configHandler';
import fhirConfig from './config';
import MetadataRoute from './router/routes/metadataRoute';
import DynamoDbDataService from './persistence/dataServices/dynamoDbDataService';
import ResourceHandler from './router/handlers/resourceHandler';
import BinaryHandler from './router/handlers/binaryHandler';
import S3ObjectStorageService from './persistence/objectStorageService/s3ObjectStorageService';
import ElasticSearchService from './search/elasticSearchService';
import BundleResourceRoute from './router/routes/bundleResourceRoute';
import { DynamoDb } from './persistence/dataServices/dynamoDb';
import RBACHandler from './authorization/RBACHandler';
import RBACRules from './authorization/RBACRules';
import { cleanAuthHeader, getRequestInformation } from './interface/utilities';
import DynamoDbBundleService from './persistence/dataServices/dynamoDbBundleService';
import { FhirVersion, Operation } from './interface/constants';

// TODO handle multi versions in one server
const configHandler: ConfigHandler = new ConfigHandler(fhirConfig);
const fhirVersion: FhirVersion = fhirConfig.profile.version;
const serverUrl: string = fhirConfig.server.url;

const genericOperations: Operation[] = configHandler.getGenericOperations(fhirVersion);
const searchParams = configHandler.getSearchParam();

const dynamoDbDataService = new DynamoDbDataService(DynamoDb);
const bundleService = new DynamoDbBundleService(DynamoDb);
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
app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const requestInformation = getRequestInformation(req.method, req.path);
        const accessToken: string = cleanAuthHeader(req.headers.authorization);
        const isAllowed: boolean = authService.isAuthorized({ ...requestInformation, accessToken });
        if (isAllowed) {
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
const bundleResourceRoute = new BundleResourceRoute(
    dynamoDbDataService,
    bundleService,
    authService,
    fhirVersion,
    serverUrl,
);
app.use('/', bundleResourceRoute.router);

// Handle errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const statusCode = err.statusCode || 500;
    console.error('Error', err);
    res.status(statusCode).send(err.errorDetail);
});

export default app;
