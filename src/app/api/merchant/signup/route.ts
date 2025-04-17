import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: Request) {
   try {
       const { email, password, name, solanaWallet } = await request.json();
       
     if (!email || !password || !name) {
         return NextResponse.json({message: "Email, password and name are required"});
     }
       
     const existingMerchant = await prisma.merchant.findUnique({
         where: {
             email
         }
     })
       
    if (existingMerchant) {
         return NextResponse.json({message: "Merchant already exists"}, {status: 400});
     }
 
     const saltRounds = 10;
     const passwordHash = await bcrypt.hash(password, saltRounds);
     
     const merchant = await prisma.merchant.create({
         data: {
             email,
             passwordHash,
             name,
             ...(solanaWallet && { solanaWallet })
         }
     })
 
     return NextResponse.json({message: "Merchant registration successful", merchant, status: 201});
   } catch (error) {
     return NextResponse.json({message: "Merchant registration failed", error, status: 500});
   }
}