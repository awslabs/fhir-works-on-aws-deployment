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
        const { IS_OFFLINE } = process.env;
        const ssm = new AWS.SSM();
        let path = process.env.INTEGRATION_TRANSFORM_PATH ?? 'fake_path';
        if (IS_OFFLINE === 'true') {
            // TODO: Does this value need to be dynamic?
            path = 'fhir-service.integration-transform.us-west-2.dev.url';
        }
        const data = await ssm
            .getParameter({
                Name: path,
                WithDecryption: true,
            })
            .promise();

        if (data.Parameter?.Value === undefined) {
            console.error(`Unable to get INTEGRATION_TRANSFORM_PATH. Path: ${path}`);
        }

        // TODO: What to do if we can't get the parameter value
        return data.Parameter?.Value ?? '';
    }
}

SecretsManager.initialize();
