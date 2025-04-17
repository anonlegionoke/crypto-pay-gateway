/**
 * Application Configuration
 * 
 * This file contains environment-specific configuration for the application.
 * To switch between devnet and mainnet, change the SOLANA_NETWORK value in .env.
 */

// Check if the environment is production
const isProduction = process.env.NODE_ENV === 'production';

// Network configuration (can be overridden by .env)
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || (isProduction ? 'mainnet-beta' : 'devnet');

// Jupiter API configuration
const JUPITER_API_URL = 'https://quote-api.jup.ag/v4';

// RPC Endpoints
const RPC_ENDPOINTS = {
  'devnet': 'https://api.devnet.solana.com',
  'mainnet-beta': 'https://rpc.ankr.com/solana', // Consider using a more reliable RPC provider in production
  'testnet': 'https://api.testnet.solana.com'
};

// Token addresses
const TOKEN_ADDRESSES = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: {
    'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'devnet': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    'testnet': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
  }
};

// Confirmation options
const CONFIRMATION_OPTIONS = {
  commitment: 'confirmed',
  preflightCommitment: 'confirmed',
  skipPreflight: false
};

// Export configuration
export const config = {
  isProduction,
  network: SOLANA_NETWORK,
  rpcEndpoint: RPC_ENDPOINTS[SOLANA_NETWORK as keyof typeof RPC_ENDPOINTS],
  jupiterApiUrl: JUPITER_API_URL,
  tokenAddresses: TOKEN_ADDRESSES,
  confirmationOptions: CONFIRMATION_OPTIONS,
  // Jupiter feature flag - set to true to enable real Jupiter swaps in production
  useRealJupiterSwaps: isProduction,
}; 