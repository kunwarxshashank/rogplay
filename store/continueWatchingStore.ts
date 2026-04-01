import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ContinueWatchingItem = {
    id: string;
    sourceType: 'cinema';
    url: string;
    title: string;
    headers?: any;
    userAgent?: string;
    referer?: string;
    origin?: string;
    cookie?: string;
    drmkeys?: string;
    drmtype?: string;
    poster?: string;
    backdrop?: string;
    contentType?: 'movie' | 'tv';
    tmdbId?: string;
    season?: string;
    episode?: string;
    positionMs: number;
    durationMs: number;
    updatedAt: number;
};

interface ContinueWatchingState {
    items: ContinueWatchingItem[];
    upsertItem: (item: Omit<ContinueWatchingItem, 'updatedAt'>) => void;
    removeItem: (id: string) => void;
    clearAll: () => void;
}

const MAX_ITEMS = 25;

export const buildContinueWatchingId = (
    url: string,
    contentType?: string,
    tmdbId?: string,
    season?: string,
    episode?: string
) => {
    if (contentType && tmdbId) {
        return `${contentType}:${tmdbId}:${season || '0'}:${episode || '0'}`;
    }
    return `url:${url}`;
};

export const useContinueWatchingStore = create<ContinueWatchingState>()(
    persist(
        (set) => ({
            items: [],

            upsertItem: (item) =>
                set((state) => {
                    const next = { ...item, updatedAt: Date.now() };
                    const filtered = state.items.filter(existing => existing.id !== next.id);
                    return { items: [next, ...filtered].slice(0, MAX_ITEMS) };
                }),

            removeItem: (id) =>
                set((state) => ({
                    items: state.items.filter(item => item.id !== id),
                })),

            clearAll: () => set({ items: [] }),
        }),
        {
            name: 'continue-watching-store',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
