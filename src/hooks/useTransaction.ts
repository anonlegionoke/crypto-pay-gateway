import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { TransactionService } from '@/services/transaction.service';
import { QuoteResponse } from '@jup-ag/api';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { config } from '@/lib/config';

export function useTransaction() {
  const { publicKey, signTransaction, signAllTransactions, connected } = useWallet();
  const [transactionService] = useState(() => new TransactionService());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executePayment = useCallback(async (
    quote: QuoteResponse,
    recipientAddress: string,
  ) => {
    if (!publicKey || !signTransaction || !connected) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Decide whether to use real Jupiter swaps or simulated swaps based on config
      if (config.isProduction && config.useRealJupiterSwaps) {
        // In production with real Jupiter swaps enabled, use versionedTransaction
        console.log("Using real Jupiter swap for payment");
        return await executeJupiterSwapInternal(quote, recipientAddress);
      } else {
        // In development or testing, use simulated swap
        console.log("Using simulated swap for payment on", config.network);
        
        // Create the transaction (simulated swap for development)
        const transaction = await transactionService.createSwapTransaction({
          quote,
          userPublicKey: publicKey,
          recipientAddress: new PublicKey(recipientAddress),
        });

        // Sign the transaction
        const signedTransaction = await signTransaction(transaction);

        // Send the signed transaction
        const signature = await transactionService.sendRawTransaction(
          Buffer.from(signedTransaction.serialize())
        );

        // Confirm the transaction
        const confirmed = await transactionService.confirmTransaction(signature);

        if (!confirmed) {
          throw new Error('Transaction failed');
        }

        return {
          signature,
          confirmed: true,
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, connected, transactionService]);

  // Internal method for Jupiter swaps - used by executePayment when in production
  const executeJupiterSwapInternal = useCallback(async (
    quote: QuoteResponse,
    recipientAddress: string,
  ) => {
    if (!publicKey || !signTransaction || !connected) {
      throw new Error('Wallet not connected');
    }

    try {
      // 1. Create the versioned transaction
      const versionedTransaction = await transactionService.createRealJupiterSwap({
        quote,
        userPublicKey: publicKey,
        recipientAddress: new PublicKey(recipientAddress),
      });

      // 2. Sign the versioned transaction
      const signedTransaction = await signTransaction(versionedTransaction as any);

      // 3. Send the signed transaction
      const signature = await transactionService.sendRawTransaction(
        Buffer.from(signedTransaction.serialize())
      );

      // 4. Confirm the transaction
      const confirmed = await transactionService.confirmTransaction(signature);

      if (!confirmed) {
        throw new Error('Transaction failed');
      }

      return {
        signature,
        confirmed: true,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Swap failed';
      setError(errorMessage);
      throw err;
    }
  }, [publicKey, signTransaction, connected, transactionService]);

  return {
    executePayment,
    loading,
    error,
  };
}
