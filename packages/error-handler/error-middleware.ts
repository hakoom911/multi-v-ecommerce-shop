import { Response, Request, NextFunction } from "express";
import { AppError } from ".";

export const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
        console.log(`Error ${req.method} ${req.url} - ${err.message}`);
        return res.status(err.statusCode).json({
            status: "error",
            message: err.message,
            result: !err.details ? {} : { ...err.details }
        },)
    }

    console.error("Unhandled error : ", err);
    return res.status(500).json({ error: "Something went wrong. Please try again later!" })
}