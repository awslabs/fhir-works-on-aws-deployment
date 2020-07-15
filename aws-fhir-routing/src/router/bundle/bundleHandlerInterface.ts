export default interface BundleHandlerInterface {
    processBatch(resource: any, accessKey: string): any;
    processTransaction(resource: any, accessKey: string): any;
}
