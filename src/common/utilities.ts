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

export function getOperation(verb: string, urlPath: string): Hearth.Operation {
    const path = cleanUrlPath(urlPath);
    const urlSplit = path.split('/');
    switch (verb) {
        case 'PUT':
        case 'PATCH': {
            return 'update';
        }
        case 'DELETE': {
            return 'delete';
        }
        case 'GET': {
            if (urlSplit[urlSplit.length - 1] === '_history') return 'history';
            if (path.includes('_history/')) return 'vread';
            // For a generic read it has to be [type]/[id]
            if (urlSplit.length === 2) return 'read';
            return 'search';
        }
        case 'POST': {
            if (path.includes('_search')) return 'search';
            if (path.length === 0) return 'transaction';
            return 'create';
        }
        default: {
            throw new Error('Unable to parse the http verb');
        }
    }
}

export function getResource(urlPath: string, operation: Hearth.Operation): string | undefined {
    const path = cleanUrlPath(urlPath);
    const urlSplit = path.split('/');
    // There is no explicit type for a batch
    if (operation === 'transaction') return undefined;
    // Global search
    if (operation === 'search' && (path.length === 0 || urlSplit[0] === '_search')) {
        return undefined;
    }
    // Getting global history
    if (operation === 'history' && urlSplit[0] === '_history') {
        return undefined;
    }

    return urlSplit[0];
}
