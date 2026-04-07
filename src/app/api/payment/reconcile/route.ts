import { NextRequest, NextResponse } from 'next/server';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/middleware/validation';
import { z } from 'zod';
import { handleApiError } from '@/lib/error-handler';
import { verifyPaymentOnChain } from '@/lib/payment-verification';

const reconcilePaymentSchema = z.object({
  paymentId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, reconcilePaymentSchema);
  if (validation.response) return validation.response;

  const { paymentId } = validation.data!;

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        paymentAddress: true,
        fromWallet: true,
        signature: true,
        status: true,
      },
    });
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!payment.signature) {
      return NextResponse.json({
        success: true,
        payment,
        verification: {
          verified: false,
          status: payment.status,
          reason: 'Payment has no signature yet',
        },
      });
    }

    const verification = await verifyPaymentOnChain({
      signature: payment.signature,
      paymentAddress: payment.paymentAddress,
      fromWallet: payment.fromWallet,
    });

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
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
      payment: updatedPayment,
      verification,
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
