'use client'

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect } from 'react';

export function WalletButton() {
    const { publicKey, connected } = useWallet();

    useEffect(() => {
        if (connected && publicKey) {
            console.log('Wallet connected:', publicKey.toString());
        }
    }, [connected, publicKey]);

    return (
        <WalletMultiButton style={{ borderRadius: '1rem', height: '42px', padding: '0 20px' }} />
    );
}
