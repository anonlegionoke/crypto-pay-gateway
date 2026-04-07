import { Connection, Commitment, Finality, PublicKey } from '@solana/web3.js';
import { config } from '@/lib/config';

type VerificationStatus = 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

interface VerifyPaymentParams {
  signature: string;
  paymentAddress: string;
  fromWallet?: string | null;
}

interface VerificationResult {
  verified: boolean;
  status: VerificationStatus;
  reason?: string;
  confirmationStatus?: string | null;
}

const connection = new Connection(
  config.rpcEndpoint || config.defaultRpcEndpoint,
  config.confirmationOptions.commitment as Commitment
);

function normalizeAccountKeys(transaction: Awaited<ReturnType<Connection['getTransaction']>>) {
  if (!transaction) return [];

  const message = transaction.transaction.message as {
    staticAccountKeys?: PublicKey[];
    accountKeys?: PublicKey[];
  };

  if (message.staticAccountKeys) {
    return message.staticAccountKeys.map((key: PublicKey) => key.toBase58());
  }

  return (message.accountKeys || []).map((key: PublicKey) => key.toBase58());
}

export async function verifyPaymentOnChain({
  signature,
  paymentAddress,
  fromWallet,
}: VerifyPaymentParams): Promise<VerificationResult> {
  try {
    new PublicKey(paymentAddress);
    if (fromWallet) {
      new PublicKey(fromWallet);
    }
  } catch {
    return {
      verified: false,
      status: 'FAILED',
      reason: 'Invalid wallet address in verification request',
    };
  }

  const signatureStatus = await connection.getSignatureStatus(signature, {
    searchTransactionHistory: true,
  });

  const status = signatureStatus.value;
  if (!status) {
    return {
      verified: false,
      status: 'SUBMITTED',
      reason: 'Signature not found on chain yet',
    };
  }

  if (status.err) {
    return {
      verified: false,
      status: 'FAILED',
      reason: 'Transaction failed on chain',
      confirmationStatus: status.confirmationStatus,
    };
  }

  const transaction = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: config.confirmationOptions.commitment as Finality,
  });

  if (!transaction) {
    return {
      verified: false,
      status: 'SUBMITTED',
      reason: 'Transaction not available from RPC yet',
      confirmationStatus: status.confirmationStatus,
    };
  }

  const accountKeys = normalizeAccountKeys(transaction);

  if (!accountKeys.includes(paymentAddress)) {
    return {
      verified: false,
      status: 'FAILED',
      reason: 'Payment destination was not found in transaction accounts',
      confirmationStatus: status.confirmationStatus,
    };
  }

  if (fromWallet && !accountKeys.includes(fromWallet)) {
    return {
      verified: false,
      status: 'FAILED',
      reason: 'Expected payer wallet was not found in transaction accounts',
      confirmationStatus: status.confirmationStatus,
    };
  }

  return {
    verified: true,
    status: 'CONFIRMED',
    confirmationStatus: status.confirmationStatus,
  };
}
