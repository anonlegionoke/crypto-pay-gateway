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
        <div className="container mx-auto p-6">
            <div className="flex items-center mb-8">
                <button 
                    onClick={() => router.back()}
                    className="text-amber-400 hover:text-amber-500 mr-4"
                >
                    ← Back
                </button>
                <h1 className="text-2xl font-bold">Receive Payment</h1>
            </div>

            <div className="bg-gray-900 p-6 rounded-lg">
                <p className="text-center text-gray-400 mb-6">Share your wallet address or QR code to receive payments</p>
                
                <div className="flex flex-col items-center space-y-6">
                    {/* QR Code */}
                    <div className="bg-white p-4 rounded-lg">
                        <QRCodeSVG 
                            value={publicKey.toString()}
                            size={200}
                            level="H"
                        />
                    </div>

                    {/* Wallet Address */}
                    <div className="w-full max-w-md">
                        <div className="flex items-center space-x-2 bg-gray-800 p-3 rounded-lg">
                            <input
                                type="text"
                                readOnly
                                value={publicKey.toString()}
                                className="flex-1 bg-transparent outline-none text-sm"
                            />
                            <button
                                onClick={handleCopy}
                                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded text-sm transition-colors"
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
