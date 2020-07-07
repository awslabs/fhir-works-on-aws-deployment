export default interface CrudHandlerInterface {
    create(resourceType: string, resource: any): any;
    update(resourceType: string, id: string, resource: any): any;
    read(resourceType: string, id: string): any;
    vRead(resourceType: string, id: string, vid: string): any;
    delete(resourceType: string, id: string): any;
    search(resourceType: string, searchParams: any): any;
}
