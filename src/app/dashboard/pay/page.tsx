'use client'

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { QrScanner } from '@/components/QrScanner';
import { useJupiter } from '@/hooks/useJupiter';
import { useTransaction } from '@/hooks/useTransaction';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'react-hot-toast';

// Common tokens (using mainnet addresses for price discovery)
const TOKENS = [
    { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112' },
    { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    { symbol: 'BONK', name: 'Bonk', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
    { symbol: 'JUP', name: 'Jupiter', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
    { symbol: 'RAY', name: 'Raydium', mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
    { symbol: 'MNGO', name: 'Mango', mint: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac' },
    { symbol: 'JSOL', name: 'Jupiter Staked SOL', mint: '7Q2afV64in6N6SeZsAAB181TxT9uK7ve6s1xXYquJ9NN' },
    { symbol: 'ORCA', name: 'Orca', mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE' },
];

export default function PayPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { publicKey, connected } = useWallet();
    const { getPrice, loading: jupiterLoading, priceLoading, error: jupiterError } = useJupiter();
    const { executePayment, loading: transactionLoading, error: transactionError } = useTransaction();

    const paymentId = searchParams.get('paymentId') || '';
    const presetRecipient = searchParams.get('recipient') || '';
    const presetAmount = searchParams.get('amount') || '';
    const presetMode = searchParams.get('mode') === 'REAL' ? 'REAL' : 'SIMULATION';
    const presetTokenMint = searchParams.get('tokenMint') || TOKENS[0].mint;

    const [selectedToken, setSelectedToken] = useState(TOKENS.find((token) => token.mint === presetTokenMint) || TOKENS[0]);
    const [recipientAddress, setRecipientAddress] = useState(presetRecipient);
    const [amount, setAmount] = useState(presetAmount);
    const [executionMode, setExecutionMode] = useState<'SIMULATION' | 'REAL'>(presetMode);
    const [usdcEquivalent, setUsdcEquivalent] = useState<number | null>(null);
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        const updateUsdcEquivalent = async () => {
            if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
                // Always update when amount or selected token changes, regardless of timer
                try {
                    const price = await getPrice(new PublicKey(selectedToken.mint), Number(amount));
                    if (price) {
                        setUsdcEquivalent(price.outAmount);
                    } else {
                        setUsdcEquivalent(null);
                    }
                } catch (err) {
                    console.error('Error getting price:', err);
                    setUsdcEquivalent(null);
                }
            } else {
                setUsdcEquivalent(null);
            }
        };

        const debounceTimeout = setTimeout(() => {
            updateUsdcEquivalent();
        }, 500); // Debounce for typing

        return () => clearTimeout(debounceTimeout);
    }, [amount, selectedToken, getPrice]);

    const handleScanSuccess = (address: string) => {
        setRecipientAddress(address);
        setShowScanner(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!connected) {
            toast.error('Please connect your wallet first');
            return;
        }

        if (!amount || !recipientAddress) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            // 1. Get the latest quote
            const quote = await getPrice(new PublicKey(selectedToken.mint), Number(amount));
            if (!quote) {
                throw new Error('Failed to get price quote');
            }

            // 2. Execute the payment
            const result = await executePayment(quote.quoteResponse, recipientAddress, paymentId || undefined, executionMode);
            
            if (result.confirmed) {
                if (paymentId) {
                    await fetch('/api/payment/confirm', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            paymentId,
                            fromWallet: publicKey!.toString(),
                            signature: result.signature,
                            status: 'CONFIRMED',
                            quoteAmountUSDC: usdcEquivalent?.toString(),
                        }),
                    });
                }

                if (result.mode === 'simulated') {
                    toast.success(`Simulated transfer of ${amount} ${selectedToken.symbol} sent.`);
                } else {
                    toast.success(`Payment of ${amount} ${selectedToken.symbol} sent and converted to USDC!`);
                }
                // Clear form
                setAmount('');
                setRecipientAddress('');
                setUsdcEquivalent(null);
            } else {
                throw new Error('Transaction failed');
            }
        } catch (err) {
            console.error('Payment error:', err);
            toast.error(err instanceof Error ? err.message : 'Payment failed');
        }
    };

    if (!publicKey) {
        return (
            <div className="container mx-auto p-4">
                <div className="bg-gray-900 p-6 rounded-lg text-center">
                    <p className="text-amber-300">Please connect your wallet first</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-3xl">
            <div className="flex items-center mb-8 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <button 
                    onClick={() => router.back()}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors mr-4"
                >
                    ←
                </button>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">Make Payment</h1>
            </div>

            <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 p-8 rounded-3xl shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Select Token</label>
                        <select
                            value={selectedToken.mint}
                            onChange={(e) => {
                                setSelectedToken(TOKENS.find(t => t.mint === e.target.value) || TOKENS[0]);
                                setUsdcEquivalent(null);
                                setAmount('');
                            }}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm font-medium"
                        >
                            {TOKENS.map((token) => (
                                <option key={token.mint} value={token.mint} className="bg-white dark:bg-gray-900">
                                    {token.symbol} - {token.name}
                                </option>
                            ))}
                        </select>
                        <div className="mt-2 text-xs text-gray-500 font-medium ml-1">
                            <span>
                                {executionMode === 'SIMULATION'
                                    ? '* Simulation mode: SOL-only transfer for testing. Enable real swaps for token conversion.'
                                    : '* Pay with any token – merchant receives USDC via Jupiter swap'}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Execution Mode</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setExecutionMode('SIMULATION')}
                                className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                                    executionMode === 'SIMULATION'
                                        ? 'bg-amber-500 text-black border-amber-400'
                                        : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'
                                }`}
                            >
                                Simulation
                            </button>
                            <button
                                type="button"
                                onClick={() => setExecutionMode('REAL')}
                                className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                                    executionMode === 'REAL'
                                        ? 'bg-blue-500 text-white border-blue-400'
                                        : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'
                                }`}
                            >
                                Real Swap
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Recipient Address</label>
                        <div className="flex items-center space-x-2">
                            <input 
                                type="text"
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                                className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm font-mono"
                                placeholder="Solana address..."
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowScanner(true)}
                                className="px-5 py-3 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 dark:from-gray-700 dark:to-gray-600 dark:hover:from-gray-600 dark:hover:to-gray-500 text-gray-800 dark:text-white rounded-xl font-semibold shadow-sm transition-all"
                            >
                                📷 Scan QR
                            </button>
                        </div>
                    </div>

                    {showScanner && (
                        <div className="mt-6 p-6 bg-white dark:bg-gray-900/50 rounded-2xl shadow-inner border border-gray-100 dark:border-gray-800">
                            <h3 className="mb-4 text-center font-semibold text-gray-800 dark:text-gray-200">Scan Solana Address</h3>
                            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                <QrScanner 
                                    onScanSuccess={(address) => {
                                        handleScanSuccess(address);
                                        toast.success('QR code scanned successfully');
                                    }}
                                    onScanError={(error) => {
                                        setShowScanner(false);
                                        toast.error('Failed to scan QR code: ' + error);
                                    }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowScanner(false)}
                                className="w-full mt-4 p-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold rounded-xl transition-colors"
                            >
                                Cancel Scan
                            </button>
                        </div>
                    )}

                    <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</label>
                        <input 
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0"
                            step="0.000001"
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm font-mono text-lg"
                            placeholder={`0.00 ${selectedToken.symbol}`}
                            required
                        />
                        <div className="mt-3 ml-1">
                            {usdcEquivalent !== null ? (
                                <div className="flex items-center space-x-2">
                                    <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">
                                        ≈ {usdcEquivalent.toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })} USDC
                                    </p>
                                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                        auto-updates
                                    </span>
                                    {priceLoading && (
                                        <div className="w-4 h-4 rounded-full border-2 border-r-transparent border-amber-500 animate-spin ml-2"></div>
                                    )}
                                </div>
                            ) : amount && Number(amount) > 0 ? (
                                <div className="flex items-center text-sm font-medium">
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Calculating swap route...
                                    </p>
                                    <div className="w-4 h-4 rounded-full border-2 border-r-transparent border-gray-400 animate-spin ml-3"></div>
                                </div>
                            ) : null}
                            {jupiterError && (
                                <p className="text-red-500 text-sm font-medium mt-2 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">{jupiterError}</p>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button 
                            type="submit"
                            disabled={
                                jupiterLoading || 
                                transactionLoading || 
                                !amount || 
                                !recipientAddress || 
                                !connected
                            }
                            className="w-full p-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold text-lg rounded-xl shadow-lg hover:shadow-amber-500/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {transactionLoading ? (
                                <><div className="w-5 h-5 rounded-full border-2 border-r-transparent border-black animate-spin"></div> Processing...</>
                            ) : jupiterLoading ? (
                                <><div className="w-5 h-5 rounded-full border-2 border-r-transparent border-black animate-spin"></div> Loading Route...</>
                            ) : !connected ? (
                                'Connect Wallet First'
                            ) : (
                                'Send Payment'
                            )}
                        </button>
                    </div>
                    
                    {transactionError && (
                        <div className="mt-4 p-4 text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20 text-center shadow-sm">
                            {transactionError}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
