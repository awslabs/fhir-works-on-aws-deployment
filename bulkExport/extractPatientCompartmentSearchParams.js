const compartmentPatient = require('./compartmentdefinition-patient.json');
const baseSearchParams = require('../../fhir-works-on-aws-search-es/src/schema/compiledSearchParameters.4.0.1.json');

// Create a dictionary of search params
/* example of an item in baseSearchParamsDict:
   Account-identifier: {resourceType: "Account", path: "identifier"}
 */
const baseSearchParamsDict = {};
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

console.log(patientCompartmentSearchParams);
