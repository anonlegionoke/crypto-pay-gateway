'use client'

import React, { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { useWalletInfo } from '@/hooks/useWalletInfo';
import { ArrowDownLeft, ArrowUpRight, FileText, ArrowRightLeft } from 'lucide-react';

interface MerchantPayment {
  id: string;
  amount: string;
  quoteAmountUSDC: string | null;
  token: string;
  mode: 'SIMULATION' | 'REAL';
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { balance, usdcBalance, transactions, loading, error, refreshWalletInfo } = useWalletInfo();
  const [payments, setPayments] = useState<MerchantPayment[]>([]);
  const [paymentsNextCursor, setPaymentsNextCursor] = useState<string | null>(null);
  const [paymentsHasMore, setPaymentsHasMore] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const confirmedPayments = payments.filter((payment) => payment.status === 'CONFIRMED').length;
  const pendingPayments = payments.filter((payment) => payment.status === 'PENDING' || payment.status === 'SUBMITTED').length;
  const recordedUsdc = payments.reduce((sum, payment) => {
    if (payment.status !== 'CONFIRMED') return sum;
    return sum + Number(payment.quoteAmountUSDC || 0);
  }, 0);
  const liveSettledUsdc = payments.reduce((sum, payment) => {
    if (payment.status !== 'CONFIRMED' || payment.mode !== 'REAL') return sum;
    return sum + Number(payment.quoteAmountUSDC || 0);
  }, 0);
  const simulatedUsdc = payments.reduce((sum, payment) => {
    if (payment.status !== 'CONFIRMED' || payment.mode !== 'SIMULATION') return sum;
    return sum + Number(payment.quoteAmountUSDC || 0);
  }, 0);
  const gatewayUsdcSummary = liveSettledUsdc > 0 && simulatedUsdc > 0
    ? `Live settled: ${liveSettledUsdc.toFixed(2)} USDC • Simulation: ${simulatedUsdc.toFixed(2)} USDC-equivalent`
    : liveSettledUsdc > 0
      ? `Live settled: ${liveSettledUsdc.toFixed(2)} USDC`
      : simulatedUsdc > 0
        ? `Simulation total: ${simulatedUsdc.toFixed(2)} USDC-equivalent`
        : 'No confirmed settlement recorded yet.';
  // Only display the most recent 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  useEffect(() => {
    const fetchPayments = async (cursor?: string | null, append = false) => {
      const token = localStorage.getItem('token');
      if (!token) {
        setPayments([]);
        setPaymentsNextCursor(null);
        setPaymentsHasMore(false);
        setPaymentsLoading(false);
        return;
      }

      try {
        setPaymentsLoading(true);
        setPaymentsError(null);

        const params = new URLSearchParams({ limit: '100' });
        if (cursor) {
          params.set('cursor', cursor);
        }

        const response = await fetch(`/api/merchant/payments?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('merchantInfo');
          window.dispatchEvent(new Event('auth-changed'));
          setPayments([]);
          setPaymentsNextCursor(null);
          setPaymentsHasMore(false);
          return;
        }

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Failed to load payment intents');
        }
        const nextPayments = data.payments || [];
        setPayments((prev) => (append ? [...prev, ...nextPayments] : nextPayments));
        setPaymentsNextCursor(data.pageInfo?.nextCursor ?? null);
        setPaymentsHasMore(Boolean(data.pageInfo?.hasMore));
      } catch (fetchError) {
        setPaymentsError(fetchError instanceof Error ? fetchError.message : 'Failed to load payment intents');
      } finally {
        setPaymentsLoading(false);
      }
    };

    const syncPayments = () => {
      fetchPayments(null, false);
    };

    syncPayments();

    window.addEventListener('auth-changed', syncPayments);
    window.addEventListener('focus', syncPayments);

    return () => {
      window.removeEventListener('auth-changed', syncPayments);
      window.removeEventListener('focus', syncPayments);
    };
  }, []);

  const loadMorePayments = async () => {
    if (!paymentsNextCursor || paymentsLoading) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    setPaymentsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '100',
        cursor: paymentsNextCursor,
      });

      const response = await fetch(`/api/merchant/payments?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to load more payment intents');
      }

      const nextPayments = data.payments || [];
      setPayments((prev) => [...prev, ...nextPayments]);
      setPaymentsNextCursor(data.pageInfo?.nextCursor ?? null);
      setPaymentsHasMore(Boolean(data.pageInfo?.hasMore));
    } catch (fetchError) {
      setPaymentsError(fetchError instanceof Error ? fetchError.message : 'Failed to load more payment intents');
    } finally {
      setPaymentsLoading(false);
    }
  };

  return (
    <div className="px-4 md:px-8 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 mb-2">Overview</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Create payment links, share them with customers, and monitor settlement across your gateway.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-8xl mx-auto mb-8">
        <div className="p-6 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">
            Wallet <span className="text-emerald-600 font-bold">USDC</span>
          </p>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {usdcBalance !== null ? usdcBalance.toFixed(2) : '0.00'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Live USDC token balance in the connected merchant wallet.</p>
        </div>
        <div className="p-6 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Gateway <span className="text-emerald-600 font-bold">USDC</span></p>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{recordedUsdc.toFixed(2)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{gatewayUsdcSummary}</p>
        </div>
        <div className="p-6 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Confirmed <span className="text-violet-600 font-bold">Payments</span></p>
          <p className="text-3xl font-extrabold text-violet-600 dark:text-violet-400">{confirmedPayments}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Payment intents that have been verified on-chain.</p>
        </div>
        <div className="p-6 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Pending <span className="text-amber-600 font-bold">Intents</span></p>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{pendingPayments}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Checkout links waiting for customer payment or confirmation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 max-w-8xl mx-auto mb-8">
        <button 
          onClick={() => router.push('/dashboard/receive')}
          className="p-8 bg-gradient-to-br from-yellow-500 via-amber-500 to-yellow-600 rounded-3xl shadow-xl hover:shadow-amber-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-white font-bold text-2xl flex flex-col items-center justify-center min-h-[190px] group border border-yellow-500/30 relative overflow-hidden text-center"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <ArrowDownLeft className="w-12 h-12 mb-4 group-hover:-translate-y-2 transition-transform duration-300 drop-shadow-md text-white" />
          <span>Receive Payment</span>
          <span className="text-sm mt-3 text-yellow-50/90 font-medium max-w-2xl">
            Create a payment intent and generate a shareable checkout link your customer can open to pay from their wallet.
          </span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-8xl mx-auto mb-8">
        
        {/* Wallet Activity */}
        <div className="p-8 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl h-96 flex flex-col transition-all hover:shadow-2xl">
          <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-200 flex items-center gap-3">
            <span className="text-blue-500 bg-blue-50 dark:bg-blue-500/10 p-2 rounded-xl"><ArrowRightLeft className="w-5 h-5" /></span> Wallet Activity
          </h2>
          <div className="flex-1 flex flex-col overflow-hidden">
            {loading ? (
              <div className="animate-pulse text-sm flex items-center justify-center h-full text-gray-400">Loading...</div>
            ) : error ? (
              <div className="text-red-500 text-sm flex items-center justify-center h-full">Error: {error}</div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <ArrowRightLeft className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-medium">No transactions found</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <ul className="text-sm space-y-4 w-full overflow-y-auto pr-2 custom-scrollbar flex-1 mb-2">
                  {recentTransactions.map((tx: { signature: string; type: string; amount: number }) => (
                    <li key={tx.signature} className="border-b border-gray-100 dark:border-gray-800/80 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30 p-3 rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/50">
                        <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold min-w-[85px] justify-center tracking-wide ${
                          tx.type === 'send'
                            ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                        }`}>
                          {tx.type === 'send' ? 'OUTGOING' : 'INCOMING'}
                        </span>
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-bold text-gray-900 dark:text-gray-100 text-base">{tx.amount.toFixed(4)} SOL</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">
                            {tx.type === 'send' ? 'Connected wallet activity' : 'Connected wallet receipt'}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push('/dashboard/wallet-activity')}
                  className="w-full mt-2 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400 text-sm font-bold transition-colors"
                >
                  View All Wallet Activity →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Payment Intents */}
        <div className="p-8 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl h-96 flex flex-col transition-all hover:shadow-2xl">
          <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-200 flex items-center gap-3">
            <span className="text-violet-500 bg-violet-50 dark:bg-violet-500/10 p-2 rounded-xl"><FileText className="w-5 h-5" /></span> Payment Intents
          </h2>
          <div className="flex-1 overflow-hidden">
            {paymentsLoading ? (
              <div className="animate-pulse text-sm flex items-center justify-center h-full text-gray-400">Loading...</div>
            ) : paymentsError ? (
              <div className="flex items-center justify-center h-full text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl p-4">
                <p>{paymentsError}</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-medium">No payment intents generated yet</p>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <ul className="text-sm space-y-4 w-full overflow-y-auto pr-2 flex-1 custom-scrollbar mb-2">
                  {payments.slice(0, 5).map((payment) => (
                    <li key={payment.id} className="border-b border-gray-100 dark:border-gray-800/80 pb-4 last:border-0 last:pb-0">
                      <div className={`flex items-center justify-between gap-3 p-3 rounded-xl transition-colors border ${
                        payment.status === 'CONFIRMED'
                          ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20'
                          : payment.status === 'PENDING' || payment.status === 'SUBMITTED'
                            ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'
                            : payment.status === 'FAILED'
                              ? 'bg-red-50/80 border-red-200 dark:bg-red-500/10 dark:border-red-500/20'
                              : 'bg-violet-50/60 border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/20'
                      }`}>
                        <div>
                          <p className="font-mono text-xs text-gray-500 font-medium mb-1">ID: {payment.id.slice(0, 8)}...</p>
                          <p className="font-bold text-gray-900 dark:text-gray-100 text-base">{payment.amount} {payment.token === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'Token'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {payment.quoteAmountUSDC
                              ? payment.mode === 'SIMULATION'
                                ? `USDC-equivalent recorded: ${Number(payment.quoteAmountUSDC).toFixed(2)}`
                                : `Live USDC target: ${Number(payment.quoteAmountUSDC).toFixed(2)}`
                              : 'Awaiting settlement quote'}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-[10px] font-bold uppercase">
                            {payment.mode === 'REAL' ? 'LIVE' : payment.mode}
                          </span>
                          <span className={`text-xs font-bold ${
                            payment.status === 'CONFIRMED' ? 'text-emerald-500' :
                            payment.status === 'PENDING' ? 'text-amber-500' : 
                            payment.status === 'FAILED' ? 'text-red-500' : 'text-gray-500'
                          }`}>{payment.status === 'CONFIRMED' ? (payment.mode === 'SIMULATION' ? 'SIMULATED' : 'SETTLED') : payment.status}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push('/dashboard/intents')}
                  className="w-full mt-2 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 text-violet-600 dark:text-violet-400 text-sm font-bold transition-colors"
                >
                  View All Intents →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
