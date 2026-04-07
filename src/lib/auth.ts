/* Verify JWT tokens in API routes helper function */
import jwt, { JwtPayload } from "jsonwebtoken";

export interface MerchantTokenPayload extends JwtPayload {
    merchantId: string;
}

export function verifyToken(token: string): MerchantTokenPayload | null {
    try {
        return jwt.verify(token, process.env.JWT_SECRET!) as MerchantTokenPayload;
    } catch (error) {
        return null;
    }
}
