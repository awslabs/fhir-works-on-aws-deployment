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
