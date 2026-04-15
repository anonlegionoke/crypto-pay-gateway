'use client'

import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';
import { config } from '@/lib/config';

interface Props {
  children: ReactNode;
}

export const ClientWalletProvider: FC<Props> = ({ children }) => {
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_WALLET_RPC_URL) {
      return process.env.NEXT_PUBLIC_WALLET_RPC_URL;
    }

    if (config.network === 'mainnet-beta') return clusterApiUrl('mainnet-beta');
    if (config.network === 'testnet') return clusterApiUrl('testnet');
    return clusterApiUrl('devnet');
  }, []);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
