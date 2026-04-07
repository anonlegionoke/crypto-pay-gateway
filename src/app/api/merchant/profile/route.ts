import { verifyToken } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {

    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
        return NextResponse.json({message: "Unauthorized"}, {status: 401});
    }

    const token = authHeader.split(" ")[1];

    const decoded = verifyToken(token);

    if (!decoded) {
        return NextResponse.json({message: "Invalid token"}, {status: 401});
    }

    const merchant = await prisma.merchant.findUnique({
        where:{
            id: decoded.merchantId}
    })

    if (!merchant) { 
        return NextResponse.json({ message: "Merchant not found" }, { status: 404 });
    }

    const safeMerchant = {
      id: merchant.id,
      email: merchant.email,
      name: merchant.name,
      solanaWallet: merchant.solanaWallet,
      createdAt: merchant.createdAt,
    };

    return NextResponse.json({merchant: safeMerchant});
}
