'use client'

import { useSearchParams } from 'next/navigation';
import { PaymentCheckout } from '@/components/PaymentCheckout';

export default function PayPage() {
  const searchParams = useSearchParams();

  return (
    <PaymentCheckout
      heading="Payer Demo"
      paymentId={searchParams.get('paymentId') || ''}
      initialRecipient={searchParams.get('recipient') || ''}
      initialAmount={searchParams.get('amount') || ''}
      initialMode={searchParams.get('mode') === 'REAL' ? 'REAL' : 'SIMULATION'}
      initialTokenMint={searchParams.get('tokenMint') || 'So11111111111111111111111111111111111111112'}
      lockIntentFields={Boolean(searchParams.get('paymentId'))}
      allowScanner={!Boolean(searchParams.get('paymentId'))}
      backHref="/dashboard"
    />
  );
}
