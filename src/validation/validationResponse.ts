export default class ValidationResponse {
    readonly success: boolean = false;

    readonly message: string = '';

    constructor(success: boolean, message: string = '') {
        this.success = success;
        this.message = message;
    }
}
