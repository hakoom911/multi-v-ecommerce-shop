import { Response } from "express";

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
export default function setCookie(res: Response, name:string, value:string){
    res.cookie(name,value,{
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: COOKIE_MAX_AGE
    })
} 