import {
  Commitment,
  Connection,
  ConnectionConfig,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js';
import { config } from '@/lib/config';
import {
  CheckoutMode,
  GatewayQuote,
  PaymentExecutionResult,
  PreparedPaymentExecution,
} from '@/lib/gateway-types';

const JUPITER_SWAP_V2_API = config.jupiterSwapV2ApiBaseUrl;
const USDC_DECIMALS = 6;

const CONNECTION_CONFIG: ConnectionConfig = {
  commitment: config.confirmationOptions.commitment as Commitment,
  confirmTransactionInitialTimeout: 60000,
  disableRetryOnRateLimit: false,
  httpHeaders: {
    'Content-Type': 'application/json',
  },
};

interface PreparePaymentParams {
  quote: GatewayQuote;
  userPublicKey: PublicKey;
  recipientAddress: PublicKey;
  inputMint?: string;
  mode: CheckoutMode;
}

interface SignatureStatusResult {
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized' | null;
  err: unknown;
}

interface JupiterExecuteResponse {
  status?: 'Success' | 'Failed';
  signature?: string;
  error?: string;
  code?: number;
  outputAmountResult?: string;
}

function formatTokenAmount(amount: string | null | undefined, decimals: number) {
  if (!amount) return null;
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return null;
  return (numericAmount / Math.pow(10, decimals)).toString();
}

export class TransactionService {
  readonly txConnection: Connection;
  readonly txFallbackConnections: Connection[];

  constructor() {
    const [primaryRpc, fallbackRpc] = config.rpcFallbackEndpoints;
    this.txConnection = new Connection(primaryRpc, CONNECTION_CONFIG);
    this.txFallbackConnections = [
      this.txConnection,
      ...(fallbackRpc && fallbackRpc !== primaryRpc ? [new Connection(fallbackRpc, CONNECTION_CONFIG)] : []),
    ];
  }

  async preparePaymentExecution({ quote, userPublicKey, recipientAddress, inputMint, mode }: PreparePaymentParams): Promise<PreparedPaymentExecution> {
    if (mode === 'REAL') {
      return this.prepareRealExecution({ quote, recipientAddress });
    }

    return this.prepareSimulationExecution({ quote, userPublicKey, recipientAddress, inputMint });
  }

  private async prepareSimulationExecution({ quote, userPublicKey, recipientAddress, inputMint }: Omit<PreparePaymentParams, 'mode'>): Promise<PreparedPaymentExecution> {
    if (!inputMint || inputMint !== config.tokenAddresses.SOL) {
      throw new Error('Simulation mode supports SOL only. Enable real Jupiter swaps for SPL token payments.');
    }

    const transaction = new Transaction();
    const inLamports = Number(quote.inAmount);
    if (!Number.isFinite(inLamports) || inLamports <= 0) {
      throw new Error('Invalid quote amount for simulated transfer');
    }

    transaction.add(SystemProgram.transfer({
      fromPubkey: userPublicKey,
      toPubkey: recipientAddress,
      lamports: Math.ceil(inLamports),
    }));

    const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    transaction.add(new TransactionInstruction({
      keys: [],
      programId: memoProgram,
      data: Buffer.from(`Simulated payment transfer (${config.network})`),
    }));

    const { blockhash, lastValidBlockHeight } = await this.getLatestBlockhashWithRetry();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = userPublicKey;

    return {
      transaction,
      executionMode: 'SIMULATION',
      settlementType: 'SIMULATED_USDC',
      settlementAddress: recipientAddress.toBase58(),
      provider: 'internal-simulation',
      quotedUsdcAmount: formatTokenAmount(quote.outAmount, USDC_DECIMALS),
      confirmationContext: {
        blockhash,
        lastValidBlockHeight,
      },
    };
  }

  private async prepareRealExecution({ quote, recipientAddress }: Pick<PreparePaymentParams, 'quote' | 'recipientAddress'>): Promise<PreparedPaymentExecution> {
    if (!config.supportsRealJupiterSwaps) {
      throw new Error('Live settlement mode requires mainnet-beta and a Jupiter API key.');
    }

    if (!quote.transaction || !quote.requestId || typeof quote.lastValidBlockHeight !== 'number') {
      throw new Error('Live Jupiter quote is missing transaction data. Refresh the checkout and try again.');
    }

    const transactionBuffer = Buffer.from(quote.transaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuffer);

    return {
      transaction,
      executionMode: 'REAL',
      settlementType: 'LIVE_USDC',
      settlementAddress: recipientAddress.toBase58(),
      provider: 'jupiter-swap-v2',
      quotedUsdcAmount: formatTokenAmount(quote.outAmount, USDC_DECIMALS),
      confirmationContext: {
        blockhash: transaction.message.recentBlockhash,
        lastValidBlockHeight: quote.lastValidBlockHeight,
        requestId: quote.requestId,
      },
    };
  }

  async submitSignedPayment(
    signedTransaction: Transaction | VersionedTransaction,
    preparedExecution: PreparedPaymentExecution,
    paymentId?: string,
  ): Promise<PaymentExecutionResult> {
    if (preparedExecution.executionMode === 'REAL') {
      return this.submitRealExecution(signedTransaction, preparedExecution, paymentId);
    }

    return this.submitSimulationExecution(signedTransaction, preparedExecution, paymentId);
  }

  private async submitSimulationExecution(
    signedTransaction: Transaction | VersionedTransaction,
    preparedExecution: PreparedPaymentExecution,
    paymentId?: string,
  ): Promise<PaymentExecutionResult> {
    const signature = await this.sendRawTransaction(this.serializeTransaction(signedTransaction));
    const confirmed = await this.confirmTransaction(signature, preparedExecution.confirmationContext);

    if (!confirmed) {
      throw new Error('Transaction failed');
    }

    return {
      signature,
      confirmed: true,
      mode: 'simulated',
      settlementType: preparedExecution.settlementType,
      settlementAddress: preparedExecution.settlementAddress,
      provider: preparedExecution.provider,
      quotedUsdcAmount: preparedExecution.quotedUsdcAmount,
      paymentId,
    };
  }

  private async submitRealExecution(
    signedTransaction: Transaction | VersionedTransaction,
    preparedExecution: PreparedPaymentExecution,
    paymentId?: string,
  ): Promise<PaymentExecutionResult> {
    const signedTransactionBase64 = this.serializeTransaction(signedTransaction).toString('base64');
    const executeResponse = await fetch(`${JUPITER_SWAP_V2_API}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.jupiterApiKey ? { 'x-api-key': config.jupiterApiKey } : {}),
      },
      body: JSON.stringify({
        signedTransaction: signedTransactionBase64,
        requestId: preparedExecution.confirmationContext.requestId,
        lastValidBlockHeight: preparedExecution.confirmationContext.lastValidBlockHeight.toString(),
      }),
    });

    const executeData = await executeResponse.json().catch(() => ({} as JupiterExecuteResponse));
    if (!executeResponse.ok || executeData.status === 'Failed' || !executeData.signature) {
      throw new Error(executeData.error || 'Failed to execute Jupiter swap');
    }

    const confirmed = await this.confirmTransaction(executeData.signature, preparedExecution.confirmationContext);
    if (!confirmed) {
      throw new Error('Transaction failed');
    }

    return {
      signature: executeData.signature,
      confirmed: true,
      mode: 'real',
      settlementType: preparedExecution.settlementType,
      settlementAddress: preparedExecution.settlementAddress,
      provider: preparedExecution.provider,
      quotedUsdcAmount: formatTokenAmount(executeData.outputAmountResult, USDC_DECIMALS) ?? preparedExecution.quotedUsdcAmount,
      paymentId,
    };
  }

  private serializeTransaction(transaction: Transaction | VersionedTransaction) {
    return Buffer.from(transaction.serialize());
  }

  private async getLatestBlockhashWithRetry(retries = 3, delay = 1000): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    let lastError;
    for (let attempt = 0; attempt < retries; attempt++) {
      for (const [index, connection] of this.txFallbackConnections.entries()) {
        try {
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(
            config.confirmationOptions.commitment as Commitment,
          );
          return { blockhash, lastValidBlockHeight };
        } catch (error) {
          console.warn(`Attempt ${attempt + 1} failed to get blockhash from RPC ${index + 1}:`, error);
          lastError = error;
        }
      }

      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  async confirmTransaction(signature: string, confirmationContext: { blockhash: string; lastValidBlockHeight: number }): Promise<boolean> {
    const deadline = Date.now() + 45_000;

    while (Date.now() < deadline) {
      for (const [index, connection] of this.txFallbackConnections.entries()) {
        try {
          const statusResponse = await connection.getSignatureStatus(signature, {
            searchTransactionHistory: true,
          });
          const status = statusResponse.value as SignatureStatusResult | null;

          if (status?.err) {
            return false;
          }

          if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
            return true;
          }

          const currentBlockHeight = await connection.getBlockHeight(
            config.confirmationOptions.commitment as Commitment,
          );

          if (currentBlockHeight > confirmationContext.lastValidBlockHeight) {
            return false;
          }
        } catch (error) {
          console.warn(`Confirmation polling failed on RPC ${index + 1}:`, error);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }

    return false;
  }

  async getBalance(publicKey: PublicKey): Promise<number> {
    let lastError: unknown;

    for (const [index, connection] of this.txFallbackConnections.entries()) {
      try {
        return await connection.getBalance(publicKey, config.confirmationOptions.commitment as Commitment);
      } catch (error) {
        console.warn(`Failed to fetch balance from RPC ${index + 1}:`, error);
        lastError = error;
      }
    }

    throw lastError ?? new Error('Failed to fetch wallet balance');
  }

  async sendRawTransaction(rawTransaction: Buffer): Promise<string> {
    return this.txConnection.sendRawTransaction(rawTransaction, {
      skipPreflight: config.confirmationOptions.skipPreflight,
      maxRetries: 3,
      preflightCommitment: config.confirmationOptions.preflightCommitment as Commitment,
    });
  }
}
