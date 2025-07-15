import jwt from "jsonwebtoken";
type TSignOptions = {
    expiresIn?: string
}
export function generateToken(payload: string | Buffer | object, secret: string, signOptions: TSignOptions): string {
    try {
        const options = { ...signOptions } as any;
        const token = jwt.sign(payload, secret, options);
        return token;
    } catch (err) {
        throw new Error("Error while generating token with jwt")
    }
}