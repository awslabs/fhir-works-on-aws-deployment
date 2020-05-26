import { VERSION } from '../constants';

export default function makeStatement(rest: any, orgName: string, url: string, fhirVersion: VERSION) {
    const cap: any = {
        resourceType: 'CapabilityStatement',
        status: 'active',
        date: new Date().toISOString(),
        publisher: orgName,
        kind: 'instance',
        software: {
            name: 'FHIR Server',
            version: '1.0.0',
        },
        implementation: {
            description: `A FHIR ${fhirVersion} Server`,
            url,
        },
        fhirVersion,
        format: ['application/json'],
        rest: [rest],
    };
    // TODO finalize
    if (fhirVersion !== VERSION.R4_0_1) {
        cap.acceptUnknown = 'no';
    }
    return cap;
}
