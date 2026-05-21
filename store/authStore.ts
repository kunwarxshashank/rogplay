import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './mmkv';
interface User {
    id: string;
    name: string;
    email: string;
    isPremium: boolean;
    validity?: number;
    profilepic?: string;
    subscriptionEnd?: string;
    subscriptionStart?: string;
    addons?: string[];
}

interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean; // Add reactive property
    setAuth: (token: string, user: User) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            isAuthenticated: false,
            setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
            logout: () => set({ token: null, user: null, isAuthenticated: false }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => zustandStorage),
        }
    )
);
