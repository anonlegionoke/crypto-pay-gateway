'use client'

import React, { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, AlertTriangle, FileText, Copy } from 'lucide-react';

interface MerchantPayment {
  id: string;
  amount: string;
  token: string;
  mode: 'SIMULATION' | 'REAL';
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
  createdAt: string;
}

export default function IntentsPage() {
    const router = useRouter();
    const [payments, setPayments] = useState<MerchantPayment[]>([]);
    const [paymentsNextCursor, setPaymentsNextCursor] = useState<string | null>(null);
    const [paymentsHasMore, setPaymentsHasMore] = useState(false);
    const [paymentsLoading, setPaymentsLoading] = useState(true);
    const [paymentsError, setPaymentsError] = useState<string | null>(null);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Intent ID copied to clipboard!');
    };

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

            const params = new URLSearchParams({ limit: '50' });
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

    useEffect(() => {
        fetchPayments(null, false);
    }, []);

    const loadMorePayments = () => {
        if (!paymentsNextCursor || paymentsLoading) return;
        fetchPayments(paymentsNextCursor, true);
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl">
            <div className="flex items-center justify-between mb-8 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center">
                    <button 
                        onClick={() => router.back()}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors mr-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 flex items-center gap-3">
                        <FileText className="w-6 h-6 text-violet-500" /> Payment Intents
                    </h1>
                </div>
                <button 
                    onClick={() => fetchPayments(null, false)}
                    disabled={paymentsLoading}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium shadow-sm transition-all text-violet-600 dark:text-violet-400"
                >
                    <RefreshCw className={`w-4 h-4 ${paymentsLoading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 p-2 sm:p-6 rounded-3xl shadow-xl min-h-[500px]">
                <div className="flex flex-col">
                    {paymentsLoading && payments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <div className="w-8 h-8 border-4 border-violet-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                            Loading intents...
                        </div>
                    ) : paymentsError && payments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-2xl p-8 m-4">
                            <AlertTriangle className="w-12 h-12 mb-4" />
                            <p className="font-medium text-lg">Error loading intents</p>
                            <p className="text-sm mt-2 opacity-80">{paymentsError}</p>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                            <FileText className="w-16 h-16 mb-6 opacity-40" />
                            <p className="font-semibold text-lg">No payment intents found</p>
                            <p className="text-sm mt-2 opacity-80">This merchant has not received or generated any intents yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-sm tracking-wider uppercase">
                                        <th className="p-4 font-semibold">Status</th>
                                        <th className="p-4 font-semibold">Mode</th>
                                        <th className="p-4 font-semibold">Amount</th>
                                        <th className="p-4 font-semibold">Date</th>
                                        <th className="p-4 font-semibold">Intent ID</th>
                                        <th className="p-4 font-semibold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((payment) => (
                                        <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                                            <td className="p-4">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                                                        payment.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                        payment.status === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 
                                                        payment.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 
                                                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {payment.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 ${payment.mode === 'REAL' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'} rounded text-[10px] font-bold uppercase`}>
                                                    {payment.mode === 'REAL' ? 'LIVE' : payment.mode}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-mono font-bold text-gray-900 dark:text-gray-100 text-base">{payment.amount}</span>
                                                <span className="text-gray-500 dark:text-gray-400 text-sm ml-1 font-bold">
                                                    {payment.token === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'Token'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {new Date(payment.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">
                                                        {new Date(payment.createdAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono text-sm text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    {payment.id.slice(0, 16)}...{payment.id.slice(-8)}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleCopy(payment.id)}
                                                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold transition-colors flex items-center gap-2"
                                                >
                                                    <Copy className="w-4 h-4" /> Copy ID
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {paymentsHasMore && (
                                <div className="mt-6 flex justify-center pb-4">
                                    <button
                                        onClick={loadMorePayments}
                                        disabled={paymentsLoading}
                                        className="px-8 py-3 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 text-violet-700 dark:text-violet-400 font-bold transition-colors border border-violet-200 dark:border-violet-800/50"
                                    >
                                        {paymentsLoading ? 'Loading more...' : 'Load More Intents'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
