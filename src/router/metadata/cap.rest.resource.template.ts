import { Operation } from '../../interface/constants';

function makeResourceObject(
    resourceType: string,
    resourceOperations: any[],
    updateCreate: boolean,
    searchParam: boolean,
) {
    const result: any = {
        type: resourceType,
        // TODO do we want this?
        // profile: {
        //     reference: 'http://fhir.hl7.org/base/StructureDefinition/7896271d-57f6-4231-89dc-dcc91eab2416',
        // },
        interaction: resourceOperations,
        versioning: 'versioned',
        readHistory: false,
        updateCreate,
        conditionalCreate: false,
        conditionalRead: 'not-supported',
        conditionalUpdate: false,
        conditionalDelete: 'not-supported',
    };

    // TODO: Handle case where user specify exactly which search parameters is supported for each resource
    if (searchParam) {
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

export function makeOperation(operations: Operation[]) {
    const resourceOperations: any[] = [];

    operations.forEach((operation: Operation) => {
        resourceOperations.push({ code: operation });
    });

    return resourceOperations;
}

export function makeGenericResources(fhirResourcesToMake: string[], operations: Operation[], searchParams: boolean) {
    const resources: any[] = [];

    const resourceOperations: any[] = makeOperation(operations);
    const updateCreate: boolean = operations.includes('update');

    fhirResourcesToMake.forEach((resourceType: string) => {
        resources.push(makeResourceObject(resourceType, resourceOperations, updateCreate, searchParams));
    });

    return resources;
}

export function makeResource(resourceType: string, operations: Operation[], searchParam: boolean) {
    const resourceOperations: any[] = makeOperation(operations);
    const updateCreate: boolean = operations.includes('update');
    const resource = makeResourceObject(resourceType, resourceOperations, updateCreate, searchParam);

    return resource;
}
