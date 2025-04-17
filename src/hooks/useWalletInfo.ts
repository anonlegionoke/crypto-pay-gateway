import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, LAMPORTS_PER_SOL, PublicKey, TransactionResponse, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { useEffect, useState } from 'react';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

interface Transaction {
  signature: string;
  timestamp: number;
  amount: number;
  type: 'send' | 'receive';
  otherParty: string;
}

export function useWalletInfo() {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletInfo = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    setError(null);

    try {
      // Fetch balance
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);

      // Fetch recent transactions
      const signatures = await connection.getSignaturesForAddress(publicKey, {
        limit: 5,
      });

      const txPromises = signatures.map(async (sig) => {
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx) return null;

        let amount = 0;
        let isSend = false;
        let otherParty = '';

        if ('message' in tx.transaction && tx.meta) {
          const message = tx.transaction.message;
          const accountKeys = message.getAccountKeys();
          
          // Find the index of the user's public key in the account keys
          let userIndex = -1;
          for (let i = 0; i < accountKeys.length; i++) {
            const key = accountKeys.get(i);
            if (key && key.equals(publicKey)) {
              userIndex = i;
              break;
            }
          }
          
          if (userIndex !== -1) {
            // Calculate balance change for the user's account
            amount = tx.meta.postBalances[userIndex] - tx.meta.preBalances[userIndex];
            isSend = amount < 0;
            
            // Find the other party
            for (let i = 0; i < accountKeys.length; i++) {
              const key = accountKeys.get(i);
              if (key && !key.equals(publicKey) && !key.equals(SystemProgram.programId)) {
                otherParty = key.toString();
                break;
              }
            }
          }
        }

        return {
          signature: sig.signature,
          timestamp: tx.blockTime || 0,
          amount: Math.abs(amount) / LAMPORTS_PER_SOL,
          type: isSend ? 'send' : 'receive',
          otherParty,
        };
      });

      const txs = (await Promise.all(txPromises)).filter((tx): tx is Transaction => tx !== null);
      setTransactions(txs);
    } catch (err) {
      console.error('Error fetching wallet info:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      setTransactions([]);
      return;
    }

    // Initial fetch when wallet connects
    fetchWalletInfo();
    
    // Remove the polling interval - we'll use manual refresh instead
  }, [publicKey]);

  return {
    balance,
    transactions,
    loading,
    error,
    refreshWalletInfo: fetchWalletInfo  // Expose refresh function
  };
}
