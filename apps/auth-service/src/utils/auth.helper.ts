import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { sendEmail } from "./send-mail";
import { NotFound, ValidationError } from "@packages/error-handler";
import redis from "@packages/libs/redis";
import { TUserType } from "../types";
import { findUserByEmail } from "../dal/users";



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

export function validateRegistrationData(data: any, userType: TUserType) {
    try {
        const { name, email, password, phone_number, country } = data;

        if (!name || !email || !password || (userType === "seller" && (!phone_number || !country))) {
            throw new ValidationError("Missing required fields!");
        }

        if (!emailRegex.test(email)) {
            throw new ValidationError("Invalid email format!");
        }
    } catch (err) {
        throw err
    }
}

export async function checkOTPRestrictions(email: string) {
    try {
        if (await redis.get(`otp_lock:${email}`)) {
            throw new ValidationError("Account locked due to multiple failed attempt ,try again after 30 minutes.")
        }
        if (await redis.get(`otp_spam_lock:${email}`)) {
            throw new ValidationError("Too many requests, please wait 1 hour before requesting again.")
        }
        if (await redis.get(`otp_cooldown:${email}`)) {
            throw new ValidationError("Please wait 1 minute before requesting again a new OTP!")
        }
    } catch (err) {
        throw err
    }
}

export async function trackOTPRequests(email: string) {
    try {
        const otpRequestCountKey = `otp_request_count:${email}`;
        const otpRequestCount = parseInt((await redis.get(otpRequestCountKey) || "0"));

        if (otpRequestCount >= OTP_CONFIGS['MAXIMUM_REQUEST_COUNT']) {
            await redis.set(`otp_spam_lock:${email}`, "locked", "EX", OTP_CONFIGS['SPAM_LOCK_EX_S'])
            throw new ValidationError("Too many requests, please wait 1 hour before requesting again.")
        }

        await redis.set(otpRequestCountKey, otpRequestCount + 1, "EX", OTP_CONFIGS['REQUEST_COUNT_EX_S']);
    } catch (err) {
        throw err
    }
}

export async function sendOTP(name: string, email: string, template: string) {
    try {
        const otp = crypto.randomInt(100000, 999999).toString();
        await sendEmail(email, "Verify Your Email", template, { name, otp })
        await redis.set(`otp:${email}`, otp, 'EX', OTP_CONFIGS['EX_S']);
        await redis.set(`otp_cooldown:${email}`, "true", "EX", OTP_CONFIGS['COOLDOWN_EX_S'])
    } catch (err) {
        throw err
    }
}

export async function verifyOTP(email: string, otp: string) {
    try {
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
    } catch (err) {
        throw err
    }
}

export async function handleForgotPasswordProcess(req: Request, res: Response, userType: TUserType, next: NextFunction) {
    try {
        const { email } = req.body;
        if (!email) throw new ValidationError("Email is required!");
        let user = null;
        if (userType === "user") {
            user = await findUserByEmail(email);
        }
        if (!user) throw new ValidationError(`${userType} not found!`);

        await checkOTPRestrictions(email);
        await trackOTPRequests(email);
        // TODO: make the passed template name dynamic by user type 
        await sendOTP(user.name, email, "forgot-password-user-mail")
        res.status(200).json({
            message: "OTP sent to your email. Please verify your account.",
            result: {}
        })
    } catch (err) {
        next(err);
    }
}

export async function verifyUserForgotPasswordOTP(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) throw new ValidationError("Email and OTP are required!");

        await verifyOTP(email, otp);
        res.status(200).json({
            message: "OTP verified. You can now reset your password.",
            result: {}
        })
    } catch (err) {
        next(err);
    }
}