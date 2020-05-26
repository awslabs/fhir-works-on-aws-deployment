export default class ServiceResponse {
    readonly success: boolean = false;

    readonly message: string = '';

    readonly resource: any = {};

    constructor(success: boolean, message: string = '', resource: any = {}) {
        this.success = success;
        this.message = message;
        this.resource = resource;
    }
}
