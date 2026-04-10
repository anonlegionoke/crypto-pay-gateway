'use client'

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { PaymentCheckout } from '@/components/PaymentCheckout';
import { WalletButton } from '@/components/WalletButton';

interface PaymentRecord {
  id: string;
  amount: string;
  token: string;
  mode: 'SIMULATION' | 'REAL';
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
  paymentAddress: string;
  merchantWallet: string | null;
}

export default function PublicPaymentPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const [paymentId, setPaymentId] = useState('');
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadPayment = async () => {
      const resolved = await params;
      if (!active) return;
      setPaymentId(resolved.paymentId);

      try {
        const response = await fetch(`/api/payment/${resolved.paymentId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Payment checkout not found');
        }

        if (!active) return;
        setPayment(data.payment);
      } catch (fetchError) {
        if (!active) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load checkout');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPayment();
    return () => {
      active = false;
    };
  }, [params]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400"></div></div>;
  }

  if (error || !payment) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-lg w-full bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 p-8 rounded-3xl shadow-xl text-center">
          <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Checkout unavailable</h1>
          <p className="text-gray-600 dark:text-gray-400">{error || 'Payment intent was not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0A0A0A] text-foreground py-16 relative">
      <nav className="absolute top-0 w-full p-4 sm:p-6 flex justify-between items-center z-50">
        <div className="flex items-center pl-4 sm:pl-8">
          <Image src="/logo.png" alt="Crypto Gate Logo" width={32} height={32} className="mr-3 drop-shadow-md rounded-md" />
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-600">Crypto Gate</span>
        </div>
        <div className="pr-4 sm:pr-8">
          <WalletButton />
        </div>
      </nav>

      <div className="container mx-auto px-4 max-w-6xl mt-8">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 font-semibold">Public Checkout</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold mt-3 text-gray-900 dark:text-white">Pay The Merchant</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-3 text-sm sm:text-base">
            {payment.mode === 'REAL'
              ? 'Connect your wallet, review the checkout details, and let Jupiter route the payment into merchant USDC settlement.'
              : 'Connect your wallet, review the checkout details, and complete the simulation checkout with an on-chain SOL transfer plus gateway USDC-equivalent settlement.'}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch max-w-5xl mx-auto">
          <div className="w-full flex">
            <PaymentCheckout
              heading=""
              paymentId={paymentId}
              initialRecipient={payment.paymentAddress}
              initialAmount={payment.amount}
              initialMode={payment.mode}
              initialTokenMint={payment.token}
              lockIntentFields={true}
              allowScanner={false}
              className="w-full h-full flex flex-col"
            />
          </div>
          <aside className="bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 p-8 rounded-3xl shadow-xl flex flex-col justify-center h-full space-y-5">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Checkout Summary</h2>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-800/80 transition-colors hover:border-amber-400/50">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1 font-semibold">Payment ID</p>
              <p className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all">{payment.id}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-800/80 transition-colors hover:border-amber-400/50">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 font-semibold">Settlement Mode</p>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${
                  payment.mode === 'REAL'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                }`}
              >
                {payment.mode === 'REAL' ? 'Live Settlement' : 'Simulation Settlement'}
              </span>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-800/80 transition-colors hover:border-amber-400/50">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1 font-semibold">Merchant Wallet</p>
              <p className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all">{payment.merchantWallet || 'Not available'}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-800/80 transition-colors hover:border-amber-400/50">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1 font-semibold">Settlement Flow</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {payment.mode === 'REAL'
                  ? 'Jupiter routes the payment and settles USDC into the merchant wallet.'
                  : 'Simulation mode transfers SOL on-chain and records USDC-equivalent settlement in the gateway.'}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-800/10 transition-colors hover:border-amber-400/50">
              <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-500 mb-1 font-bold">Requested Amount</p>
              <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300">{payment.amount} {payment.token === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'Token'}</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
