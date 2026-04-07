import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { PaymentMode, PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const initiatePaymentSchema = z.object({
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Amount must be a positive number',
    }),
    token: z.string().min(2),
    mode: z.enum(['SIMULATION', 'REAL']).default('SIMULATION'),
    settlementWallet: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {

        const authHeader = req.headers.get("Authorization");

        if (!authHeader) {
            return NextResponse.json({message: "Unauthorized"}, {status: 401});
        }
    
        const token = authHeader.split(" ")[1];

        const merchant = verifyToken(token);
        if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Parse request body
        const parsed = initiatePaymentSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payment payload', details: parsed.error.flatten() }, { status: 400 });
        }
        const { amount, token: paymentToken, mode, settlementWallet } = parsed.data;
        if (!amount || !paymentToken) {
            return NextResponse.json({ error: 'Amount and token are required' }, { status: 400 });
        }

        const merchantRecord = await prisma.merchant.findUnique({
            where: { id: merchant.merchantId },
            select: { id: true, solanaWallet: true },
        });

        if (!merchantRecord) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        const paymentAddress = settlementWallet || merchantRecord.solanaWallet;
        if (!paymentAddress) {
            return NextResponse.json(
                { error: 'Merchant settlement wallet is required before creating a payment intent' },
                { status: 400 }
            );
        }

        try {
            new PublicKey(paymentAddress);
        } catch {
            return NextResponse.json({ error: 'Invalid settlement wallet address' }, { status: 400 });
        }

        const payment = await prisma.payment.create({
            data: {
                merchantId: merchantRecord.id,
                paymentAddress,
                amount,
                token: paymentToken,
                mode: mode === 'REAL' ? PaymentMode.REAL : PaymentMode.SIMULATION,
                status: PaymentStatus.PENDING,
            },
            select: {
                id: true,
                paymentAddress: true,
                status: true,
                mode: true,
            },
        });

        return NextResponse.json(
            {
                paymentId: payment.id,
                paymentAddress: payment.paymentAddress,
                status: payment.status,
                mode: payment.mode,
            },
            { status: 201 });
        
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
