import AWS from 'aws-sdk';
import { makeLogger } from 'fhir-works-on-aws-interface';

const componentLogger = makeLogger({
    component: 'search',
});

export default function getComponentLogger(): any {
    return componentLogger;
}

const logger = getComponentLogger();
const kms = new AWS.KMS();

export async function kmsDecrypt(cipherText: string | undefined) {
    let decryptedText;
    if (cipherText) {
        try {
            const request = {
                CiphertextBlob: Buffer.from(cipherText, 'base64'),
            };
            const data = await kms.decrypt(request).promise();
            decryptedText = data.Plaintext?.toString('ascii');
        } catch (err) {
            logger.error('Decrypt error: ', err);
            throw err;
        }
    } else {
        logger.warn('Cannot perform decryption because cipherText is undefined.');
    }
    return decryptedText;
}
