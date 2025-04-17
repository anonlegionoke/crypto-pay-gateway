/* Verify JWT tokens in API routes helper function */
import jwt, { JwtPayload } from "jsonwebtoken";

export function verifyToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    } catch (error) {
        return null;
    }
}