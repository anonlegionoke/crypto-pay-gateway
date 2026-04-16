/**
 * Application Configuration
 * 
 * This file contains environment-specific configuration for the application.
 * To switch between devnet and mainnet, change the SOLANA_NETWORK value in .env.
 */

// Check if the environment is production
const isProduction = process.env.NODE_ENV === 'production';

// Network configuration (can be overridden by .env)
const SOLANA_NETWORK = (
  process.env.NEXT_PUBLIC_SOLANA_NETWORK ||
  process.env.SOLANA_NETWORK ||
  (isProduction ? 'mainnet-beta' : 'devnet')
) as 'devnet' | 'mainnet-beta' | 'testnet';

// Jupiter API configuration
const normalizeBaseUrl = (url: string) => url.replace(/\/$/, '').replace(/\/swap\/v\d+$/, '');
const JUPITER_API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_JUPITER_API_URL || 'https://api.jup.ag');
const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY || process.env.JUPITER_API_KEY || '';
const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

// RPC Endpoints
const RPC_ENDPOINTS = {
  'devnet': 'https://api.devnet.solana.com',
  'mainnet-beta': 'https://rpc.ankr.com/solana',
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
  defaultRpcEndpoint: RPC_ENDPOINTS[SOLANA_NETWORK as keyof typeof RPC_ENDPOINTS],
  rpcEndpoint:
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    RPC_ENDPOINTS[SOLANA_NETWORK as keyof typeof RPC_ENDPOINTS],
  rpcFallbackEndpoints: [
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    RPC_ENDPOINTS[SOLANA_NETWORK as keyof typeof RPC_ENDPOINTS],
  ].filter((endpoint, index, endpoints): endpoint is string => Boolean(endpoint) && endpoints.indexOf(endpoint) === index),
  jupiterApiBaseUrl: JUPITER_API_BASE_URL,
  jupiterSwapV2ApiBaseUrl: `${JUPITER_API_BASE_URL}/swap/v2`,
  jupiterApiKey: JUPITER_API_KEY,
  hasJupiterApiKey: Boolean(JUPITER_API_KEY),
  supportsRealJupiterSwaps: Boolean(JUPITER_API_KEY) && SOLANA_NETWORK === 'mainnet-beta',
  publicSiteUrl: PUBLIC_SITE_URL,
  tokenAddresses: TOKEN_ADDRESSES,
  confirmationOptions: CONFIRMATION_OPTIONS,
  // In production this should be explicitly true only when fully ready for real settlement.
  useRealJupiterSwaps: process.env.NEXT_PUBLIC_USE_REAL_JUPITER_SWAPS === 'true',
}; 
