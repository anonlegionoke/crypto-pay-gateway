"use client"

import { useState } from "react"
import axios from 'axios'
import { useRouter } from 'next/navigation'

export default function Signup() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        
        try {
            const requestData = {
                email: formData.email,
                password: formData.password,
                name: formData.name,
            };

            const response = await axios.post('/api/merchant/signup', requestData);
            
            if (response.data?.merchant) {
                router.push('/login');
            } else {
                setError('Invalid response from server');
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.message || 'Signup failed');
            } else {
                setError('An unexpected error occurred');
                console.error(error);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-gray-100 dark:to-gray-900 text-foreground transition-colors duration-300 p-4">
            <h1 className="mb-8 font-bold text-4xl text-center">
                Sign up to <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Crypto Gate</span>
            </h1>
            <form className="flex flex-col w-full max-w-md bg-white/70 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-2xl p-8 rounded-2xl" onSubmit={handleSignUp}>
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 rounded-lg p-4 mb-6 text-sm font-medium">
                        {error}
                    </div>
                )}
                
                <div className="flex flex-col mb-4">
                    <label className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Name</label>
                    <input
                        className="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        value={formData.name}
                        onChange={(e) =>
                            setFormData((prev) => ({
                            ...prev,
                            name: e.target.value
                        }))}
                        required
                        placeholder="John Doe"
                    />
                </div>

                <div className="flex flex-col mb-4">
                    <label className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Email</label>
                    <input
                        className="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                            setFormData((prev) => ({
                            ...prev,
                            email: e.target.value
                        }))}
                        required
                        placeholder="you@example.com"
                    />
                </div>

                <div className="flex flex-col mb-4">
                    <label className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
                    <input
                        className="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            password: e.target.value
                        }))}
                        required
                        minLength={6}
                        placeholder="••••••••"
                    />
                </div>

                <div className="flex flex-col mb-6">
                    <label className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Confirm Password</label>
                    <input
                        className="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value
                        }))}
                        required
                        minLength={6}
                        placeholder="••••••••"
                    />
                </div>

                <button 
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 mt-2 rounded-lg font-bold text-black transition-all transform active:scale-95 ${
                        loading 
                            ? 'bg-amber-600/50 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg hover:shadow-amber-500/25'
                    }`}
                >
                    {loading ? 'Signing up...' : 'Sign up'}
                </button>
            </form>
            <p className="mt-8 text-center text-gray-600 dark:text-gray-400">
                Already have an account? <a href="/login" className="text-amber-600 font-semibold hover:text-amber-500 transition-colors">Login</a>
            </p>
        </div>
    );
}