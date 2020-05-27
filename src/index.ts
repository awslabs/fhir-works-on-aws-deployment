import serverless from 'serverless-http';
import app from './app';

const serverlessHandler = serverless(app, {
    request(request: any, event: any) {
        request.user = event.user;
    },
});

export default async (event: any = {}, context: any = {}): Promise<any> => {
    return serverlessHandler(event, context);
};
