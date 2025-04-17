import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function POST(request: Request) {
   try {
     const { email, password } = await request.json();
 
     if (!email || !password) {
         return NextResponse.json({message: "All fields are required"});
     }
 
     const merchant = await prisma.merchant.findUnique({
         where: {
             email
         }
     })
 
     if (!merchant) {
         return NextResponse.json({message: "Merchant not found"}, {status: 400});
     }
 
     const validPassword = await bcrypt.compare(password, merchant.passwordHash);
 
     if (!validPassword) {
         return NextResponse.json({message: "Incorrect password"}, {status: 401});
     }
 
     const token = jwt.sign({ merchant: merchant.id }, process.env.JWT_SECRET!, { expiresIn: "1h" });
     
     return NextResponse.json({token, merchant});
   } catch (error) {
     return NextResponse.json({message: "Something went wrong"}, {status: 500});
   }
}