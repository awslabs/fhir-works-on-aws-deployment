import { handleDdbToEsEvent } from 'aws-fhir-routing';

exports.handler = async (event: any) => {
    await handleDdbToEsEvent(event);
};
