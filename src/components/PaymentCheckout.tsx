'use client'

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'react-hot-toast';
import { QrScanner } from '@/components/QrScanner';
import { useJupiter } from '@/hooks/useJupiter';
import { useTransaction } from '@/hooks/useTransaction';
import { config } from '@/lib/config';

const TOKENS = config.network === 'mainnet-beta'
  ? [
      { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112' },
      { symbol: 'USDC', name: 'USD Coin', mint: config.tokenAddresses.USDC[config.network] },
      { symbol: 'BONK', name: 'Bonk', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
      { symbol: 'JUP', name: 'Jupiter', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
      { symbol: 'RAY', name: 'Raydium', mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
      { symbol: 'MNGO', name: 'Mango', mint: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac' },
      { symbol: 'JSOL', name: 'Jupiter Staked SOL', mint: '7Q2afV64in6N6SeZsAAB181TxT9uK7ve6s1xXYquJ9NN' },
      { symbol: 'ORCA', name: 'Orca', mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE' },
    ]
  : [
      { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112' },
      { symbol: 'USDC', name: 'USD Coin', mint: config.tokenAddresses.USDC[config.network] },
    ];

interface PaymentCheckoutProps {
  heading: string;
  paymentId?: string;
  initialRecipient?: string;
  initialAmount?: string;
  initialMode?: 'SIMULATION' | 'REAL';
  initialTokenMint?: string;
  lockIntentFields?: boolean;
  allowScanner?: boolean;
  backHref?: string;
  className?: string;
}

export function PaymentCheckout({
  heading,
  paymentId = '',
  initialRecipient = '',
  initialAmount = '',
  initialMode = 'SIMULATION',
  initialTokenMint = TOKENS[0].mint,
  lockIntentFields = false,
  allowScanner = true,
  backHref,
  className = "container mx-auto p-4 md:p-8 max-w-3xl",
}: PaymentCheckoutProps) {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const { getPrice, loading: jupiterLoading, priceLoading, error: jupiterError } = useJupiter();
  const { executePayment, loading: transactionLoading, error: transactionError } = useTransaction();
  const realSwapAvailable = config.supportsRealJupiterSwaps;
  const realSwapDisabledReason = !config.hasJupiterApiKey
    ? 'Live settlement mode requires a Jupiter API key in your environment.'
    : 'Live settlement mode currently requires mainnet-beta because the devnet USDC route is not tradable via Jupiter in this app.';

  const [selectedToken, setSelectedToken] = useState(TOKENS.find((token) => token.mint === initialTokenMint) || TOKENS[0]);
  const [recipientAddress, setRecipientAddress] = useState(initialRecipient);
  const [amount, setAmount] = useState(initialAmount);
  const [executionMode, setExecutionMode] = useState<'SIMULATION' | 'REAL'>(initialMode);
  const [usdcEquivalent, setUsdcEquivalent] = useState<number | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const isSimulation = executionMode === 'SIMULATION';

  useEffect(() => {
    setSelectedToken(TOKENS.find((token) => token.mint === initialTokenMint) || TOKENS[0]);
    setRecipientAddress(initialRecipient);
    setAmount(initialAmount);
    setExecutionMode(initialMode);
  }, [initialAmount, initialMode, initialRecipient, initialTokenMint]);

  useEffect(() => {
    const updateUsdcEquivalent = async () => {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        setUsdcEquivalent(null);
        return;
      }

      if (executionMode === 'REAL' && !realSwapAvailable) {
        setUsdcEquivalent(null);
        return;
      }

      try {
        const price = await getPrice(
          new PublicKey(selectedToken.mint),
          Number(amount),
          {
            allowFallback: executionMode !== 'REAL',
            mode: executionMode,
            taker: executionMode === 'REAL' ? publicKey?.toString() : undefined,
            receiver: executionMode === 'REAL' ? recipientAddress : undefined,
          }
        );
        setUsdcEquivalent(price ? price.outAmount : null);
      } catch (err) {
        console.error('Error getting price:', err);
        setUsdcEquivalent(null);
      }
    };

    const debounceTimeout = setTimeout(updateUsdcEquivalent, 500);
    return () => clearTimeout(debounceTimeout);
  }, [amount, executionMode, getPrice, publicKey, recipientAddress, realSwapAvailable, selectedToken.mint]);

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

    if (publicKey && publicKey.toString() === recipientAddress) {
      toast.error('Payer wallet and merchant wallet cannot be the same');
      return;
    }

    if (executionMode === 'REAL' && !realSwapAvailable) {
      toast.error(realSwapDisabledReason);
      return;
    }

    try {
      const quote = await getPrice(
        new PublicKey(selectedToken.mint),
        Number(amount),
        {
          allowFallback: executionMode !== 'REAL',
          mode: executionMode,
          taker: executionMode === 'REAL' ? publicKey?.toString() : undefined,
          receiver: executionMode === 'REAL' ? recipientAddress : undefined,
        }
      );
      if (!quote) {
        throw new Error(
          executionMode === 'REAL'
            ? 'Unable to get a live Jupiter quote for this checkout right now. Please try again.'
            : 'Failed to get price quote'
        );
      }

      const result = await executePayment(quote.quote, recipientAddress, paymentId || undefined, executionMode);
      if (!result.confirmed) {
        throw new Error('Transaction failed');
      }

      if (paymentId) {
        await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId,
            fromWallet: publicKey!.toString(),
            signature: result.signature,
            status: 'CONFIRMED',
            quoteAmountUSDC: result.quotedUsdcAmount ?? usdcEquivalent?.toString(),
          }),
        });
      }

      toast.success(
        result.mode === 'simulated'
          ? `Simulated transfer of ${amount} ${selectedToken.symbol} sent. USDC-equivalent settlement was recorded in the gateway.`
          : `Payment of ${amount} ${selectedToken.symbol} submitted through Jupiter for merchant USDC settlement.`
      );

      if (!lockIntentFields) {
        setAmount('');
        setRecipientAddress('');
        setUsdcEquivalent(null);
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    }
  };

  return (
    <div className={className}>
      {heading || backHref ? (
        <div className="flex items-center mb-8 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          {backHref ? (
            <button
              onClick={() => router.push(backHref)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors mr-4"
            >
              ←
            </button>
          ) : null}
          {heading ? (
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
              {heading}
            </h1>
          ) : null}
        </div>
      ) : null}

      {!publicKey ? (
        <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 p-8 rounded-3xl shadow-xl text-center">
          <p className="text-amber-600 dark:text-amber-400 font-medium">Connect your wallet to pay this merchant.</p>
        </div>
      ) : (
        <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 p-8 rounded-3xl shadow-xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${
                isSimulation
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
              }`}
            >
              {isSimulation ? 'Simulation Settlement' : 'Live Settlement'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isSimulation
                ? 'On-chain SOL transfer with USDC-equivalent settlement recorded in the gateway.'
                : 'Jupiter-routed payment flow intended for merchant USDC settlement.'}
            </span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Token</label>
              <select
                value={selectedToken.mint}
                disabled={lockIntentFields}
                onChange={(e) => {
                  setSelectedToken(TOKENS.find((token) => token.mint === e.target.value) || TOKENS[0]);
                  setUsdcEquivalent(null);
                  if (!lockIntentFields) {
                    setAmount('');
                  }
                }}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 disabled:opacity-70"
              >
                {TOKENS.map((token) => (
                  <option key={token.mint} value={token.mint}>{token.symbol} - {token.name}</option>
                ))}
              </select>
              <div className="mt-2 text-xs text-gray-500 font-medium ml-1">
                {isSimulation
                  ? 'Simulation mode uses a real SOL transfer on-chain for demo settlement.'
                  : 'Live mode routes payment through Jupiter for token-to-USDC settlement.'}
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Checkout Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={lockIntentFields}
                  onClick={() => setExecutionMode('SIMULATION')}
                  className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${executionMode === 'SIMULATION' ? 'bg-amber-500 text-black border-amber-400' : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'} disabled:opacity-70`}
                >
                  Simulation
                </button>
                <button
                  type="button"
                  disabled={lockIntentFields || !realSwapAvailable}
                  onClick={() => setExecutionMode('REAL')}
                  className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${executionMode === 'REAL' ? 'bg-blue-500 text-white border-blue-400' : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'} disabled:opacity-60`}
                >
                  Live Settlement
                </button>
              </div>
              {!realSwapAvailable ? (
                <div className="mt-2 text-xs text-gray-500 font-medium ml-1">
                  {realSwapDisabledReason}
                </div>
              ) : null}
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Settlement Address</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={recipientAddress}
                  disabled={lockIntentFields}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-sm font-mono disabled:opacity-70"
                  required
                />
                {allowScanner ? (
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="px-5 py-3 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 dark:from-gray-700 dark:to-gray-600 dark:hover:from-gray-600 dark:hover:to-gray-500 text-gray-800 dark:text-white rounded-xl font-semibold shadow-sm transition-all"
                  >
                    Scan QR
                  </button>
                ) : null}
              </div>
            </div>

            {showScanner && allowScanner ? (
              <div className="mt-6 p-6 bg-white dark:bg-gray-900/50 rounded-2xl shadow-inner border border-gray-100 dark:border-gray-800">
                <h3 className="mb-4 text-center font-semibold text-gray-800 dark:text-gray-200">Scan Settlement Address</h3>
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                  <QrScanner
                    onScanSuccess={(address) => {
                      setRecipientAddress(address);
                      setShowScanner(false);
                      toast.success('QR code scanned successfully');
                    }}
                    onScanError={(error) => {
                      setShowScanner(false);
                      toast.error('Failed to scan QR code: ' + error);
                    }}
                  />
                </div>
              </div>
            ) : null}

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</label>
              <input
                type="number"
                value={amount}
                disabled={lockIntentFields}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.000001"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-sm font-mono text-lg disabled:opacity-70"
                placeholder={`0.00 ${selectedToken.symbol}`}
                required
              />
              <div className="mt-3 ml-1">
                {usdcEquivalent !== null ? (
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">
                      ≈ {usdcEquivalent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                    </p>
                    {priceLoading ? <div className="w-4 h-4 rounded-full border-2 border-r-transparent border-amber-500 animate-spin ml-2"></div> : null}
                  </div>
                ) : amount && Number(amount) > 0 ? (
                  <div className="flex items-center text-sm font-medium">
                    <p className="text-gray-500 dark:text-gray-400">Calculating swap route...</p>
                    <div className="w-4 h-4 rounded-full border-2 border-r-transparent border-gray-400 animate-spin ml-3"></div>
                  </div>
                ) : null}
                {jupiterError ? <p className="text-red-500 text-sm font-medium mt-2 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">{jupiterError}</p> : null}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="submit"
                disabled={jupiterLoading || transactionLoading || !amount || !recipientAddress || !connected}
                className="w-full p-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold text-lg rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {transactionLoading ? <><div className="w-5 h-5 rounded-full border-2 border-r-transparent border-black animate-spin"></div> Processing...</> :
                 jupiterLoading ? <><div className="w-5 h-5 rounded-full border-2 border-r-transparent border-black animate-spin"></div> Loading Route...</> :
                 !connected ? 'Connect Wallet First' : 'Pay Merchant'}
              </button>
            </div>

            {transactionError ? (
              <div className="mt-4 p-4 text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20 text-center shadow-sm">
                {transactionError}
              </div>
            ) : null}
          </form>
        </div>
      )}
    </div>
  );
}
