import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);
        
        if (!token) {
            router.push('/login');
        }
    }, [router]);

    const login = (token: string, merchant:string) => {
        localStorage.setItem('token', token);
        localStorage.setItem('merchantInfo', merchant);
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('merchantInfo');
        setIsAuthenticated(false);
        router.push('/login');
    };

    return { isAuthenticated, login, logout };
};
