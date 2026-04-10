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

  const searchParams = request.nextUrl.searchParams;
  const requestedLimit = Number(searchParams.get('limit') || '100');
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(200, requestedLimit))
    : 100;
  const cursor = searchParams.get('cursor');

  const payments = await prisma.payment.findMany({
    where: { merchantId: merchant.merchantId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true,
      amount: true,
      quoteAmountUSDC: true,
      token: true,
      mode: true,
      status: true,
      paymentAddress: true,
      fromWallet: true,
      signature: true,
      createdAt: true,
    },
  });

  const hasMore = payments.length > limit;
  const pagePayments = hasMore ? payments.slice(0, limit) : payments;

  return NextResponse.json({
    payments: pagePayments.map((payment) => ({
      ...payment,
      amount: payment.amount.toString(),
      quoteAmountUSDC: payment.quoteAmountUSDC?.toString() ?? null,
    })),
    pageInfo: {
      hasMore,
      nextCursor: hasMore ? pagePayments[pagePayments.length - 1]?.id ?? null : null,
      limit,
    },
  });
}
