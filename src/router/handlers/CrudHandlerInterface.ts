export default interface CrudHandlerInterface {
    create(resourceType: string, resource: any): any;
    update(resourceType: string, id: string, resource: any): any;
    patch(resourceType: string, id: string, resource: any): any;
    read(resourceType: string, id: string): any;
    vRead(resourceType: string, id: string, vid: string): any;
    delete(resourceType: string, id: string): any;
    typeSearch(resourceType: string, searchParams: any): any;
    typeHistory(resourceType: string, searchParams: any): any;
    instanceHistory(resourceType: string, id: string, searchParams: any): any;
}
