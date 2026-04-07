import { Connection, PublicKey, Transaction, SystemProgram, VersionedTransaction, Commitment, ConnectionConfig, TransactionInstruction } from '@solana/web3.js';
import { QuoteResponse } from '@jup-ag/api';
import { config } from '@/lib/config';

// Constants - now using values from config
const JUPITER_SWAP_API = `${config.jupiterApiBaseUrl}/swap/v1`;

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
  inputMint?: string;
}

interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  additionalMessage?: string;
}

export class TransactionService {
  readonly priceConnection: Connection;
  readonly txConnection: Connection;
  readonly txFallbackConnections: Connection[];

  constructor() {
    const [primaryRpc, fallbackRpc] = config.rpcFallbackEndpoints;
    this.priceConnection = new Connection(primaryRpc, CONNECTION_CONFIG);
    
    this.txConnection = new Connection(primaryRpc, CONNECTION_CONFIG);
    this.txFallbackConnections = [
      this.txConnection,
      ...(fallbackRpc && fallbackRpc !== primaryRpc ? [new Connection(fallbackRpc, CONNECTION_CONFIG)] : []),
    ];
    
    console.log(`TransactionService initialized with network: ${config.network}`);
  }

  async createSwapTransaction({ quote, userPublicKey, recipientAddress, inputMint }: SwapTransactionParams): Promise<Transaction> {
    try {
      if (!quote || !userPublicKey || !recipientAddress) {
        throw new Error('Missing required parameters for swap transaction');
      }

      if (config.useRealJupiterSwaps) {
        throw new Error('For production, use createRealJupiterSwap instead of createSwapTransaction');
      }

      // Simulation mode only supports SOL transfers to avoid fake conversion math.
      if (!inputMint || inputMint !== config.tokenAddresses.SOL) {
        throw new Error('Simulation mode supports SOL only. Enable real Jupiter swaps for SPL token payments.');
      }

      const transaction = new Transaction();

      const inLamports = Number(quote.inAmount);
      if (!Number.isFinite(inLamports) || inLamports <= 0) {
        throw new Error('Invalid quote amount for simulated transfer');
      }

      // Add a transfer instruction to simulate the USDC settlement
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: recipientAddress,
        lamports: Math.ceil(inLamports),
      });

      transaction.add(transferInstruction);

      // Add a memo to indicate this is simulating a Jupiter swap
      // In production, this would be replaced with actual swap instructions
      const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: memoProgram,
        data: Buffer.from(`Simulated payment transfer (${config.network})`),
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
        headers: {
          'Content-Type': 'application/json',
          ...(config.jupiterApiKey ? { 'x-api-key': config.jupiterApiKey } : {}),
        },
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
    for (let attempt = 0; attempt < retries; attempt++) {
      for (const [index, connection] of this.txFallbackConnections.entries()) {
        try {
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(
            config.confirmationOptions.commitment as Commitment
          );
          return { blockhash, lastValidBlockHeight };
        } catch (error) {
          console.warn(`Attempt ${attempt + 1} failed to get blockhash from RPC ${index + 1}:`, error);
          lastError = error;
        }
      }

      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
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
