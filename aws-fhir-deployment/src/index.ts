import serverless from 'serverless-http';
import { generateServerlessRouter } from 'aws-fhir-routing';
import { fhirConfig, genericResources } from './config';

const serverlessHandler = serverless(generateServerlessRouter(fhirConfig, genericResources), {
    request(request: any, event: any) {
        request.user = event.user;
    },
});

export default async (event: any = {}, context: any = {}): Promise<any> => {
    return serverlessHandler(event, context);
};
