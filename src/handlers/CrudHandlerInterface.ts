export default interface CrudHandlerInterface {
    create(resourceType: string, resource: any): any;
    update(resourceType: string, id: string, resource: any): any;
    get(resourceType: string, id: string): any;
    getHistory(resourceType: string, id: string, versionId: string): any;
    delete(resourceType: string, id: string): any;
    search(resourceType: string, searchParams: any): any;
}
