import { NextRequest, NextResponse } from 'next/server';
import { Keypair, PublicKey } from '@solana/web3.js';
import { prisma } from '@/lib/prisma'; 
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {

        const authHeader = req.headers.get("Authorization");

        if (!authHeader) {
            return NextResponse.json({message: "Unauthorized"}, {status: 401});
        }
    
        const token = authHeader.split(" ")[1];

        const merchant = await verifyToken(token);
        if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Parse request body
        const { amount } = await req.json();
        if (!amount || !token) {
            return NextResponse.json({ error: 'Amount and token are required' }, { status: 400 });
        }

        // Generate a unique Solana address for payment
        const paymentKeypair = Keypair.generate();
        const paymentAddress = paymentKeypair.publicKey.toBase58();

        // Store the payment in the database
        const payment = await prisma.payment.create({
            data: {
                merchantId: merchant.id,
                fromWallet: paymentAddress, // This is where the customer will send funds
                amount,
                token,
                status: 'PENDING',
            },
        });

        return NextResponse.json({ paymentId: payment.id, paymentAddress }, { status: 201 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
