import { Transaction, VersionedTransaction } from '@solana/web3.js';

export type CheckoutMode = 'SIMULATION' | 'REAL';

export type SettlementType = 'SIMULATED_USDC' | 'LIVE_USDC';

export type GatewayQuoteSource = 'jupiter' | 'fallback';

export interface GatewayQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold?: string | null;
  slippageBps: number;
  priceImpactPct: number;
  source: GatewayQuoteSource;
  provider: 'jupiter-swap-v2' | 'fallback-estimate';
  transaction?: string;
  requestId?: string;
  lastValidBlockHeight?: number;
}

export interface PreparedPaymentExecution {
  transaction: Transaction | VersionedTransaction;
  executionMode: CheckoutMode;
  settlementType: SettlementType;
  settlementAddress: string;
  provider: 'internal-simulation' | 'jupiter-swap-v2';
  quotedUsdcAmount: string | null;
  confirmationContext: {
    blockhash: string;
    lastValidBlockHeight: number;
    requestId?: string;
  };
}

export interface PaymentExecutionResult {
  signature: string;
  confirmed: boolean;
  mode: 'simulated' | 'real';
  settlementType: SettlementType;
  settlementAddress: string;
  provider: 'internal-simulation' | 'jupiter-swap-v2';
  quotedUsdcAmount: string | null;
  paymentId?: string;
}
