export default function makeStatement(rest: any, orgName: string, url: string, fhirVersion: Hearth.FhirVersion) {
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
    if (fhirVersion !== '4.0.1') {
        cap.acceptUnknown = 'no';
    }
    return cap;
}
