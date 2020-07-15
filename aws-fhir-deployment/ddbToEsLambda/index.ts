import { handleDdbToEsEvent } from 'aws-fhir-persistence';

exports.handler = async (event: any) => {
    await handleDdbToEsEvent(event);
};
