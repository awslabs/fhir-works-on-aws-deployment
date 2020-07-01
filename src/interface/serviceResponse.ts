export default interface GenericResponse {
    readonly success: boolean;
    readonly message: string;
    readonly resource?: any;
}
