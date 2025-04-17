'use client'

import React from "react";
import { useRouter } from 'next/navigation';
import { useWalletInfo } from '@/hooks/useWalletInfo';

export default function Dashboard() {
  const router = useRouter();
  const { balance, transactions, loading, error, refreshWalletInfo } = useWalletInfo();
  
  // Only display the most recent 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 px-11">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Merchant Dashboard</h1>
        <button 
          onClick={refreshWalletInfo}
          disabled={loading}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
        >
          {loading ? (
            <span className="animate-spin">⟳</span>
          ) : (
            <span>⟳</span>
          )} Refresh
        </button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-8xl mx-auto">
        <div className="p-6 bg-gray-800 rounded-xl shadow-lg h-72 flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Balance</h2>
          <div className="flex-1 flex items-center justify-center">
            {loading ? (
              <div className="animate-pulse text-2xl">Loading...</div>
            ) : error ? (
              <div className="text-red-400 text-2xl">Error: {error}</div>
            ) : balance === null ? (
              <div className="text-gray-400 text-2xl">Please connect wallet</div>
            ) : (
              <p className="text-4xl font-bold">{balance.toFixed(4)} SOL</p>
            )}
          </div>
        </div>
        
        <div className="p-6 bg-gray-800 rounded-xl shadow-lg h-72 flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
          <div className="flex-1 flex flex-col">
            {loading ? (
              <div className="animate-pulse text-sm flex items-center justify-center h-full">Loading...</div>
            ) : error ? (
              <div className="text-red-400 text-sm flex items-center justify-center h-full">Error: {error}</div>
            ) : transactions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm">
                <p>No transactions yet.</p>
              </div>
            ) : (
              <ul className="text-sm space-y-2 w-full">
                {recentTransactions.map((tx: { signature: string; type: string; amount: number }) => (
                  <li key={tx.signature}>
                    <div className="flex justify-between items-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs min-w-[80px] text-center ${
                        tx.type === 'send'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {tx.type === 'send' ? 'Sent' : 'Received'}
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="font-mono">{tx.amount.toFixed(4)} SOL</span>
                        {tx.type === 'send' && (
                          <span className="text-xs text-green-400">Converted to USDC</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <button 
          onClick={() => router.push('/dashboard/receive')}
          className="p-6 bg-gradient-to-r from-amber-500 to-amber-700 rounded-xl shadow-lg hover:from-amber-600 hover:to-amber-800 transition-all duration-200 text-black font-semibold text-lg flex flex-col items-center justify-center h-48"
        >
          <span className="text-2xl mb-2">📥</span>
          Receive Payment
          <span className="text-sm mt-2 text-amber-900">Scan QR code or copy wallet address</span>
        </button>

        <button 
          onClick={() => router.push('/dashboard/pay')}
          className="p-6 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-800 transition-all duration-200 text-white font-semibold text-lg flex flex-col items-center justify-center h-48"
        >
          <span className="text-2xl mb-2">📤</span>
          Make Payment
          <span className="text-sm mt-2 text-blue-200">Send USDC to merchant</span>
        </button>
      </div>
    </div>
  );
}
