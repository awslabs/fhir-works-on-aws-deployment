import AWS from 'aws-sdk';
import { makeLogger } from 'fhir-works-on-aws-interface';

const componentLogger = makeLogger({
    component: 'search',
});

export default function getComponentLogger(): any {
    return componentLogger;
}

const logger = getComponentLogger();
const parameterStore = new AWS.SSM();

export async function getParameter(parameterName: string): Promise<string> {
    let result;
    try {
        result = await parameterStore
            .getParameter({
                Name: parameterName,
            })
            .promise();
    } catch (err) {
        logger.error('ParameterStore error:', err);
        throw err;
    }
    const parameterValue = result.Parameter!.Value!;
    logger.info(parameterName, parameterValue);

    return parameterValue;
}
