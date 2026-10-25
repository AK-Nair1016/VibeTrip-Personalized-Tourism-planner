export class AppError extends Error{
    public readonly statusCode: number;
    public readonly code: string;

    constructor(
        code: string,
        message: string,
        statusCode:number = 400
    ) {
        super(message);
        this.name ="AppError";
        this.code =code;
        this.statusCode = statusCode;

        Error.captureStackTrace(this,this.constructor);
    }
}