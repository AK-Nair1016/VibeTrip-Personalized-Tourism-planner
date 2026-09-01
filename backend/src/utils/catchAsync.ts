//wrapper for async express controller  forwards errors to global error handler
import { Request,Response,NextFunction }  from "express";

type AsyncController=(
    req:Request,
    res:Response,
    next:NextFunction
) => Promise<void>;

export const catchAsync =(fn: AsyncController)=>{
    return (req: Request, res: Response, next: NextFunction)=>{
        Promise.resolve(fn(req,res,next)).catch(next);
    };
};