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
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800">
            <h1 className="mb-8 font-bold text-3xl">
                Sign up to <span className="text-amber-300">Crypto Gate</span>
            </h1>
            <form className="flex flex-col w-full max-w-md bg-black p-5 px-10 rounded-xl" onSubmit={handleSignUp}>
                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-md p-3 mb-4">
                        {error}
                    </div>
                )}
                <label className="my-2">Name</label>
                <input
                    className="p-1 rounded-md bg-gray-700 border border-gray-700"
                    value={formData.name}
                    onChange={(e) =>
                        setFormData((prev) => ({
                        ...prev,
                        name: e.target.value
                    }))}
                    required
                />
                <label className="my-2">Email</label>
                <input
                    className="p-1 rounded-md bg-gray-700 border border-gray-700"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                        setFormData((prev) => ({
                        ...prev,
                        email: e.target.value
                    }))}
                    required
                />
                <label className="my-2 mt-5">Password</label>
                <input
                    className="p-1 rounded-md bg-gray-700 border border-gray-700"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({
                        ...prev,
                        password: e.target.value
                    }))}
                    required
                    minLength={6}
                />
                <label className="my-2 mt-5">Confirm Password</label>
                <input
                    className="p-1 rounded-md bg-gray-700 border border-gray-700"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value
                    }))}
                    required
                    minLength={6}
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
                    {loading ? 'Signing up...' : 'Sign up'}
                </button>
            </form>
            <p className="mt-4 text-center">
                Already have an account? <a href="/login" className="text-amber-600 hover:text-amber-300">Login</a>
            </p>
        </div>
    )
}