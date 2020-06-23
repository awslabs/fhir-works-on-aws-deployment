import { R4_RESOURCE, INTERACTION } from '../constants';

export function chunkArray(myArray: any[], chunkSize: number): any[][] {
    const results = [];

    while (myArray.length) {
        results.push(myArray.splice(0, chunkSize));
    }

    return results;
}

export function clone(item: any) {
    return JSON.parse(JSON.stringify(item));
}

export function cleanAuthHeader(authorizationHeader?: string): string {
    let token = authorizationHeader || '';
    if (token.substr(0, 'Bearer '.length) === 'Bearer ') {
        token = token.substr('Bearer '.length);
    }
    return token;
}

export function cleanUrlPath(urlPath: string): string {
    let path = urlPath;
    if (urlPath.indexOf('/') === 0) {
        path = urlPath.substr(1);
    }
    return path;
}

export function getInteraction(verb: string, urlPath: string): INTERACTION {
    const path = cleanUrlPath(urlPath);
    const urlSplit = path.split('/');
    switch (verb) {
        case 'PUT':
        case 'PATCH': {
            return INTERACTION.UPDATE;
        }
        case 'DELETE': {
            return INTERACTION.DELETE;
        }
        case 'GET': {
            if (urlSplit[urlSplit.length - 1] === '_history') return INTERACTION.HISTORY;
            if (path.includes('_history/')) return INTERACTION.VREAD;
            // For a generic read it has to be [type]/[id]
            if (urlSplit.length === 2) return INTERACTION.READ;
            return INTERACTION.SEARCH;
        }
        case 'POST': {
            if (path.includes('_search')) return INTERACTION.SEARCH;
            if (path.length === 0) return INTERACTION.TRANSACTION;
            return INTERACTION.CREATE;
        }
        default: {
            throw new Error('Unable to parse the http verb');
        }
    }
}

export function getResource(urlPath: string, interaction: INTERACTION): R4_RESOURCE | undefined {
    const path = cleanUrlPath(urlPath);
    const urlSplit = path.split('/');
    // There is no explicit type for a batch
    if (interaction === INTERACTION.TRANSACTION) return undefined;
    // Global search
    if (interaction === INTERACTION.SEARCH && (path.length === 0 || urlSplit[0] === '_search')) {
        return undefined;
    }
    // Getting global history
    if (interaction === INTERACTION.HISTORY && urlSplit[0] === '_history') {
        return undefined;
    }

    const result: R4_RESOURCE | undefined = (<any>R4_RESOURCE)[urlSplit[0]];
    if (result === undefined) {
        throw new Error('Unable to parse the resource type requested');
    }
    return result;
}
