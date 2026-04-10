'use client'

import { useWallet } from '@solana/wallet-adapter-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { config } from '@/lib/config';

const TOKENS = config.network === 'mainnet-beta'
    ? [
        { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112' },
        { symbol: 'USDC', name: 'USD Coin', mint: config.tokenAddresses.USDC[config.network] },
        { symbol: 'BONK', name: 'Bonk', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
      ]
    : [
        { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112' },
        { symbol: 'USDC', name: 'USD Coin', mint: config.tokenAddresses.USDC[config.network] },
      ];

interface PaymentIntent {
    paymentId: string;
    paymentAddress: string;
    mode: 'SIMULATION' | 'REAL';
    status: string;
}

export default function ReceivePage() {
    const { publicKey } = useWallet();
    const router = useRouter();
    const [copied, setCopied] = useState(false);
    const [creating, setCreating] = useState(false);
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState<'SIMULATION' | 'REAL'>('SIMULATION');
    const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
    const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
    const realSwapAvailable = config.supportsRealJupiterSwaps;
    const realSwapDisabledReason = !config.hasJupiterApiKey
        ? 'Live settlement mode requires a Jupiter API key in your environment.'
        : 'Live settlement mode currently requires mainnet-beta because the devnet USDC route is not tradable via Jupiter in this app.';

    const walletAddress = publicKey?.toString() || '';
    const checkoutUrl = paymentIntent && typeof window !== 'undefined'
        ? `${window.location.origin}/pay/${paymentIntent.paymentId}`
        : '';

    const handleCopy = async (value: string) => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCreateIntent = async (e: React.FormEvent) => {
        e.preventDefault();

        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Please log in again');
            return;
        }

        if (!publicKey) {
            toast.error('Please connect your wallet first');
            return;
        }

        if (mode === 'REAL' && !realSwapAvailable) {
            toast.error(realSwapDisabledReason);
            return;
        }

        setCreating(true);
        try {
            const response = await fetch('/api/payment/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    amount,
                    token: selectedToken.mint,
                    mode,
                    settlementWallet: walletAddress,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('merchantInfo');
                    window.dispatchEvent(new Event('auth-changed'));
                    router.push('/login');
                }
                throw new Error(data.error || 'Failed to create payment intent');
            }

            setPaymentIntent(data);
            toast.success(mode === 'REAL' ? 'Live checkout link created' : 'Payment intent created');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to create payment intent');
        } finally {
            setCreating(false);
        }
    };

    if (!publicKey) {
        return (
            <div className="container mx-auto p-4">
                <div className="bg-gray-900 p-6 rounded-lg text-center">
                    <p className="text-amber-300">Please connect wallet first</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-8">
            <div className="flex items-center bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <button
                    onClick={() => router.back()}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors mr-4"
                >
                    ←
                </button>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">Receive Payment</h1>
                <span className="ml-auto inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                    {config.network}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 p-8 rounded-3xl shadow-xl">
                    <h2 className="text-lg font-semibold mb-6 text-gray-700 dark:text-gray-300">Create Payment Intent</h2>
                    <form onSubmit={handleCreateIntent} className="space-y-5">
                        <div>
                            <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</label>
                            <input
                                type="number"
                                min="0"
                                step="0.000001"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700"
                                placeholder="0.00"
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Customer Pays With</label>
                            <select
                                value={selectedToken.mint}
                                onChange={(e) => setSelectedToken(TOKENS.find((token) => token.mint === e.target.value) || TOKENS[0])}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700"
                            >
                                {TOKENS.map((token) => (
                                    <option key={token.mint} value={token.mint}>
                                        {token.symbol} - {token.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Execution Mode</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setMode('SIMULATION')}
                                    className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                                        mode === 'SIMULATION'
                                            ? 'bg-amber-500 text-black border-amber-400'
                                            : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    Simulation
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('REAL')}
                                    disabled={!realSwapAvailable}
                                    className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                                        mode === 'REAL'
                                            ? 'bg-blue-500 text-white border-blue-400'
                                            : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'
                                    } disabled:opacity-60`}
                                >
                                    Live Settlement
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Merchant Wallet</label>
                            <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 font-mono text-sm break-all">
                                {walletAddress}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={creating || !amount}
                            className="w-full p-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold rounded-xl disabled:opacity-50"
                        >
                            {creating ? 'Creating...' : 'Create Payment Intent'}
                        </button>
                    </form>
                </div>

                <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 p-8 rounded-3xl shadow-xl">
                    <h2 className="text-lg font-semibold mb-6 text-gray-700 dark:text-gray-300">Payment Request</h2>
                    {paymentIntent ? (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center space-y-6">
                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                                    <QRCodeSVG
                                        value={checkoutUrl}
                                        size={220}
                                        level="H"
                                    />
                                </div>

                                <div className="w-full space-y-3">
                                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/80">
                                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Payment ID</p>
                                        <p className="font-mono text-sm break-all">{paymentIntent.paymentId}</p>
                                    </div>
                                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/80">
                                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Public Checkout</p>
                                        <p className="font-mono text-sm break-all">{checkoutUrl}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => handleCopy(checkoutUrl)}
                                        className="w-full px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                                    >
                                        {copied ? 'Copied!' : 'Copy Checkout Link'}
                                    </button>
                                </div>
                                <p className="w-full text-sm text-center text-gray-500 dark:text-gray-400">
                                    Share this checkout link with the customer so they can open it and complete the payment from their wallet.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[320px] flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
                            Create a payment intent to generate the QR code and payer flow.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
