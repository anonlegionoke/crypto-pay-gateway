import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const AUTH_STORAGE_KEY = 'token';
const MERCHANT_STORAGE_KEY = 'merchantInfo';
const AUTH_EVENT = 'auth-changed';

export const useAuth = (requireAuth: boolean = true) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const router = useRouter();

    useEffect(() => {
        const syncAuthState = () => {
            const token = localStorage.getItem(AUTH_STORAGE_KEY);
            setIsAuthenticated(!!token);

            if (!token && requireAuth) {
                router.push('/login');
            }
        };

        syncAuthState();

        const handleStorage = (event: StorageEvent) => {
            if (!event.key || event.key === AUTH_STORAGE_KEY || event.key === MERCHANT_STORAGE_KEY) {
                syncAuthState();
            }
        };

        const handleAuthChanged = () => {
            syncAuthState();
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener(AUTH_EVENT, handleAuthChanged);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener(AUTH_EVENT, handleAuthChanged);
        };
    }, [requireAuth, router]);

    const login = (token: string, merchant:string) => {
        localStorage.setItem(AUTH_STORAGE_KEY, token);
        localStorage.setItem(MERCHANT_STORAGE_KEY, merchant);
        setIsAuthenticated(true);
        window.dispatchEvent(new Event(AUTH_EVENT));
    };

    const logout = () => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(MERCHANT_STORAGE_KEY);
        setIsAuthenticated(false);
        window.dispatchEvent(new Event(AUTH_EVENT));
        router.push('/login');
    };

    return { isAuthenticated, login, logout };
};
