'use client'

import React from "react";
import { useRouter } from 'next/navigation';
import { useWalletInfo } from '@/hooks/useWalletInfo';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, AlertTriangle, ArrowRightLeft, Copy } from 'lucide-react';

export default function TransactionsPage() {
    const router = useRouter();
    const { transactions, loading, error, refreshWalletInfo } = useWalletInfo();

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Signature copied to clipboard!');
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
                        <ArrowRightLeft className="w-6 h-6 text-blue-500" /> Wallet Activity
                    </h1>
                </div>
                <button 
                    onClick={refreshWalletInfo}
                    disabled={loading}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium shadow-sm transition-all text-amber-600 dark:text-amber-400"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 p-2 sm:p-6 rounded-3xl shadow-xl min-h-[500px]">
                <div className="flex flex-col">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                            Loading transactions...
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-2xl p-8 m-4">
                            <AlertTriangle className="w-12 h-12 mb-4" />
                            <p className="font-medium text-lg">Error loading transactions</p>
                            <p className="text-sm mt-2 opacity-80">{error}</p>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                            <ArrowRightLeft className="w-16 h-16 mb-6 opacity-40" />
                            <p className="font-semibold text-lg">No transactions found</p>
                            <p className="text-sm mt-2 opacity-80">Connected wallet has no recent activity.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-sm tracking-wider uppercase">
                                        <th className="p-4 font-semibold">Type</th>
                                        <th className="p-4 font-semibold">Amount</th>
                                        <th className="p-4 font-semibold">Date</th>
                                        <th className="p-4 font-semibold">Signature</th>
                                        <th className="p-4 font-semibold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((tx: { signature: string; type: string; amount: number; timestamp: number }) => (
                                        <tr key={tx.signature} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                                            <td className="p-4">
                                                <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold min-w-[85px] justify-center tracking-wide ${
                                                    tx.type === 'send'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                                }`}>
                                                    {tx.type === 'send' ? 'OUTGOING' : 'INCOMING'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-mono font-bold text-gray-900 dark:text-gray-100 text-base">{tx.amount.toFixed(4)} SOL</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">
                                                        {tx.type === 'send' ? 'Connected wallet activity' : 'Connected wallet receipt'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">
                                                        {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleTimeString() : ''}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono text-sm text-gray-500 dark:text-gray-400">
                                                {tx.signature.slice(0, 16)}...{tx.signature.slice(-16)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    onClick={() => handleCopy(tx.signature)}
                                                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold transition-colors flex items-center justify-center ml-auto gap-2"
                                                >
                                                    <Copy className="w-4 h-4" /> Copy
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
