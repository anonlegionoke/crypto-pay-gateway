'use client'

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect } from 'react';

declare global {
    interface Window {
        phantom?: {
            solana?: any;
        }
    }
}

export function WalletButton() {
    const { publicKey, connected, wallet } = useWallet();

    useEffect(() => {
        if (connected && publicKey) {
            console.log('Wallet connected:', publicKey.toString());
        }
    }, [connected, publicKey]);

    return (
        <WalletMultiButton />
    );
}
