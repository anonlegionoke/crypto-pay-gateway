import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { USDC_MINT } from './jupiter';

export async function getUSDCBalance(connection: Connection, walletAddress: string) {
    try {
        const publicKey = new PublicKey(walletAddress);
        const tokenAccount = await getAssociatedTokenAddress(
            USDC_MINT,
            publicKey,
            false,
            TOKEN_PROGRAM_ID
        );

        const balance = await connection.getTokenAccountBalance(tokenAccount);
        return parseFloat(balance.value.amount) / Math.pow(10, balance.value.decimals);
    } catch (error) {
        console.error('Error getting USDC balance:', error);
        return 0;
    }
}

export async function getSolanaBalance(connection: Connection, walletAddress: string) {
    try {
        const publicKey = new PublicKey(walletAddress);
        const balance = await connection.getBalance(publicKey);
        return balance / LAMPORTS_PER_SOL;
    } catch (error) {
        console.error('Error getting SOL balance:', error);
        return 0;
    }
}
