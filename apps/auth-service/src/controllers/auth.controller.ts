import { NextFunction, Request, Response } from "express";
import { checkOTPRestrictions, handleForgotPasswordProcess, sendOTP, trackOTPRequests, validateRegistrationData, verifyOTP, verifyUserForgotPasswordOTP } from "../utils/auth.helper";
import { AuthError, ValidationError } from "@packages/error-handler";
import { generateToken } from "../libs/jwt";
import setCookie from "../utils/cookies/setCookie";
import { hashPassword, comparePassword } from "../libs/bcrypt";
import { createUser, findUserByEmail, updateUser } from "../dal/users";


export async function userRegistration(req: Request, res: Response, next: NextFunction) {
    try {
        const { name, email, password } = req.body;
        validateRegistrationData(req.body, "user");
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return next(new ValidationError("User already exists with this email!"));
        }
        await checkOTPRestrictions(email);
        await trackOTPRequests(email);
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

        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return next(new ValidationError("User already exists with this email!"));
        }
        await verifyOTP(email, otp);
        const hashedPassword = await hashPassword(password);
        await createUser({ name, email, password: hashedPassword })

        res.status(201).json({
            message: "User registered successfully!",
            result: {}
        })
    } catch (err) {
        return next(err);
    }
}

export async function loginUser(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new ValidationError("Email and password are required!"));
        }

        const user = await findUserByEmail(email);
        if (!user) return next(new AuthError("User doesn't exists!"));

        const isMatchedPassword = await comparePassword(password, user.password!);
        if (!isMatchedPassword) {
            return next(new AuthError("Invalid email or password!"))
        }

        const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || "hshopisthebest"
        const accessToken = generateToken({ id: user.id, role: "user" }, accessTokenSecret, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" })

        const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || "hshopisthebestrefresh"
        const refreshToken = generateToken({ id: user.id, role: "user" }, refreshTokenSecret, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" })

        // Store the refresh and access tokens in an httpOnly secure cookie 
        setCookie(res, "access_token", accessToken);
        setCookie(res, "refresh_token", refreshToken);

        res.status(200).json({
            message: "User login successfully!",
            result: {
                user: { id: user.id, name: user.name, email: user.email }
            }
        })

    } catch (err) {
        return next(err);
    }
}

export async function userForgotPassword(req: Request, res: Response, next: NextFunction) {
    await handleForgotPasswordProcess(req, res, "user", next);
}

export async function verifyUserForgotPassword(req: Request, res: Response, next: NextFunction) {
    await verifyUserForgotPasswordOTP(req,res,next);
}

export async function resetUserPassword(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) return next(new ValidationError("Email and new password is required!"));

        const user = await findUserByEmail(email);
        if (!user) return next(new ValidationError("User not found!"));

        const hasSamePassword = await comparePassword(newPassword, user.password!)
        if (hasSamePassword) return next(new ValidationError("New password cannot be the same as the old password!."))
        const hashedPassword = await hashPassword(newPassword);

        const updatedUser = await updateUser("email", email, { password: hashedPassword })

        res.status(200).json({
            message: "Password reset successfully!",
            result: {
                user: {id: updatedUser.id, name: updatedUser.name, email: updatedUser.email}
            }
        })

    } catch (err) {

    }
}