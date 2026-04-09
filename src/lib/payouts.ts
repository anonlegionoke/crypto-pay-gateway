import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';

function derivePayoutAmountUSDC(payment: {
  amount: { toString(): string };
  token: string;
  quoteAmountUSDC: { toString(): string } | null;
}) {
  if (payment.quoteAmountUSDC) {
    return payment.quoteAmountUSDC.toString();
  }

  const usdcMint = config.tokenAddresses.USDC[config.network];
  if (payment.token === usdcMint) {
    return payment.amount.toString();
  }

  return null;
}

export async function ensurePayoutForConfirmedPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      payouts: true,
    },
  });

  if (!payment || payment.status !== 'CONFIRMED') {
    return null;
  }

  if (payment.payouts.length > 0) {
    return payment.payouts[0];
  }

  const amountUSDC = derivePayoutAmountUSDC(payment);
  if (!amountUSDC) {
    return null;
  }

  return prisma.payout.create({
    data: {
      merchantId: payment.merchantId,
      paymentId: payment.id,
      amountUSDC,
      toWallet: payment.paymentAddress,
      status: 'SETTLED',
    },
  });
}
