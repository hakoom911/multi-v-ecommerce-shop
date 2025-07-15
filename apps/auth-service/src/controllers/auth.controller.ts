import { NextFunction, Request, Response } from "express";
import { checkOTPRestrictions, sendOTP, trackOTPRequests, validateRegistrationData, verifyOTP } from "../utils/auth.helper";
import { prisma } from "@packages/libs/prisma";
import { ValidationError } from "@packages/error-handler";
import { hash } from "bcryptjs";


export async function userRegistration(req: Request, res: Response, next: NextFunction) {
    try {
        const {name, email, password} = req.body;
        validateRegistrationData(req.body, "user");
        const existingUser = await prisma.users.findUnique({ where: { email } });
        if (existingUser) {
            return next(new ValidationError("User already exists with this email!"));
        }
        await checkOTPRestrictions(email, next);
        await trackOTPRequests(email, next);
        await sendOTP(name, email, "user-activation-mail");

        res.status(200).json({
            message: "OTP sent to email. Please verify your account.",
            result: {}
        })
    } catch (err) {
        return next(err)
    }
}

export async function verifyUser(req: Request, res: Response, next: NextFunction) {
    try {
        const { name, email, otp, password } = req.body;
        if (!email || !otp || !password || !name) {
            return next(new ValidationError("All fields are required!"));
        }

        const existingUser = await prisma.users.findUnique({ where: { email } });
        if (existingUser) {
            return next(new ValidationError("User already exists with this email!"));
        }
        await verifyOTP(email, otp, next);
        const hashedPassword = await hash(password, 10);

        await prisma.users.create({
            data: { name, email, password: hashedPassword }
        })
        res.status(201).json({
            message: "User registered successfully!",
            result: {}
        })
    } catch (err) {
        return next(err);
    }
}