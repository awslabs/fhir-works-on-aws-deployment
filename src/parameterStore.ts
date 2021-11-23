import AWS from 'aws-sdk';

const parameterStore = new AWS.SSM();

export default async function getParameter(parameterName: string): Promise<string> {
    const result = await parameterStore
        .getParameter({
            Name: parameterName,
        })
        .promise();

    return result.Parameter!.Value!;
}
