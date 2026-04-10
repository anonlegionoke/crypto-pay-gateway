import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{
    paymentId: string;
  }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { paymentId } = await context.params;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      amount: true,
      token: true,
      mode: true,
      status: true,
      paymentAddress: true,
      signature: true,
      createdAt: true,
      updatedAt: true,
      Merchant: {
        select: {
          solanaWallet: true,
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json(
      { success: false, error: 'Payment not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  const { Merchant, ...paymentRecord } = payment;

  return NextResponse.json({
    success: true,
    payment: {
      ...paymentRecord,
      amount: paymentRecord.amount.toString(),
      merchantWallet: Merchant?.solanaWallet ?? null,
    },
  });
}
