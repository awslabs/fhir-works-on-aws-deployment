import { TypeOperation, SystemOperation } from 'aws-fhir-interface';

function makeResourceObject(
    resourceType: string,
    resourceOperations: any[],
    updateCreate: boolean,
    hasTypeSearch: boolean,
) {
    const result: any = {
        type: resourceType,
        interaction: resourceOperations,
        versioning: 'versioned',
        readHistory: false,
        updateCreate, // TODO do we actually do updateCreate?
        conditionalCreate: false,
        conditionalRead: 'not-supported',
        conditionalUpdate: false,
        conditionalDelete: 'not-supported',
    };

    // TODO: Handle case where user specify exactly which search parameters is supported for each resource
    if (hasTypeSearch) {
        result.searchParam = [
            {
                name: 'ALL',
                type: 'composite',
                documentation: 'Support all fields.',
            },
        ];
    }

    return result;
}

export function makeOperation(operations: (TypeOperation | SystemOperation)[]) {
    const resourceOperations: any[] = [];

    operations.forEach(operation => {
        resourceOperations.push({ code: operation });
    });

    return resourceOperations;
}

export function makeGenericResources(fhirResourcesToMake: string[], operations: TypeOperation[]) {
    const resources: any[] = [];

    const resourceOperations: any[] = makeOperation(operations);
    const updateCreate: boolean = operations.includes('update');
    const hasTypeSearch: boolean = operations.includes('search-type');

    fhirResourcesToMake.forEach((resourceType: string) => {
        resources.push(makeResourceObject(resourceType, resourceOperations, updateCreate, hasTypeSearch));
    });

    return resources;
}

export function makeResource(resourceType: string, operations: TypeOperation[]) {
    const resourceOperations: any[] = makeOperation(operations);
    const updateCreate: boolean = operations.includes('update');
    const hasTypeSearch: boolean = operations.includes('search-type');

    const resource = makeResourceObject(resourceType, resourceOperations, updateCreate, hasTypeSearch);

    return resource;
}
