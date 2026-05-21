import { create } from 'zustand';
import { storage } from './mmkv';
import axios from 'axios';
import { useAuthStore } from './authStore';

const LOCAL_ADDONKEY = 'localaddondata';
const JSON_DATAKEY = 'localjsondatakey';
const DB_BASEURL = process.env.EXPO_PUBLIC_DB_BASEURL;

interface Addon {
    title: string;
    description: string;
    logo: string;
    url: string; // The content URL (json link usually)
    type: string;
    source: string; // The URL where this addon was fetched from
    [key: string]: any;
}

interface AddonsState {
    addons: Addon[];
    addonUrls: string[];
    isLoading: boolean;
    isHydrated: boolean;
    loadAddons: (incomingUrls?: string[]) => Promise<void>;
    addAddon: (url: string) => Promise<boolean>;
    removeAddon: (sourceUrl: string) => Promise<void>;
    syncWithBackend: () => Promise<void>;
    fetchAddonsFromBackend: () => Promise<string[] | null>;
}

export const useAddonsStore = create<AddonsState>((set, get) => ({
    addons: [],
    addonUrls: [],
    isLoading: false,
    isHydrated: false,
    fetchAddonsFromBackend: async () => {
        const { user, token } = useAuthStore.getState();
        if (user?.email && user.isPremium && token && token !== 'SKIP_TOKEN123') {
            try {
                const response = await axios.get(`${DB_BASEURL}/get-addons/${user.email}`, { timeout: 5000 });
                if (response.data && Array.isArray(response.data.addons)) {
                    return response.data.addons;
                }
            } catch (e) {
                console.error('Failed to fetch addons from backend', e);
            }
        }
        return null;
    },

    loadAddons: async (incomingUrls?: string[]) => {
        const { user, token } = useAuthStore.getState();
        const isPremium = user?.isPremium && token && token !== 'SKIP_TOKEN123';

        set({ isLoading: true });
        try {
            let urlList: string[] = [];

            if (incomingUrls && incomingUrls.length > 0) {
                urlList = incomingUrls;
            } else if (isPremium) {
                // Try to fetch from backend for premium users to ensure cross-device sync
                try {
                    const response = await axios.get(`${DB_BASEURL}/get-addons/${user.email}`, { timeout: 5000 });
                    if (response.data && Array.isArray(response.data.addons)) {
                        urlList = response.data.addons;
                    }
                } catch (e) {
                    console.warn('Failed to fetch addons from backend, falling back to local storage', e);
                    const urlListString = storage.getString(LOCAL_ADDONKEY);
                    if (urlListString) {
                        urlList = JSON.parse(urlListString);
                    }
                }
            } else {
                // Non-premium or not logged in: load from storage
                const urlListString = storage.getString(LOCAL_ADDONKEY);
                if (urlListString) {
                    urlList = JSON.parse(urlListString);
                }
            }

            // De-duplicate URLs
            urlList = [...new Set(urlList)].filter(url => !!url);

            set({ addonUrls: urlList, isLoading: true }); // Keep loading while fetching manifests
            storage.set(LOCAL_ADDONKEY, JSON.stringify(urlList));

            // ─── Load cached addon data first (instant display) ─────
            const cachedDataString = storage.getString(JSON_DATAKEY);
            let cachedAddons: Addon[] = [];
            if (cachedDataString) {
                try {
                    cachedAddons = JSON.parse(cachedDataString);
                    if (Array.isArray(cachedAddons) && cachedAddons.length > 0) {
                        // Filter out cached addons whose source is no longer in urlList
                        const validCached = cachedAddons.filter(a => urlList.includes(a.source));
                        set({ addons: validCached });
                    }
                } catch (e) {
                    console.error('Failed to parse cached addons', e);
                }
            }

            // ─── Refresh from network ───────────────────────────────
            const fetchedData: Addon[] = [];
            for (const url of urlList) {
                try {
                    const response = await axios.get(url, { timeout: 10000 });
                    const data = response.data;
                    let items = [];
                    const isStremioUrl = url.toLowerCase().endsWith('manifest.json');

                    if (isStremioUrl || (data.id && data.resources && data.catalogs)) {
                        items = [{
                            title: data.name,
                            description: data.description,
                            logo: data.logo,
                            url: url,
                            type: (data.types?.includes('tv') || data.types?.includes('channel')) ? 'livetv' :
                                data.types?.includes('movie') ? 'movie' :
                                    data.types?.includes('series') ? 'series' : 'stremio',
                            id: data.id,
                            manifest: data
                        }];
                    } else {
                        items = Array.isArray(data) ? data : [data];
                    }
                    const sourcedItems = items.map((item: any) => ({ ...item, source: url }));
                    fetchedData.push(...sourcedItems);
                } catch (error) {
                    console.warn(`Failed to fetch addon from ${url}, falling back to cache if available.`, (error as Error).message);
                    const existingForThisUrl = cachedAddons.filter(a => a.source === url);
                    if (existingForThisUrl.length > 0) {
                        fetchedData.push(...existingForThisUrl);
                    }
                }
            }

            // Update state with fresh data
            set({ addons: fetchedData, isLoading: false, isHydrated: true });
            storage.set(JSON_DATAKEY, JSON.stringify(fetchedData));

            // Proactively sync back if we had incomingUrls that might be different from backend
            if (incomingUrls) {
                await get().syncWithBackend();
            }
        } catch (error) {
            console.error('Error in loadAddons:', error);
            set({ isLoading: false, isHydrated: true });
        }
    },

    syncWithBackend: async () => {
        const { addonUrls } = get();
        const { user, token } = useAuthStore.getState();

        // Sync only if user is logged in AND premium
        if (user?.email && user.isPremium && token && token !== 'SKIP_TOKEN123') {
            try {
                await axios.post(`${DB_BASEURL}/sync-addons`, {
                    email: user.email,
                    addons: addonUrls
                });
            } catch (error) {
                console.error('Failed to sync addons with backend', error);
            }
        }
    },

    addAddon: async (url: string) => {
        const { addonUrls, addons, syncWithBackend } = get();

        // Normalize logic
        let finalUrl = url.trim();
        if (!finalUrl.startsWith('http')) {
            const decoded = finalUrl.replace('%2F', '/');
            finalUrl = `https://${decoded}`;
        }

        if (addonUrls.includes(finalUrl)) {
            throw new Error('Addon already exists');
        }

        try {
            const response = await axios.get(finalUrl, { timeout: 8000 });
            const data = response.data;

            let items: any[] = [];
            let isStremio = false;

            const isStremioUrl = finalUrl.toLowerCase().endsWith('manifest.json');
            if (isStremioUrl || (data.id && data.resources && data.catalogs)) {
                // Stremio Manifest
                isStremio = true;
                items = [{
                    title: data.name,
                    description: data.description,
                    logo: data.logo,
                    url: finalUrl, // The manifest URL
                    type: (data.types?.includes('tv') || data.types?.includes('channel')) ? 'livetv' :
                        data.types?.includes('movie') ? 'movie' :
                            data.types?.includes('series') ? 'series' : 'stremio',
                    id: data.id,
                    manifest: data
                }];
            } else {
                items = Array.isArray(data) ? data : [data];
            }

            const sourcedItems = items.map((item: any) => ({ ...item, source: finalUrl }));

            const newAddons = [...addons, ...sourcedItems];
            const newUrls = [...addonUrls, finalUrl];

            set({ addons: newAddons, addonUrls: newUrls });

            storage.set(LOCAL_ADDONKEY, JSON.stringify(newUrls));
            storage.set(JSON_DATAKEY, JSON.stringify(newAddons));

            // Sync with backend if logged in
            await get().syncWithBackend();

            return true;
        } catch (error) {
            throw new Error('Failed to fetch addon: ' + (error as Error).message);
        }
    },

    removeAddon: async (sourceUrl: string) => {
        const { addonUrls, addons, syncWithBackend } = get();
        const newUrls = addonUrls.filter(u => u !== sourceUrl);
        const newAddons = addons.filter(a => a.source !== sourceUrl);

        set({ addons: newAddons, addonUrls: newUrls });
        storage.set(LOCAL_ADDONKEY, JSON.stringify(newUrls));
        storage.set(JSON_DATAKEY, JSON.stringify(newAddons));

        // Sync with backend if logged in
        await syncWithBackend();
    }
}));
