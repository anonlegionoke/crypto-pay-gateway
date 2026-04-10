'use client'

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { WalletButton } from "@/components/WalletButton";
import { useWalletInfo } from '@/hooks/useWalletInfo';
import { RefreshCw, LogOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const AUTH_EVENT = 'auth-changed';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, logout } = useAuth();
    const [merchantInfo, setMerchantInfo] = useState<any>(null);
    const { balance, loading: walletLoading, refreshWalletInfo } = useWalletInfo();

    useEffect(() => {
        const syncMerchantInfo = () => {
            const storedInfo = localStorage.getItem('merchantInfo');
            setMerchantInfo(storedInfo ? JSON.parse(storedInfo) : null);
        };

        syncMerchantInfo();

        window.addEventListener(AUTH_EVENT, syncMerchantInfo);
        window.addEventListener('storage', syncMerchantInfo);

        return () => {
            window.removeEventListener(AUTH_EVENT, syncMerchantInfo);
            window.removeEventListener('storage', syncMerchantInfo);
        };
    }, []);

    if (isAuthenticated === null || !isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0A0A0A] transition-colors duration-300">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400"></div>
            </div>
        );
    }

    const renderBalance = (isMobile: boolean) => (
        <div className={`flex items-center justify-between rounded-2xl border border-amber-200/70 dark:border-amber-500/20 bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl shadow-[0_10px_30px_rgba(245,158,11,0.08)] ${isMobile ? 'w-full px-4 py-3' : 'min-w-[188px] px-4 py-2.5'}`}>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                    Wallet Info
                </p>
                <div className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap">
                    {walletLoading ? (
                        <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <span className={`font-bold text-gray-800 dark:text-gray-100 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                                {balance !== null ? balance.toFixed(4) : '---'}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
                                SOL
                            </span>
                        </>
                    )}
                </div>
            </div>
            <button 
                onClick={refreshWalletInfo} 
                disabled={walletLoading}
                className={`text-gray-400 hover:text-amber-500 transition-colors flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 ${isMobile ? 'p-1.5 bg-white/60 dark:bg-white/5 border border-gray-200/80 dark:border-white/10' : 'p-1.5'}`}
                title="Refresh Balance"
            >
                <RefreshCw className="w-4 h-4" />
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-[#0A0A0A] text-foreground transition-colors duration-300 pb-10">
            <nav className="bg-white/80 dark:bg-black/50 backdrop-blur-xl sticky top-0 z-50 transition-colors duration-300 flex flex-col border-b border-gray-200/70 dark:border-white/10">
                <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center w-full max-w-7xl gap-3">
                    <Link href="/dashboard" className="flex items-center flex-shrink-0 mr-2 sm:mr-4 overflow-hidden min-w-0">
                        <Image src="/logo.png" alt="Crypto Gate Logo" width={34} height={34} className="mr-3 drop-shadow-md rounded-lg flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-lg sm:text-2xl tracking-tight whitespace-nowrap">Crypto Gate</span>
                            <span className="text-[10px] sm:text-xs uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">Merchant Console</span>
                        </div>
                    </Link>
                    <div className="flex items-center gap-3 sm:gap-4 md:gap-6 min-w-0">
                        
                        {/* Desktop Balance - Hidden on Mobile */}
                        <div className="hidden md:flex items-center flex-shrink-0">
                            {renderBalance(false)}
                        </div>

                        {/* Wallet Button */}
                        <div className="flex-shrink-0 scale-[0.85] sm:scale-100 origin-right">
                            <WalletButton />
                        </div>
                        
                        {/* User Profile & Logout */}
                        <div className="flex items-center gap-1 sm:gap-2 md:pl-2 md:border-l border-gray-200 dark:border-gray-800 flex-shrink-0">
                            <div className="hidden lg:block text-right mr-1">
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-none">
                                    {merchantInfo?.name ? merchantInfo.name[0].toUpperCase() + merchantInfo.name.slice(1) : ''}
                                </p>
                            </div>
                            <button 
                                onClick={() => logout()}
                                className="flex items-center justify-center p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors active:scale-95"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5 sm:w-5 sm:h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Balance Sub-Header - Hidden on Desktop */}
                <div className="md:hidden w-full px-4 pb-4 pt-1">
                    {renderBalance(true)}
                </div>
            </nav>
            <main className="container mx-auto max-w-7xl pt-8">
                {children}
            </main>
        </div>
    );
}
