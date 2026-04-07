import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const merchant = verifyToken(token);

  if (!merchant) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  const payments = await prisma.payment.findMany({
    where: { merchantId: merchant.merchantId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      amount: true,
      token: true,
      mode: true,
      status: true,
      paymentAddress: true,
      fromWallet: true,
      signature: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    payments: payments.map((payment) => ({
      ...payment,
      amount: payment.amount.toString(),
      quoteAmountUSDC: undefined,
    })),
  });
}
