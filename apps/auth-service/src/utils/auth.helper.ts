import { NextFunction } from "express";
import crypto from "crypto";
import { sendEmail } from "./send-mail";
import { ValidationError } from "@packages/error-handler";
import redis from "@packages/libs/redis";

const OTP_CONFIGS = {
    MAXIMUM_REQUEST_COUNT: 2,
    EX_S: 300, // 5 minutes
    LOCK_EX_S: 1800, // 30 minutes
    SPAM_LOCK_EX_S: 3600, // 1 hour 
    REQUEST_COUNT_EX_S: 3600,
    COOLDOWN_EX_S: 60, // 1 minutes
    MAXIMUM_ATTEMPTS_COUNT: 2,
    ATTEMPTS_COUNT_EX_S: 300
}

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

export async function checkOTPRestrictions(email: string) {
    if (await redis.get(`otp_lock:${email}`)) {
        throw new ValidationError("Account locked due to multiple failed attempt ,try again after 30 minutes.")
    }
    if (await redis.get(`otp_spam_lock:${email}`)) {
        throw new ValidationError("Too many requests, please wait 1 hour before requesting again.")
    }
    if (await redis.get(`otp_cooldown:${email}`)) {
        throw new ValidationError("Please wait 1 minute before requesting again a new OTP!")
    }
}

export async function trackOTPRequests(email: string, next: NextFunction) {
    const otpRequestCountKey = `otp_request_count:${email}`;
    const otpRequestCount = parseInt((await redis.get(otpRequestCountKey) || "0"));
    if (otpRequestCount >= OTP_CONFIGS['MAXIMUM_REQUEST_COUNT']) {
        await redis.set(`otp_spam_lock:${email}`, "locked", "EX", OTP_CONFIGS['SPAM_LOCK_EX_S']) // Lock for 1 hour 
        return next(new ValidationError("Too many requests, please wait 1 hour before requesting again."))
    }
    await redis.set(otpRequestCountKey, otpRequestCount + 1, "EX", OTP_CONFIGS['REQUEST_COUNT_EX_S']);
}

export async function sendOTP(name: string, email: string, template: string) {
    const otp = crypto.randomInt(100000, 999999).toString();
    await sendEmail(email, "Verify Your Email", template, { name, otp })
    await redis.set(`otp:${email}`, otp, 'EX', OTP_CONFIGS['EX_S']);
    await redis.set(`otp_cooldown:${email}`, "true", "EX", OTP_CONFIGS['COOLDOWN_EX_S'])
}

export async function verifyOTP(email: string, otp: string, next: NextFunction) {
    const storedOTP = await redis.get(`otp:${email}`);
    if (!storedOTP) {
        new ValidationError("Invalid or expired OTP!")
    }
    const failedAttemptsKey = `otp_attempts:${email}`;
    const failedAttempts = parseInt((await redis.get(failedAttemptsKey)) || "0");

    if (storedOTP !== otp) {
        if (failedAttempts >= OTP_CONFIGS['MAXIMUM_ATTEMPTS_COUNT']) {
            await redis.set(`otp_lock:${email}`, "locked", "EX", OTP_CONFIGS['LOCK_EX_S']);
            await redis.del(`otp:${email}`, failedAttemptsKey);
            throw new ValidationError("Too many failed attempts. Your account is locked for 30 minutes!");
        }
        await redis.set(failedAttemptsKey, failedAttempts + 1, "EX", OTP_CONFIGS['ATTEMPTS_COUNT_EX_S'])
        throw new ValidationError(`Incorrect OTP. ${OTP_CONFIGS['MAXIMUM_ATTEMPTS_COUNT'] - failedAttempts} attempts left.`)
    }
    await redis.del(`otp:${email}`, failedAttemptsKey);   
}