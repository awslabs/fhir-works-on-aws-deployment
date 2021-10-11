/*
This scripts generates the two patientCompartmentSearchParams JSON files from compartment definition files and save them at bulkExport/schema.

Run the script:
> node extractPatientCompartmentSearchParams.js

The compartment definition files are downloaded from the following URL and saved in folder bulkExport/schema:

compartmentdefinition-patient.4.0.1.json: https://www.hl7.org/fhir/compartmentdefinition-patient.json.html (Note Device is added to this file due to Inferno test <BDGV-23: Medication resources returned conform to the US Core Medication Profile if bulk data export has Medication resources>)
compartmentdefinition-patient.3.0.2.json: http://hl7.org/fhir/stu3/compartmentdefinition-patient.json.html (Note the AuditEvent and Provenance fields in this file are updated to remove dotted path)
 */

const fs = require('fs');
const compartmentPatientV3 = require('./schema/compartmentdefinition-patient.3.0.2.json');
const compartmentPatientV4 = require('./schema/compartmentdefinition-patient.4.0.1.json');
const baseSearchParamsV3 = require('../../fhir-works-on-aws-search-es/src/schema/compiledSearchParameters.3.0.1.json');
const baseSearchParamsV4 = require('../../fhir-works-on-aws-search-es/src/schema/compiledSearchParameters.4.0.1.json');

// Create a dictionary of search params
function extractPatientCompartmentSearchParams(baseSearchParams, compartmentPatient) {
    const baseSearchParamsDict = {};
    // example of an item in baseSearchParamsDict: Account-identifier: {resourceType: "Account", path: "identifier"}
    baseSearchParams.forEach(param => {
        baseSearchParamsDict[`${param.base}-${param.name}`] = param.compiled;
    });

    // Find the search params needed for patient compartment
    const patientCompartmentSearchParams = {};
    compartmentPatient.resource.forEach(resource => {
        if (resource.param) {
            let compiledPaths = [];
            resource.param.forEach(param => {
                const pathsForThisParam = baseSearchParamsDict[`${resource.code}-${param}`].map(item => item.path);
                compiledPaths = compiledPaths.concat(pathsForThisParam);
            });
            patientCompartmentSearchParams[resource.code] = compiledPaths;
        }
    });
    return patientCompartmentSearchParams;
}

const patientCompartmentSearchParamsV4 = extractPatientCompartmentSearchParams(
    baseSearchParamsV4,
    compartmentPatientV4,
);
const patientCompartmentSearchParamsV3 = extractPatientCompartmentSearchParams(
    baseSearchParamsV3,
    compartmentPatientV3,
);

fs.writeFileSync(
    './schema/patientCompartmentSearchParams.3.0.2.json',
    JSON.stringify(patientCompartmentSearchParamsV3),
);
fs.writeFileSync(
    './schema/patientCompartmentSearchParams.4.0.1.json',
    JSON.stringify(patientCompartmentSearchParamsV4),
);

console.log(patientCompartmentSearchParamsV4);
console.log(patientCompartmentSearchParamsV3);
