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
            <div className="flex items-center justify-center min-h-screen bg-gray-800">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-300"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-800">
            <nav className="bg-black py-2">
                <div className="container mx-auto flex justify-between items-center">
                    <span className="text-amber-300 font-bold text-2xl ">Crypto Gate</span>
                    <div className="flex items-center space-x-4">
                        <WalletButton />
                        <div className="flex flex-col items-end">
                            <span className="text-sm text-gray-400">
                                {merchantInfo?.name && merchantInfo.name[0].toUpperCase() + merchantInfo.name.slice(1)}
                            </span>
                            <button 
                                onClick={() => logout()}
                                className="text-gray-300 hover:text-amber-300 cursor-pointer text-sm"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <main>
                {children}
            </main>
        </div>
    );
}
