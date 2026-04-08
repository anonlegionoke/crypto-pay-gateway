import { Connection, Commitment, Finality, ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
import { config } from '@/lib/config';

type VerificationStatus = 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

interface VerifyPaymentParams {
  signature: string;
  paymentAddress: string;
  fromWallet?: string | null;
  expectedAmount?: string;
  expectedToken?: string;
  mode?: 'SIMULATION' | 'REAL';
}

interface VerificationResult {
  verified: boolean;
  status: VerificationStatus;
  reason?: string;
  confirmationStatus?: string | null;
  checks?: {
    destinationMatched: boolean;
    payerMatched: boolean;
    amountMatched: boolean;
  };
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

function isParsedInstruction(
  instruction: ParsedInstruction | PartiallyDecodedInstruction
): instruction is ParsedInstruction {
  return 'parsed' in instruction;
}

function amountToLamports(amount: string) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return null;
  }

  return Math.round(numericAmount * 1_000_000_000);
}

function verifySimulatedSolTransfer(
  transaction: ParsedTransactionWithMeta,
  params: Required<Pick<VerifyPaymentParams, 'paymentAddress' | 'fromWallet' | 'expectedAmount'>>
) {
  const expectedLamports = amountToLamports(params.expectedAmount);
  if (!expectedLamports) {
    return {
      matched: false,
      reason: 'Expected payment amount is invalid for SOL verification',
    };
  }

  const instructions = transaction.transaction.message.instructions;

  for (const instruction of instructions) {
    if (!isParsedInstruction(instruction)) continue;
    if (instruction.program !== 'system') continue;
    if (!instruction.parsed || instruction.parsed.type !== 'transfer') continue;

    const info = instruction.parsed.info as {
      source?: string;
      destination?: string;
      lamports?: number;
    };

    const sourceMatches = info.source === params.fromWallet;
    const destinationMatches = info.destination === params.paymentAddress;
    const amountMatches = info.lamports === expectedLamports;

    if (sourceMatches && destinationMatches && amountMatches) {
      return {
        matched: true,
        checks: {
          destinationMatched: true,
          payerMatched: true,
          amountMatched: true,
        },
      };
    }
  }

  return {
    matched: false,
    reason: 'Expected SOL transfer instruction was not found in transaction',
    checks: {
      destinationMatched: false,
      payerMatched: false,
      amountMatched: false,
    },
  };
}

export async function verifyPaymentOnChain({
  signature,
  paymentAddress,
  fromWallet,
  expectedAmount,
  expectedToken,
  mode,
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
  const destinationMatched = accountKeys.includes(paymentAddress);
  const payerMatched = fromWallet ? accountKeys.includes(fromWallet) : true;

  if (!destinationMatched) {
    return {
      verified: false,
      status: 'FAILED',
      reason: 'Payment destination was not found in transaction accounts',
      confirmationStatus: status.confirmationStatus,
      checks: {
        destinationMatched: false,
        payerMatched,
        amountMatched: false,
      },
    };
  }

  if (!payerMatched) {
    return {
      verified: false,
      status: 'FAILED',
      reason: 'Expected payer wallet was not found in transaction accounts',
      confirmationStatus: status.confirmationStatus,
      checks: {
        destinationMatched,
        payerMatched: false,
        amountMatched: false,
      },
    };
  }

  if (mode === 'SIMULATION' && expectedToken === config.tokenAddresses.SOL && fromWallet && expectedAmount) {
    const parsedTransaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: config.confirmationOptions.commitment as Finality,
    });

    if (!parsedTransaction) {
      return {
        verified: false,
        status: 'SUBMITTED',
        reason: 'Parsed transaction not available from RPC yet',
        confirmationStatus: status.confirmationStatus,
        checks: {
          destinationMatched,
          payerMatched,
          amountMatched: false,
        },
      };
    }

    const transferVerification = verifySimulatedSolTransfer(parsedTransaction, {
      paymentAddress,
      fromWallet,
      expectedAmount,
    });

    if (!transferVerification.matched) {
      return {
        verified: false,
        status: 'FAILED',
        reason: transferVerification.reason,
        confirmationStatus: status.confirmationStatus,
        checks: transferVerification.checks,
      };
    }

    return {
      verified: true,
      status: 'CONFIRMED',
      confirmationStatus: status.confirmationStatus,
      checks: transferVerification.checks,
    };
  }

  return {
    verified: true,
    status: 'CONFIRMED',
    confirmationStatus: status.confirmationStatus,
    checks: {
      destinationMatched,
      payerMatched,
      amountMatched: Boolean(expectedAmount) ? true : false,
    },
  };
}
