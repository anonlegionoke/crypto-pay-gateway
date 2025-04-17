import { Connection, PublicKey } from '@solana/web3.js';

// USDC mint address on devnet
export const USDC_MINT = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');

export async function getQuote(
    connection: Connection,
    inputMint: PublicKey,
    amount: number,
) {
    const response = await fetch('https://quote-api.jup.ag/v6/quote', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inputMint: inputMint.toString(),
            outputMint: USDC_MINT.toString(),
            amount: amount.toString(),
            slippageBps: 50,
            onlyDirectRoutes: false,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to get quote from Jupiter');
    }

    const quoteResponse = await response.json();
    if (!quoteResponse.data) {
        throw new Error('No routes found');
    }

    return quoteResponse.data;
}

export async function executeSwap(
    connection: Connection,
    wallet: any,
    inputMint: PublicKey,
    amount: number,
) {
    // Get the quote first
    const quoteResponse = await getQuote(connection, inputMint, amount);
    
    // Get the transaction data
    const response = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            quoteResponse,
            userPublicKey: wallet.publicKey.toString(),
            wrapAndUnwrapSol: true,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to get swap transaction');
    }

    const swapResult = await response.json();
    
    // Sign and send the transaction
    const transaction = swapResult.swapTransaction;
    const signedTx = await wallet.signTransaction(transaction);
    
    const txid = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(txid);
    
    return { txid };
}
