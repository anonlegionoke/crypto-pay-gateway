import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { NextRequest } from 'next/server';
import { securityMiddleware } from "./src/middleware/security";

export async function middleware(req: NextRequest) {
    // Apply shared security middleware to all matched routes.
    const securityResponse = await securityMiddleware(req);
    if (securityResponse.status !== 200) {
        return securityResponse;
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    // Only protect dashboard routes and merchant API routes
    const protectedRoutes = [
        "/api/merchant/profile",
        "/api/merchant/payments"
    ];

    const isDashboard = req.nextUrl.pathname.startsWith('/dashboard');
    const isProtectedApi = protectedRoutes.some(route => 
        req.nextUrl.pathname.startsWith(route)
    );

    // Check if it's a protected route
    if (isProtectedApi || isDashboard) {
        // For API routes, check Authorization header
        if (req.nextUrl.pathname.startsWith('/api/')) {
            const authHeader = req.headers.get("Authorization");

            if (!authHeader) {
                return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
            }

            const token = authHeader.split(" ")[1];
            if (!verifyToken(token)) {
                return NextResponse.json({ message: "Invalid token" }, { status: 401 });
            }
        } else if (isDashboard) {
            // For dashboard routes, check localStorage token via client-side
            return NextResponse.next();
        }
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
