"use client"

import { useState } from "react";
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
    const router = useRouter();
    const { login } = useAuth();
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800">
            <h1 className="mb-8 font-bold text-3xl">
                Login to <span className="text-amber-300">Crypto Gate</span>
            </h1>
            <form onSubmit={handleLogin} className="flex flex-col w-full max-w-md bg-black p-5 px-10 rounded-xl">
                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-md p-3 mb-4">
                        {error}
                    </div>
                )}
                <label className="my-2">Email</label>
                <input
                    className="p-1 rounded-md bg-gray-700 border border-gray-700"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <label className="my-2 mt-5">Password</label>
                <input
                    className="p-1 rounded-md bg-gray-700 border border-gray-700"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button 
                    type="submit"
                    disabled={loading}
                    className={`p-2 mt-10 rounded-md text-black cursor-pointer ${
                        loading 
                            ? 'bg-amber-600/50 cursor-not-allowed' 
                            : 'bg-amber-600 hover:bg-amber-300'
                    }`}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <p className="mt-4 text-center">
                Don't have an account? <a href="/signup" className="text-amber-600 hover:text-amber-300">Sign up</a>
            </p>
        </div>
    );
}