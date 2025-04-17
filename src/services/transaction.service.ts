import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, VersionedTransaction, Commitment, ConnectionConfig, TransactionInstruction } from '@solana/web3.js';
import { QuoteResponse } from '@jup-ag/api';
import bs58 from 'bs58';
import { config } from '@/lib/config';

// Constants - now using values from config
const JUPITER_SWAP_API = config.jupiterApiUrl;

// RPC configuration
const CONNECTION_CONFIG: ConnectionConfig = {
  commitment: config.confirmationOptions.commitment as Commitment,
  confirmTransactionInitialTimeout: 60000, // 1 minute
  disableRetryOnRateLimit: false,
  httpHeaders: {
    'Content-Type': 'application/json',
  },
};

interface SwapTransactionParams {
  quote: QuoteResponse;
  userPublicKey: PublicKey;
  recipientAddress: PublicKey;
}

interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  additionalMessage?: string;
}

export class TransactionService {
  readonly priceConnection: Connection;
  readonly txConnection: Connection;

  constructor() {
    // For price discovery, we always use mainnet
    this.priceConnection = new Connection(
      'https://api.mainnet-beta.solana.com', 
      CONNECTION_CONFIG
    );
    
    // For transactions, use the configured network endpoint
    this.txConnection = new Connection(
      config.rpcEndpoint,
      CONNECTION_CONFIG
    );
    
    console.log(`TransactionService initialized with network: ${config.network}`);
  }

  async createSwapTransaction({ quote, userPublicKey, recipientAddress }: SwapTransactionParams): Promise<Transaction> {
    try {
      if (!quote || !userPublicKey || !recipientAddress) {
        throw new Error('Missing required parameters for swap transaction');
      }

      // If we're in production and real Jupiter swaps are enabled, use Jupiter
      if (config.isProduction && config.useRealJupiterSwaps) {
        throw new Error('For production, use createRealJupiterSwap instead of createSwapTransaction');
      }
      
      // This is for devnet testing - simulating a USDC transaction
      const transaction = new Transaction();
      
      // The USDC amount that would result from a swap
      const usdcAmount = Math.ceil(Number(quote.outAmount) / Math.pow(10, 6)); // Convert USDC amount from smallest unit
      
      // Calculate the SOL equivalent for testing (1 SOL = 100 USDC for simplicity)
      const solAmount = Math.ceil(usdcAmount / 100 * LAMPORTS_PER_SOL);

      // Add a transfer instruction to simulate the USDC settlement
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: recipientAddress,
        lamports: solAmount,
      });

      transaction.add(transferInstruction);

      // Add a memo to indicate this is simulating a Jupiter swap
      // In production, this would be replaced with actual swap instructions
      const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: memoProgram,
        data: Buffer.from(`Simulated Jupiter Swap: ${usdcAmount} USDC (${config.network})`),
      });
      
      transaction.add(memoInstruction);

      // Get the latest blockhash from devnet with retries
      let blockhash, lastValidBlockHeight;
      try {
        const blockHashResponse = await this.getLatestBlockhashWithRetry();
        blockhash = blockHashResponse.blockhash;
        lastValidBlockHeight = blockHashResponse.lastValidBlockHeight;
      } catch (error) {
        console.error('Failed to get blockhash:', error);
        throw new Error(`Failed to get blockhash from ${config.network}`);
      }

      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = userPublicKey;

      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  // This would be used in production to create a real Jupiter swap transaction
  async createRealJupiterSwap({ quote, userPublicKey, recipientAddress }: SwapTransactionParams): Promise<VersionedTransaction> {
    try {
      // 1. Get swap transaction from Jupiter API
      const swapResponse = await fetch(`${JUPITER_SWAP_API}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: userPublicKey.toString(),
          destinationTokenAccount: recipientAddress.toString(), // Send USDC to recipient
        }),
      });

      if (!swapResponse.ok) {
        const error = await swapResponse.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to get swap transaction');
      }

      const { swapTransaction } = await swapResponse.json() as JupiterSwapResponse;
      
      // 2. Deserialize transaction
      const transactionBuffer = Buffer.from(swapTransaction, 'base64');
      const versionedTransaction = VersionedTransaction.deserialize(transactionBuffer);
      
      return versionedTransaction;
    } catch (error) {
      console.error('Error creating Jupiter swap:', error);
      throw error;
    }
  }

  private async getLatestBlockhashWithRetry(retries = 3, delay = 1000): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        const { blockhash, lastValidBlockHeight } = await this.txConnection.getLatestBlockhash(
          config.confirmationOptions.commitment as Commitment
        );
        return { blockhash, lastValidBlockHeight };
      } catch (error) {
        console.warn(`Attempt ${i + 1} failed to get blockhash:`, error);
        lastError = error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  async confirmTransaction(signature: string): Promise<boolean> {
    try {
      const { blockhash, lastValidBlockHeight } = await this.getLatestBlockhashWithRetry();
      const result = await this.txConnection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return !result.value.err;
    } catch (error) {
      console.error('Error confirming transaction:', error);
      return false;
    }
  }

  async getTransactionStatus(signature: string) {
    try {
      const status = await this.txConnection.getSignatureStatus(signature);
      return status;
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw error;
    }
  }

  async sendRawTransaction(rawTransaction: Buffer): Promise<string> {
    return await this.txConnection.sendRawTransaction(rawTransaction, {
      skipPreflight: config.confirmationOptions.skipPreflight,
      maxRetries: 3,
      preflightCommitment: config.confirmationOptions.preflightCommitment as Commitment,
    });
  }
}
