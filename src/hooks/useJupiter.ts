import { useCallback, useEffect, useState } from 'react';
import { Connection, PublicKey, ConnectionConfig, Commitment } from '@solana/web3.js';
import { config } from '@/lib/config';
import { CheckoutMode, GatewayQuote } from '@/lib/gateway-types';

const SOL_MINT = config.tokenAddresses.SOL;
const USDC_MINT = config.tokenAddresses.USDC[config.network];

const TOKEN_DECIMALS: { [key: string]: number } = {
  [SOL_MINT]: 9,
  [USDC_MINT]: 6,
  [config.tokenAddresses.USDC.devnet]: 6,
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: 5,
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: 6,
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 6,
  MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac: 6,
  '7Q2afV64in6N6SeZsAAB181TxT9uK7ve6s1xXYquJ9NN': 9,
  orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE: 6,
};

interface PriceInfo {
  outAmount: number;
  priceImpactPct: number;
  quote: GatewayQuote;
}

interface GetPriceOptions {
  allowFallback?: boolean;
  mode?: CheckoutMode;
  taker?: string;
  receiver?: string;
}

const API_BASES = [
  config.jupiterApiBaseUrl,
  'https://api.jup.ag',
  'https://lite-api.jup.ag',
].filter((endpoint, index, endpoints) => endpoints.indexOf(endpoint) === index);

const PRICE_RPC_ENDPOINTS = config.rpcFallbackEndpoints;
const CACHE_VALIDITY_MS = 300000;

function buildFallbackQuote(inputMint: PublicKey, inputAmount: number): PriceInfo {
  const inputMintStr = inputMint.toString();
  let estimatedUsdValue;

  if (inputMintStr === SOL_MINT) {
    estimatedUsdValue = inputAmount * 154.0;
  } else if (inputMintStr === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') {
    estimatedUsdValue = inputAmount * 0.000008;
  } else if (inputMintStr === 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN') {
    estimatedUsdValue = inputAmount * 1.4;
  } else {
    estimatedUsdValue = inputAmount * 1.0;
  }

  return {
    outAmount: estimatedUsdValue,
    priceImpactPct: 0,
    quote: {
      inputMint: inputMintStr,
      outputMint: USDC_MINT,
      inAmount: (inputAmount * Math.pow(10, TOKEN_DECIMALS[inputMintStr] || 6)).toString(),
      outAmount: (estimatedUsdValue * Math.pow(10, TOKEN_DECIMALS[USDC_MINT])).toString(),
      otherAmountThreshold: null,
      slippageBps: 50,
      priceImpactPct: 0,
      source: 'fallback',
      provider: 'fallback-estimate',
    },
  };
}

export function useJupiter() {
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceConnection, setPriceConnection] = useState<Connection | null>(null);
  const [priceCache, setPriceCache] = useState<Record<string, { price: PriceInfo; timestamp: number }>>({});

  useEffect(() => {
    const basicConfig: ConnectionConfig = {
      commitment: 'confirmed' as Commitment,
      disableRetryOnRateLimit: false,
    };

    const defaultConn = new Connection(PRICE_RPC_ENDPOINTS[0], basicConfig);
    setPriceConnection(defaultConn);

    const init = async () => {
      try {
        const connectionConfig: ConnectionConfig = {
          commitment: 'confirmed' as Commitment,
          disableRetryOnRateLimit: false,
          confirmTransactionInitialTimeout: 60000,
        };

        for (const endpoint of PRICE_RPC_ENDPOINTS) {
          try {
            const connection = new Connection(endpoint, connectionConfig);
            await connection.getVersion();
            setPriceConnection(connection);
            return;
          } catch (err) {
            const connErr = err as Error;
            console.warn(`RPC connection failed (${endpoint}): ${connErr.message}`);
          }
        }
      } catch (err) {
        console.error('Failed to initialize price RPC connection:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize connections');
      }
    };

    init();
  }, []);

  const fetchWithRetry = useCallback(async (
    path: string,
    options?: RequestInit,
    retries = 3,
    delay = 500,
  ) => {
    let lastError;

    for (let i = 0; i < retries; i++) {
      const baseUrl = API_BASES[i % API_BASES.length];
      const url = `${baseUrl}${path}`;

      try {
        const cacheBuster = `_=${Date.now()}`;
        const separator = url.includes('?') ? '&' : '?';
        const urlWithCache = `${url}${separator}${cacheBuster}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(urlWithCache, {
            ...options,
            signal: controller.signal,
            headers: {
              ...options?.headers,
              ...(config.jupiterApiKey ? { 'x-api-key': config.jupiterApiKey } : {}),
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
              Expires: '0',
            },
          }).catch((err) => {
            console.warn(`Network fetch error: ${err.message}`);
            throw new Error(`Network error: ${err.message}`);
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
            throw new Error(errorData.error || errorData.message || `HTTP error ${response.status}`);
          }

          return response;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (fetchError) {
        console.warn(`Attempt ${i + 1} failed for ${path}:`, fetchError);
        lastError = fetchError;

        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    }

    throw lastError;
  }, []);

  const getPrice = useCallback(async (
    inputMint: PublicKey,
    inputAmount: number,
    {
      allowFallback = true,
      mode = 'SIMULATION',
      taker,
      receiver,
    }: GetPriceOptions = {},
  ): Promise<PriceInfo | null> => {
    try {
      setError(null);
      setPriceLoading(true);

      const cacheKey = [mode, inputMint.toString(), inputAmount, taker || '', receiver || ''].join(':');
      const cachedData = priceCache[cacheKey];
      if (
        cachedData &&
        (Date.now() - cachedData.timestamp) < CACHE_VALIDITY_MS &&
        (allowFallback || cachedData.price.quote.source === 'jupiter')
      ) {
        return cachedData.price;
      }

      if (!priceConnection) {
        setPriceConnection(new Connection(PRICE_RPC_ENDPOINTS[0], { commitment: 'confirmed' as Commitment }));
      }

      if (mode === 'REAL') {
        if (!config.supportsRealJupiterSwaps) {
          throw new Error('Live settlement mode requires mainnet-beta and a Jupiter API key.');
        }
        if (!taker || !receiver) {
          throw new Error('Live settlement quote requires both payer and merchant wallet addresses.');
        }
      }

      if (!config.hasJupiterApiKey && mode === 'SIMULATION') {
        if (!allowFallback) {
          throw new Error('Simulation quote fallback is disabled and no Jupiter API key is configured.');
        }
        const fallbackPrice = buildFallbackQuote(inputMint, inputAmount);
        setPriceCache((prev) => ({
          ...prev,
          [cacheKey]: { price: fallbackPrice, timestamp: Date.now() - CACHE_VALIDITY_MS / 2 },
        }));
        return fallbackPrice;
      }

      const params = new URLSearchParams({
        inputMint: inputMint.toString(),
        outputMint: USDC_MINT,
        amount: Math.floor(inputAmount * Math.pow(10, TOKEN_DECIMALS[inputMint.toString()] || 6)).toString(),
        slippageBps: '50',
        swapMode: 'ExactIn',
      });

      if (mode === 'REAL' && taker && receiver) {
        params.set('taker', taker);
        params.set('receiver', receiver);
      }

      const orderResponse = await fetchWithRetry(
        `/swap/v2/order?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await orderResponse.json();
      if (data.error || data.errorMessage) {
        throw new Error(data.errorMessage || data.error);
      }

      const priceInfo: PriceInfo = {
        outAmount: Number(data.outAmount) / Math.pow(10, TOKEN_DECIMALS[USDC_MINT]),
        priceImpactPct: Number(data.priceImpactPct ?? data.priceImpact ?? 0),
        quote: {
          inputMint: data.inputMint,
          outputMint: data.outputMint,
          inAmount: data.inAmount,
          outAmount: data.outAmount,
          otherAmountThreshold: data.otherAmountThreshold ?? null,
          slippageBps: Number(data.slippageBps ?? 50),
          priceImpactPct: Number(data.priceImpactPct ?? data.priceImpact ?? 0),
          source: 'jupiter',
          provider: 'jupiter-swap-v2',
          transaction: typeof data.transaction === 'string' ? data.transaction : undefined,
          requestId: typeof data.requestId === 'string' ? data.requestId : undefined,
          lastValidBlockHeight: data.lastValidBlockHeight ? Number(data.lastValidBlockHeight) : undefined,
        },
      };

      setPriceCache((prev) => ({
        ...prev,
        [cacheKey]: { price: priceInfo, timestamp: Date.now() },
      }));

      return priceInfo;
    } catch (fetchError) {
      console.error('Price fetch failed:', fetchError);

      if (!allowFallback) {
        setError(`Price calculation failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
        return null;
      }

      try {
        const fallbackPrice = buildFallbackQuote(inputMint, inputAmount);
        const cacheKey = [mode, inputMint.toString(), inputAmount, taker || '', receiver || ''].join(':');
        setPriceCache((prev) => ({
          ...prev,
          [cacheKey]: { price: fallbackPrice, timestamp: Date.now() - CACHE_VALIDITY_MS / 2 },
        }));

        return fallbackPrice;
      } catch (fallbackError) {
        console.error('Fallback price calculation also failed:', fallbackError);
        setError(`Price calculation failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
        return null;
      }
    } finally {
      setPriceLoading(false);
    }
  }, [fetchWithRetry, priceCache, priceConnection]);

  const executeSwap = useCallback(async (quote: GatewayQuote) => {
    try {
      setLoading(true);
      setError(null);
      return quote;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to prepare swap';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    priceLoading,
    error,
    getPrice,
    executeSwap,
  };
}
