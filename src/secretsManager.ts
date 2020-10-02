import AWS from 'aws-sdk';

export default class SecretsManager {
    static initialize() {
        const { IS_OFFLINE } = process.env;
        if (IS_OFFLINE === 'true') {
            AWS.config.update({
                region: 'us-west-2',
                accessKeyId: process.env.ACCESS_KEY,
                secretAccessKey: process.env.SECRET_KEY,
            });
        }
    }

    static async getIntegrationTransformUrl(): Promise<string> {
        const ssm = new AWS.SSM();
        const envVar = process.env.INTEGRATION_TRANSFORM_PATH;
        console.log('envVar', envVar);
        const path = envVar;
        // const path = 'fhir-service_integration-transform_us-west-2_dev_url';
        // console.log('Path', path);
        // @ts-ignore
        const data = await ssm
            .getParameter({
                Name: path,
                WithDecryption: true,
            })
            .promise();

        // TODO: What to do if we can't get the parameter value
        return data.Parameter?.Value || '';
    }
}

SecretsManager.initialize();
