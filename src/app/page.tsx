'use client'

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuth(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated === null || isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-[#0A0A0A] transition-colors duration-300">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-[#0A0A0A] text-foreground transition-colors duration-300 font-[family-name:var(--font-geist-sans)]">
      
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 sm:px-12 w-full max-w-7xl mx-auto">
        <div className="flex items-center text-2xl font-bold tracking-tight">
          <Image src="/logo.png" alt="Crypto Gate Logo" width={36} height={36} className="mr-3 drop-shadow-md rounded-md" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 drop-shadow-sm">Crypto Gate</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-600 dark:text-gray-300 font-semibold hover:text-amber-500 transition-colors">
            Login
          </Link>
          <Link href="/signup" className="px-5 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-bold hover:scale-105 transition-transform shadow-md">
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center flex-1 w-full max-w-5xl mx-auto p-8 sm:p-12 text-center mt-[-5vh]">
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-xs tracking-widest uppercase mb-8 border border-amber-200 dark:border-amber-500/20">
          Built on Solana & Jupiter
        </div>

        <h1 className="mb-8 font-extrabold text-5xl sm:text-7xl leading-tight text-center tracking-tight">
          <span className="block text-gray-800 dark:text-gray-100 mb-2">Accept Any Token.</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 drop-shadow-sm">Get Paid in USDC.</span>
        </h1>
        
        <p className="mb-12 text-lg sm:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed font-medium">
          The ultimate payment gateway for merchants. Let your users pay with their preferred tokens, while you receive instant, borderless settlements in stablecoins. 
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-center w-full justify-center">
          <Link href={`/signup`}
            className="flex items-center justify-center gap-3 w-full sm:w-auto min-w-[200px] h-14 px-8 rounded-2xl font-bold transition-all transform active:scale-95 bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 text-lg hover:-translate-y-1"
          >
            Start Accepting Crypto
          </Link>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-400 dark:text-gray-500 font-medium">
        © {new Date().getFullYear()} Solana Crypto Gate. Powering merchants globally.
      </footer>
    </div>
  );
}
