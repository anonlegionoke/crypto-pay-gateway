import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { TransactionService } from '@/services/transaction.service';
import { PublicKey } from '@solana/web3.js';
import { config } from '@/lib/config';
import { CheckoutMode, GatewayQuote } from '@/lib/gateway-types';

const LAMPORTS_PER_SOL = 1_000_000_000;
const SIMULATION_FEE_BUFFER_LAMPORTS = 10_000;

export function useTransaction() {
  const { publicKey, signTransaction, connected } = useWallet();
  const [transactionService] = useState(() => new TransactionService());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executePayment = useCallback(async (
    quote: GatewayQuote,
    recipientAddress: string,
    paymentId?: string,
    mode: CheckoutMode = config.useRealJupiterSwaps && config.supportsRealJupiterSwaps ? 'REAL' : 'SIMULATION',
  ) => {
    if (!publicKey || !signTransaction || !connected) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'SIMULATION') {
        const requiredLamports = Number(quote.inAmount);
        if (!Number.isFinite(requiredLamports) || requiredLamports <= 0) {
          throw new Error('Invalid payment amount returned by quote service');
        }

        const currentBalance = await transactionService.getBalance(publicKey);
        const minimumRequiredLamports = requiredLamports + SIMULATION_FEE_BUFFER_LAMPORTS;

        if (currentBalance < minimumRequiredLamports) {
          const availableSol = currentBalance / LAMPORTS_PER_SOL;
          const requiredSol = minimumRequiredLamports / LAMPORTS_PER_SOL;
          throw new Error(
            `Insufficient SOL balance. Need about ${requiredSol.toFixed(6)} SOL, but wallet has ${availableSol.toFixed(6)} SOL.`
          );
        }
      }

      const preparedExecution = await transactionService.preparePaymentExecution({
        quote,
        userPublicKey: publicKey,
        recipientAddress: new PublicKey(recipientAddress),
        inputMint: quote.inputMint,
        mode,
      });

      const signedTransaction = await signTransaction(preparedExecution.transaction as never);

      return await transactionService.submitSignedPayment(
        signedTransaction as never,
        preparedExecution,
        paymentId,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, connected, transactionService]);

  return {
    executePayment,
    loading,
    error,
  };
}
