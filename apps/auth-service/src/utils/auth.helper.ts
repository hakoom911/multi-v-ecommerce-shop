import { NextFunction } from "express";
import { ValidationError } from "../../../../packages/error-handler";
import crypto from "crypto";
import redis from "../../../../packages/libs/redis";
import { sendEmail } from "./send-mail";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistrationData(data: any, userType: "user" | "seller") {
    const { name, email, password, phone_number, country } = data;

    if (!name || !email || !password || (userType === "seller" && (!phone_number || !country))) {
        throw new ValidationError("Missing required fields!");
    }

    if (!emailRegex.test(email)) {
        throw new ValidationError("Invalid email format!");
    }

}

export async function checkOTPRestrictions(email: string, next: NextFunction) {
    if(await redis.get(`otp_lock:${email}`)){
        return next(new ValidationError("Account locked due to multiple failed attempt! ,try again after 30 minutes."))
    }
    if(await redis.get(`otp_spam_lock:${email}`)){
        return next(new ValidationError("Too many requests!, please wait 1hour before requesting again."))
    }
    if(await redis.get(`otp_cooldown:${email}`)){
        return next(new ValidationError("Please wait 1minute before requesting again a new OTP!"))
    }
}

export async function sendOTP(name:string, email:string, template:string){
    const otp = crypto.randomInt(100000,999999).toString();
    await sendEmail(email,"Verify Your Email", template, {name, otp})
    await redis.set(`otp:${email}`, otp, 'EX', 300);
    await redis.set(`otp_cooldown:${email}`,"true", "EX", 60)
}