import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { PaymentStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/error-handler';
import { validateRequest } from '@/middleware/validation';
import { verifyPaymentOnChain } from '@/lib/payment-verification';

const confirmPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  fromWallet: z.string().min(32).max(44),
  signature: z.string().min(32),
  status: z.enum(['SUBMITTED', 'CONFIRMED', 'FAILED']).default('SUBMITTED'),
  quoteAmountUSDC: z.string().optional(),
  verifyOnChain: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, confirmPaymentSchema);
  if (validation.response) return validation.response;

  const body = validation.data!;

  try {
    new PublicKey(body.fromWallet);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid payer wallet address', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  try {
    const payment = await prisma.payment.update({
      where: { id: body.paymentId },
      data: {
        fromWallet: body.fromWallet,
        signature: body.signature,
        status: body.status as PaymentStatus,
        ...(body.quoteAmountUSDC ? { quoteAmountUSDC: body.quoteAmountUSDC } : {}),
      },
      select: {
        id: true,
        status: true,
        signature: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!body.verifyOnChain) {
      return NextResponse.json({ success: true, payment, verification: null });
    }

    const storedPayment = await prisma.payment.findUnique({
      where: { id: body.paymentId },
      select: {
        id: true,
        paymentAddress: true,
        fromWallet: true,
        signature: true,
      },
    });
    if (!storedPayment || !storedPayment.signature) {
      return NextResponse.json(
        { success: false, error: 'Payment could not be reloaded for verification', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const verification = await verifyPaymentOnChain({
      signature: storedPayment.signature,
      paymentAddress: storedPayment.paymentAddress,
      fromWallet: storedPayment.fromWallet,
    });

    const verifiedPayment = await prisma.payment.update({
      where: { id: body.paymentId },
      data: {
        status: verification.status as PaymentStatus,
      },
      select: {
        id: true,
        status: true,
        signature: true,
      },
    });

    return NextResponse.json({
      success: true,
      payment: verifiedPayment,
      verification,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { success: false, error: 'Payment not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
