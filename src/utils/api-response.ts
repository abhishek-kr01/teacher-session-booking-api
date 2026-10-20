export class ApiResponse<T> {
    public readonly success = true;
    public readonly message: string;
    public readonly data: T;

    constructor(_statusCode: number, data: T, message = "Operation completed successfully") {
        this.message = message;
        this.data = data;
    }
}
