import { verifyToken } from "@/lib/auth"
import { NextResponse } from "next/server"
import { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
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
            const authHeader = req.headers.get("Authorization")

            if (!authHeader) {
                return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
            }

            const token = authHeader.split(" ")[1]
            if (!verifyToken(token)) {
                return NextResponse.json({ message: "Invalid token" }, { status: 401 })
            }
        } else if (isDashboard) {
            // For dashboard routes, check localStorage token via client-side
            return NextResponse.next();
        }
    }
    
    return NextResponse.next();
}