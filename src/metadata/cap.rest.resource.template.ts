import { INTERACTION } from '../constants';

function makeResourceObject(
    resourceType: string,
    resourceInteractions: any[],
    updateCreate: boolean,
    searchParam: boolean,
) {
    const result: any = {
        type: resourceType,
        // TODO do we want this?
        // profile: {
        //     reference: 'http://fhir.hl7.org/base/StructureDefinition/7896271d-57f6-4231-89dc-dcc91eab2416',
        // },
        interaction: resourceInteractions,
        versioning: 'versioned-update',
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

export function makeInteraction(interactions: INTERACTION[]) {
    const resourceInteractions: any[] = [];

    interactions.forEach((interaction: INTERACTION) => {
        resourceInteractions.push({ code: interaction });
    });

    return resourceInteractions;
}

export function makeGenericResources(
    fhirResourcesToMake: string[],
    interactions: INTERACTION[],
    searchParams: boolean,
) {
    const resources: any[] = [];

    const resourceInteractions: any[] = makeInteraction(interactions);
    const updateCreate: boolean = interactions.includes(INTERACTION.UPDATE);

    fhirResourcesToMake.forEach((resourceType: string) => {
        resources.push(makeResourceObject(resourceType, resourceInteractions, updateCreate, searchParams));
    });

    return resources;
}

export function makeResource(resourceType: string, interactions: INTERACTION[], searchParam: boolean) {
    const resourceInteractions: any[] = makeInteraction(interactions);
    const updateCreate: boolean = interactions.includes(INTERACTION.UPDATE);
    const resource = makeResourceObject(resourceType, resourceInteractions, updateCreate, searchParam);

    return resource;
}
