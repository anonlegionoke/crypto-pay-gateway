'use client'

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { WalletButton } from "@/components/WalletButton";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, logout } = useAuth();
    const [merchantInfo, setMerchantInfo] = useState<any>(null);

    useEffect(() => {
        const storedInfo = localStorage.getItem('merchantInfo');
        if (storedInfo) {
            setMerchantInfo(JSON.parse(storedInfo));
        }
    }, []);

    if (isAuthenticated === null || !isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-gray-100 dark:to-gray-900 transition-colors duration-300">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-gray-100 dark:to-gray-900 text-foreground transition-colors duration-300 pb-10">
            <nav className="bg-white/70 dark:bg-black/40 backdrop-blur-md border-b border-gray-200 dark:border-white/10 sticky top-0 z-50 transition-colors duration-300">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center w-full max-w-7xl">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-2xl tracking-tight">Crypto Gate</span>
                    <div className="flex items-center space-x-6">
                        <WalletButton />
                        <div className="flex flex-col items-end border-l border-gray-300 dark:border-gray-700 pl-6">
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {merchantInfo?.name && merchantInfo.name[0].toUpperCase() + merchantInfo.name.slice(1)}
                            </span>
                            <button 
                                onClick={() => logout()}
                                className="text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 font-medium cursor-pointer text-xs mt-1 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="container mx-auto max-w-7xl pt-8">
                {children}
            </main>
        </div>
    );
}
