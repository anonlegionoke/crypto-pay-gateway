"use client"

import { useState } from "react";
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function Login() {
    const router = useRouter();
    const { login } = useAuth(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('/api/merchant/login', {
                email,
                password
            });

            if (response.status === 200 && response?.data?.token) {
                login(response.data.token, JSON.stringify(response.data.merchant));
                router.push('/dashboard');
            } else {
                setError('Invalid response from server');
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.message || 'Login failed');
            } else {
                setError('An unexpected error occurred');
                console.error(error);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-[#0A0A0A] text-foreground transition-colors duration-300 p-4 relative">
            <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors font-medium bg-white/50 dark:bg-black/30 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <h1 className="mb-8 font-bold text-4xl text-center mt-12 sm:mt-0">
                Login to <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Crypto Gate</span>
            </h1>
            <form onSubmit={handleLogin} className="flex flex-col w-full max-w-md bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-2xl p-8 rounded-2xl">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 rounded-lg p-4 mb-6 text-sm font-medium">
                        {error}
                    </div>
                )}
                <div className="flex flex-col mb-4">
                    <label className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Email</label>
                    <input
                        className="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                    />
                </div>
                
                <div className="flex flex-col mb-6">
                    <label className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
                    <input
                        className="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                    />
                </div>
                
                <button 
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 mt-4 rounded-lg font-bold text-black transition-all transform active:scale-95 ${
                        loading 
                            ? 'bg-amber-600/50 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg hover:shadow-amber-500/25'
                    }`}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <p className="mt-8 text-center text-gray-600 dark:text-gray-400">
                Don't have an account? <a href="/signup" className="text-amber-600 font-semibold hover:text-amber-500 transition-colors">Sign up</a>
            </p>
        </div>
    );
}