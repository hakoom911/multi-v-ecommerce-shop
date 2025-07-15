import bcrypt from "bcryptjs";

const PASSWORD_SALT = 10;

export async function hashPassword(password: string) {
    return await bcrypt.hash(password, PASSWORD_SALT)
}

export async function comparePassword(password: string, hashedPassword: string) {
    return await bcrypt.compare(password, hashedPassword);
}