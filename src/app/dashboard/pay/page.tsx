'use client'

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
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
    const { publicKey, connected } = useWallet();
    const { getPrice, loading: jupiterLoading, priceLoading, error: jupiterError } = useJupiter();
    const { executePayment, loading: transactionLoading, error: transactionError } = useTransaction();
    
    const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [usdcEquivalent, setUsdcEquivalent] = useState<number | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState(0);
    const UPDATE_INTERVAL = 60000; // 1 minute in milliseconds

    useEffect(() => {
        const updateUsdcEquivalent = async () => {
            if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
                // Always update when amount or selected token changes, regardless of timer
                try {
                    const price = await getPrice(new PublicKey(selectedToken.mint), Number(amount));
                    if (price) {
                        setUsdcEquivalent(price.outAmount);
                        setLastUpdateTime(Date.now());
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
            // This creates a transaction that simulates a Jupiter swap on devnet
            // In production environment, this would use executeJupiterSwap instead
            const result = await executePayment(quote.quoteResponse, recipientAddress);
            
            if (result.confirmed) {
                toast.success(`Payment of ${amount} ${selectedToken.symbol} sent and converted to USDC!`);
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
        <div className="container mx-auto p-6">
            <div className="flex items-center mb-8">
                <button 
                    onClick={() => router.back()}
                    className="text-amber-400 hover:text-amber-500 mr-4"
                >
                    ← Back
                </button>
                <h1 className="text-2xl font-bold">Make Payment</h1>
            </div>

            <div className="bg-gray-900 rounded-xl p-8 max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block mb-2">Select Token</label>
                        <select
                            value={selectedToken.mint}
                            onChange={(e) => {
                                setSelectedToken(TOKENS.find(t => t.mint === e.target.value) || TOKENS[0]);
                                setUsdcEquivalent(null);
                                setAmount('');
                            }}
                            className="w-full p-2 bg-gray-800 rounded-md"
                        >
                            {TOKENS.map((token) => (
                                <option key={token.mint} value={token.mint}>
                                    {token.symbol} - {token.name}
                                </option>
                            ))}
                        </select>
                        <div className="mt-1 text-xs text-gray-400">
                            <span>Pay with any token – merchant receives USDC via Jupiter swap</span>
                        </div>
                    </div>

                    <div>
                        <label className="block mb-2">Recipient Address</label>
                        <div className="flex items-center space-x-2">
                            <input 
                                type="text"
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                                className="flex-1 p-2 bg-gray-800 rounded-md"
                                placeholder="Solana address..."
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowScanner(true)}
                                className="p-2 bg-amber-600 hover:bg-amber-700 rounded-md"
                            >
                                Scan QR
                            </button>
                        </div>
                    </div>

                    {showScanner && (
                        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                            <h3 className="mb-2 text-center">Scan Solana Address QR Code</h3>
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
                            <button
                                type="button"
                                onClick={() => setShowScanner(false)}
                                className="w-full mt-4 p-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-md transition-colors"
                            >
                                Cancel Scan
                            </button>
                        </div>
                    )}

                    <div>
                        <label className="block mb-2">Amount</label>
                        <input 
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0"
                            step="0.000001"
                            className="w-full p-2 bg-gray-800 rounded-md"
                            placeholder={`Amount in ${selectedToken.symbol}...`}
                            required
                        />
                        <div className="mt-2">
                            {usdcEquivalent !== null ? (
                                <div className="flex items-center space-x-2">
                                    <p className="text-lg font-medium text-amber-400">
                                        ≈ {usdcEquivalent.toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })} USDC
                                    </p>
                                    <span className="text-xs text-gray-500">
                                        (auto-updates)
                                    </span>
                                    {priceLoading && (
                                        <div className="w-3 h-3 rounded-full border-t-2 border-r-2 border-amber-400 animate-spin ml-1"></div>
                                    )}
                                </div>
                            ) : amount && Number(amount) > 0 ? (
                                <div className="flex items-center">
                                    <p className="text-gray-400">
                                        Calculating USDC equivalent...
                                    </p>
                                    <div className="w-3 h-3 rounded-full border-t-2 border-r-2 border-gray-400 animate-spin ml-2"></div>
                                </div>
                            ) : null}
                            {jupiterError && (
                                <p className="text-red-400 mt-1">{jupiterError}</p>
                            )}
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={
                            jupiterLoading || 
                            transactionLoading || 
                            !amount || 
                            !recipientAddress || 
                            !connected
                        }
                        className="w-full p-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {transactionLoading ? 'Processing...' : 
                         jupiterLoading ? 'Loading...' : 
                         !connected ? 'Connect Wallet' :
                         'Send Payment'}
                    </button>
                    
                    {transactionError && (
                        <p className="mt-2 text-red-400">{transactionError}</p>
                    )}
                </form>
            </div>
        </div>
    );
}
