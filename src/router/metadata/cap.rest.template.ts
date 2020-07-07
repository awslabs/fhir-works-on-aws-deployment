export default function makeRest(resource: any[], security: any) {
    return {
        mode: 'server',
        documentation: 'Main FHIR endpoint',
        security,
        resource,
        interaction: [{ code: 'transaction' }],
    };
}
