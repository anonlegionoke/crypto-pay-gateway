'use client'

import React, { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { useWalletInfo } from '@/hooks/useWalletInfo';

interface MerchantPayment {
  id: string;
  amount: string;
  token: string;
  mode: 'SIMULATION' | 'REAL';
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { balance, transactions, loading, error, refreshWalletInfo } = useWalletInfo();
  const [payments, setPayments] = useState<MerchantPayment[]>([]);
  const [paymentsNextCursor, setPaymentsNextCursor] = useState<string | null>(null);
  const [paymentsHasMore, setPaymentsHasMore] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  
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
    <div className="p-6 px-4 md:px-8">
      <header className="flex justify-between items-center mb-8 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">Merchant Dashboard</h1>
        <button 
          onClick={refreshWalletInfo}
          disabled={loading}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium shadow-sm transition-all"
        >
          {loading ? (
            <span className="animate-spin text-amber-500">⟳</span>
          ) : (
            <span className="text-amber-500">⟳</span>
          )} Refresh
        </button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-8xl mx-auto">
        <div className="p-8 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl h-72 flex flex-col transition-all hover:shadow-2xl">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="text-amber-500">💰</span> Balance
          </h2>
          <div className="flex-1 flex items-center justify-center">
            {loading ? (
              <div className="animate-pulse text-2xl text-gray-400 font-light">Loading...</div>
            ) : error ? (
              <div className="text-red-500 text-lg font-medium bg-red-50 dark:bg-red-500/10 p-4 rounded-xl border border-red-200 dark:border-red-500/20">Error: {error}</div>
            ) : balance === null ? (
              <div className="text-gray-500 dark:text-gray-400 text-xl font-light">Please connect wallet</div>
            ) : (
              <div className="text-center">
                <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 drop-shadow-sm">{balance.toFixed(4)} <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">SOL</span></p>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-8 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl h-72 flex flex-col transition-all hover:shadow-2xl">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="text-blue-500">📋</span> Recent Transactions
          </h2>
          <div className="flex-1 flex flex-col overflow-hidden">
            {loading ? (
              <div className="animate-pulse text-sm flex items-center justify-center h-full text-gray-400">Loading...</div>
            ) : error ? (
              <div className="text-red-500 text-sm flex items-center justify-center h-full">Error: {error}</div>
            ) : transactions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
                <p>No transactions yet.</p>
              </div>
            ) : (
              <ul className="text-sm space-y-3 w-full overflow-y-auto pr-2 custom-scrollbar">
                {recentTransactions.map((tx: { signature: string; type: string; amount: number }) => (
                  <li key={tx.signature} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium min-w-[80px] justify-center ${
                        tx.type === 'send'
                          ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                          : 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400'
                      }`}>
                        {tx.type === 'send' ? 'Sent' : 'Received'}
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{tx.amount.toFixed(4)} SOL</span>
                        {tx.type === 'send' && (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Converted to USDC</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="p-8 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl h-72 flex flex-col transition-all hover:shadow-2xl">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="text-violet-500">🧾</span> Payment Intents
          </h2>
          <div className="flex-1 overflow-hidden">
            {paymentsLoading ? (
              <div className="animate-pulse text-sm flex items-center justify-center h-full text-gray-400">Loading...</div>
            ) : paymentsError ? (
              <div className="flex items-center justify-center h-full text-sm text-red-500">
                <p>{paymentsError}</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
                <p>No payment intents yet.</p>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <ul className="text-sm space-y-3 w-full overflow-y-auto pr-2 flex-1">
                  {payments.map((payment) => (
                    <li key={payment.id} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-xs text-gray-500">{payment.id.slice(0, 8)}...</p>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{payment.amount} {payment.token === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'Token'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">{payment.mode}</p>
                          <p className="text-xs text-gray-500">{payment.status}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {paymentsHasMore && (
                  <button
                    onClick={loadMorePayments}
                    disabled={paymentsLoading}
                    className="mt-3 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium"
                  >
                    {paymentsLoading ? 'Loading...' : 'Load More'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={() => router.push('/dashboard/receive')}
          className="p-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-black font-semibold text-xl flex flex-col items-center justify-center h-48 group border border-amber-300/50"
        >
          <span className="text-4xl mb-3 group-hover:-translate-y-1 transition-transform duration-300">📥</span>
          Receive Payment
          <span className="text-sm mt-3 text-amber-900 font-medium opacity-80">Scan QR code or copy wallet address</span>
        </button>

        <button 
          onClick={() => router.push('/dashboard/pay')}
          className="p-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-white font-semibold text-xl flex flex-col items-center justify-center h-48 group border border-blue-400/50"
        >
          <span className="text-4xl mb-3 group-hover:-translate-y-1 transition-transform duration-300">📤</span>
          Make Payment
          <span className="text-sm mt-3 text-blue-100 font-medium opacity-80">Send USDC to merchant</span>
        </button>
      </div>
    </div>
  );
}
