'use client'

import { useWallet } from '@solana/wallet-adapter-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReceivePage() {
    const { publicKey } = useWallet();
    const [copied, setCopied] = useState(false);
    const router = useRouter();

    const handleCopy = async () => {
        if (publicKey) {
            await navigator.clipboard.writeText(publicKey.toString());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!publicKey) {
        return (
            <div className="container mx-auto p-4">
                <div className="bg-gray-900 p-6 rounded-lg text-center">
                    <p className="text-amber-300">Please connect your wallet first</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-3xl">
            <div className="flex items-center mb-8 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <button 
                    onClick={() => router.back()}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors mr-4"
                >
                    ←
                </button>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">Receive Payment</h1>
            </div>

            <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 p-8 rounded-3xl shadow-xl">
                <p className="text-center text-gray-600 dark:text-gray-400 mb-8 font-medium">Share your wallet address or QR code to receive payments</p>
                
                <div className="flex flex-col items-center space-y-8">
                    {/* QR Code */}
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 transform transition-transform hover:scale-105 duration-300">
                        <QRCodeSVG 
                            value={publicKey.toString()}
                            size={220}
                            level="H"
                            includeMargin={false}
                        />
                    </div>

                    {/* Wallet Address */}
                    <div className="w-full max-w-md">
                        <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">Wallet Address</label>
                        <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 p-2 rounded-xl shadow-inner">
                            <input
                                type="text"
                                readOnly
                                value={publicKey.toString()}
                                className="flex-1 bg-transparent px-3 outline-none text-sm text-gray-600 dark:text-gray-300 font-mono"
                            />
                            <button
                                onClick={handleCopy}
                                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                                    copied 
                                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                                    : 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
                                }`}
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
