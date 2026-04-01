import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import axios from 'axios';
import { useAuthStore } from './authStore';

const DB_BASEURL = process.env.EXPO_PUBLIC_DB_BASEURL;

export type FavoriteKind = 'movie' | 'tv' | 'addon' | 'stremio' | 'iptv';

export interface FavoriteItem {
    id: string;
    kind: FavoriteKind;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    tmdbType?: 'movie' | 'tv';
    tmdbId?: string;
    streamUrl?: string;
    headers?: any;
    userAgent?: string;
    referer?: string;
    origin?: string;
    cookie?: string;
    drmkeys?: string;
    drmtype?: string;
    channelId?: string;
    epgUrl?: string;
    browserUrl?: string;
    browserManifest?: string;
    addedAt: number;
}

interface FavoritesState {
    items: FavoriteItem[];
    isLoading: boolean;
    addFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => void;
    removeFavorite: (id: string) => void;
    toggleFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => void;
    isFavorite: (id: string) => boolean;
    clearFavorites: () => void;
    syncWithBackend: () => Promise<void>;
    loadSyncedFavorites: () => Promise<void>;
}

const MAX_FAVORITES = 500;

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set, get) => ({
            items: [],
            isLoading: false,

            syncWithBackend: async () => {
                const { items } = get();
                const { user, token } = useAuthStore.getState();

                if (user?.email && user.isPremium && token && token !== 'SKIP_TOKEN123') {
                    try {
                        await axios.post(`${DB_BASEURL}/sync-favorites`, {
                            email: user.email,
                            favorites: items
                        });
                    } catch (error) {
                        console.error('Failed to sync favorites with backend', error);
                    }
                }
            },

            loadSyncedFavorites: async () => {
                const { user, token } = useAuthStore.getState();
                if (user?.email && user.isPremium && token && token !== 'SKIP_TOKEN123') {
                    set({ isLoading: true });
                    try {
                        const response = await axios.get(`${DB_BASEURL}/get-favorites/${user.email}`);
                        if (response.data && response.data.favorites) {
                            const remoteFavs: FavoriteItem[] = response.data.favorites;
                            const localFavs = get().items;

                            // Create a map for quick lookup and deduplication
                            const favsMap = new Map<string, FavoriteItem>();

                            // Add local ones first
                            localFavs.forEach(item => favsMap.set(item.id, item));

                            // Overlay remote ones (they take precedence or at least ensure they are present)
                            remoteFavs.forEach(item => favsMap.set(item.id, item));

                            const merged = Array.from(favsMap.values())
                                .sort((a, b) => b.addedAt - a.addedAt)
                                .slice(0, MAX_FAVORITES);

                            set({ items: merged });

                            // If merging resulted in different items than remote, sync back to backend
                            const remoteIds = new Set(remoteFavs.map(f => f.id));
                            const needsSyncBack = merged.some(f => !remoteIds.has(f.id)) || merged.length !== remoteFavs.length;

                            if (needsSyncBack) {
                                await axios.post(`${DB_BASEURL}/sync-favorites`, {
                                    email: user.email,
                                    favorites: merged
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Failed to fetch favorites from backend', error);
                    } finally {
                        set({ isLoading: false });
                    }
                }
            },

            addFavorite: (item) => {
                const next: FavoriteItem = { ...item, addedAt: Date.now() };
                set((state) => {
                    const filtered = state.items.filter((existing) => existing.id !== next.id);
                    return { items: [next, ...filtered].slice(0, MAX_FAVORITES) };
                });
                get().syncWithBackend();
            },

            removeFavorite: (id) => {
                set((state) => ({
                    items: state.items.filter((item) => item.id !== id),
                }));
                get().syncWithBackend();
            },

            toggleFavorite: (item) => {
                const exists = get().items.some((existing) => existing.id === item.id);
                if (exists) {
                    get().removeFavorite(item.id);
                } else {
                    get().addFavorite(item);
                }
            },

            isFavorite: (id) => get().items.some((item) => item.id === id),

            clearFavorites: () => {
                set({ items: [] });
                get().syncWithBackend();
            },
        }),
        {
            name: 'favorites-store',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
