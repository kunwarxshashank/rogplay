import { create } from 'zustand';
import { storage } from './mmkv';
import axios from 'axios';
import { useAuthStore } from './authStore';

const LOCAL_ADDONKEY = 'localaddondata';
const JSON_DATAKEY = 'localjsondatakey';
const DB_BASEURL = process.env.EXPO_PUBLIC_DB_BASEURL;

// ─── Built-in TMDB Addon (pre-installed, not user-removable) ─────────────────
export const TMDB_BUILTIN_SOURCE = 'https://raw.githubusercontent.com/kunwarxshashank/rogplay_addons/refs/heads/main/cinema/tmdbaddon.json';

const TMDB_BUILTIN_MANIFEST = {
    version: '2.0',
    author: 'Rogplay',
    title: 'TMDB Addon',
    addontype: 'tmdbaddon',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGqGbl0chqcCZsISHPH6Q6SwHeArKfi4gDfg&s',
    url: 'https://web.rogplay.app',
    description: 'Official TMDB Addon to fetch Movie, Series Catalog',
    resources: ['catalog'],
    types: ['series', 'movie'],
    idPrefixes: ['tmdb', 'tt'],
    settings: [{ showfilter: true, showottsection: true, showslider: true }],
    slidercatalog: {
        url: 'https://web.rogplay.app/api/tmdb/tv/popular?api_key=05902896074695709d7763505bb88b4d&language=en-US&page=1',
    },
    catalogs: [
        {
            type: 'movie', name: 'Trending Movie',
            url: 'https://web.rogplay.app/api/tmdb/trending/movie/day?api_key=05902896074695709d7763505bb88b4d&language=en-US&page=1',
            ispagination: true,
            paginationurl: 'https://web.rogplay.app/api/tmdb/trending/movie/day?api_key=05902896074695709d7763505bb88b4d&language=en-US&page=${page}',
        },
        {
            type: 'series', name: 'Trending Series',
            url: 'https://web.rogplay.app/api/tmdb/trending/tv/day?api_key=05902896074695709d7763505bb88b4d&language=en-US&page=1',
            ispagination: true,
            paginationurl: 'https://web.rogplay.app/api/tmdb/trending/tv/day?api_key=05902896074695709d7763505bb88b4d&language=en-US&page=${page}',
        },
        {
            type: 'movie', name: 'Bollywood',
            url: 'https://web.rogplay.app/api/tmdb/discover/movie?api_key=05902896074695709d7763505bb88b4d&language=en-US&page=1&with_original_language=hi&sort_by=popularity.desc',
            ispagination: true,
            paginationurl: 'https://web.rogplay.app/api/tmdb/discover/movie?api_key=05902896074695709d7763505bb88b4d&language=en-US&page=${page}&with_original_language=hi&sort_by=popularity.desc',
        },
        {
            type: 'series', name: 'Trending Anime',
            url: 'https://web.rogplay.app/api/tmdb/discover/tv?api_key=05902896074695709d7763505bb88b4d&language=en-US&page=1&with_genres=16&with_original_language=ja&sort_by=popularity.desc',
            ispagination: true,
            paginationurl: 'https://web.rogplay.app/api/tmdb/discover/tv?api_key=05902896074695709d7763505bb88b4d&language=en-US&page=${page}&with_genres=16&with_original_language=ja&sort_by=popularity.desc',
        },
        {
            type: 'series', name: 'K-Drama',
            url: 'https://web.rogplay.app/api/tmdb/discover/tv?api_key=05902896074695709d7763505bb88b4d&language=en-US&page=1&with_original_language=ko&sort_by=popularity.desc',
            ispagination: true,
            paginationurl: 'https://web.rogplay.app/api/tmdb/discover/tv?api_key=05902896074695709d7763505bb88b4d&language=en-US&page=${page}&with_original_language=ko&sort_by=popularity.desc',
        },
    ],
    searchcatalog: [
        {
            name: 'Search Result',
            searchurl: 'https://web.rogplay.app/api/tmdb/search/multi?api_key=05902896074695709d7763505bb88b4d&language=en-US&query=${search}&page=1&include_adult=false',
            ispagination: true,
            paginationurl: 'https://web.rogplay.app/api/tmdb/search/multi?api_key=05902896074695709d7763505bb88b4d&language=en-US&query=${search}&page=${page}&include_adult=false',
        },
    ],
};

const TMDB_BUILTIN_ADDON = {
    title: 'TMDB Addon',
    description: 'Official TMDB Addon to fetch Movie, Series Catalog',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGqGbl0chqcCZsISHPH6Q6SwHeArKfi4gDfg&s',
    url: TMDB_BUILTIN_SOURCE,
    type: 'cinema',
    source: TMDB_BUILTIN_SOURCE,
    id: 'tmdb-builtin',
    addontype: 'tmdbaddon',
    isBuiltin: true,
    manifest: TMDB_BUILTIN_MANIFEST,
};

// ─── Built-in OpenSubtitle Addon ──────────────────────────────────────────────
export const OPENSUBTITLE_SOURCE = 'opensubtitle-builtin';

const OPENSUBTITLE_MANIFEST = {
    version: '1.0',
    author: 'Rogplay',
    title: 'Open Subtitle',
    addontype: 'tmdbaddon',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTutB52P1LGb2PvAjcwn-dU3V0AntVwpRMmFQ&s',
    url: 'https://web.rogplay.app',
    description: 'Official OpenSubtitle Addon to fetch subtitles for movies & series',
    types: ['series', 'movie'],
    idPrefixes: ['tmdb', 'tt'],
    subtitles: {
        movie: [
            'https://sub.vdrk.site/v2/movie/${tmdbid}',
            'https://opensubtitles-v3.strem.io/subtitles/movie/${imdbid}/videoSize=1105954079.json',
        ],
        series: [
            'https://opensubtitles-v3.strem.io/subtitles/series/${imdbid}:${season}:${episode}/videoSize=1105954079.json',
            'https://sub.vdrk.site/v2/tv/${tmdbid}/${season}/${episode}',
        ],
    },
};

const OPENSUBTITLE_ADDON = {
    title: 'Open Subtitle',
    description: 'Official OpenSubtitle Addon to fetch subtitles for movies & series',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTutB52P1LGb2PvAjcwn-dU3V0AntVwpRMmFQ&s',
    url: OPENSUBTITLE_SOURCE,
    type: 'subtitles',
    source: OPENSUBTITLE_SOURCE,
    id: 'opensubtitle-builtin',
    addontype: 'tmdbaddon',
    isBuiltin: true,
    manifest: OPENSUBTITLE_MANIFEST,
};

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
    activeCinemaAddon: string | null;
    isLoading: boolean;
    isHydrated: boolean;
    loadAddons: (incomingUrls?: string[]) => Promise<void>;
    addAddon: (url: string) => Promise<boolean>;
    removeAddon: (sourceUrl: string) => Promise<void>;
    setActiveCinemaAddon: (url: string) => void;
    syncWithBackend: () => Promise<void>;
    fetchAddonsFromBackend: () => Promise<string[] | null>;
}

const ACTIVE_CINEMA_KEY = 'activecinemadata';

export const useAddonsStore = create<AddonsState>((set, get) => ({
    addons: [],
    addonUrls: [],
    activeCinemaAddon: null,
    isLoading: false,
    isHydrated: false,
    setActiveCinemaAddon: (url: string) => {
        set({ activeCinemaAddon: url });
        storage?.set(ACTIVE_CINEMA_KEY, url);
    },
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

        const storedActiveCinema = storage?.getString(ACTIVE_CINEMA_KEY);
        if (storedActiveCinema && !get().activeCinemaAddon) {
            set({ activeCinemaAddon: storedActiveCinema });
        }

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

            // ─── Refresh from network (parallel with concurrency limit) ──
            const fetchedData: Addon[] = [];
            const CONCURRENCY = 4;

            const processAddonUrl = async (url: string) => {
                try {
                    const response = await axios.get(url, { timeout: 10000 });
                    const data = response.data;
                    let items = [];
                    const isStremioUrl = url.toLowerCase().endsWith('manifest.json');

                    // Music addons use Stremio-like manifest format — check addontype first, else check name/title
                   if (data.addontype === 'music' || (data.name && data.name.toLowerCase().includes("music")) || (data.title && data.title.toLowerCase().includes("music"))) {
                        items = [{
                            title: data.name || data.title,
                            description: data.description,
                            logo: data.logo,
                            url: url,
                            type: 'music',
                            id: data.id || url,
                            manifest: data
                        }];
                    } else if (isStremioUrl || (data.id && data.resources && data.catalogs)) {
                        items = [{
                            title: data.name || data.title,
                            description: data.description,
                            logo: data.logo,
                            url: url,
                            type: (data.types?.includes('tv') || data.types?.includes('channel')) ? 'livetv' :
                                data.types?.includes('movie') ? 'movie' :
                                    data.types?.includes('series') ? 'series' : 'stremio',
                            id: data.id,
                            manifest: data
                        }];
                    } else if (data.addontype === 'tmdbaddon' || data.addontype === 'serveraddon') {
                        items = [{
                            title: data.title || data.name,
                            description: data.description,
                            logo: data.logo,
                            url: url,
                            type: 'cinema',
                            id: data.id || url,
                            manifest: data
                        }];
                    } else {
                        items = Array.isArray(data) ? data : [data];
                        items = items.map(ite => ({ ...ite, title: ite.title || ite.name }));
                    }
                    const sourcedItems = items.map((item: any) => ({ ...item, source: url }));
                    return sourcedItems;
                } catch (error) {
                    console.warn(`Failed to fetch addon from ${url}, falling back to cache if available.`, (error as Error).message);
                    const existingForThisUrl = cachedAddons.filter(a => a.source === url);
                    return existingForThisUrl;
                }
            };

            // Run with concurrency limit
            for (let i = 0; i < urlList.length; i += CONCURRENCY) {
                const batch = urlList.slice(i, i + CONCURRENCY);
                const results = await Promise.allSettled(batch.map(processAddonUrl));
                for (const result of results) {
                    if (result.status === 'fulfilled' && result.value.length > 0) {
                        fetchedData.push(...result.value);
                    }
                }
            }

            // ─── Always prepend built-in addons (not in urlList, never cached) ───
            const withBuiltin = [
                TMDB_BUILTIN_ADDON,
                OPENSUBTITLE_ADDON,
                ...fetchedData.filter(a => a.source !== TMDB_BUILTIN_SOURCE && a.source !== OPENSUBTITLE_SOURCE),
            ];

            // Auto-select TMDB if no active cinema addon is set
            const currentActive = get().activeCinemaAddon;
            const storedActive = storage?.getString(ACTIVE_CINEMA_KEY);
            if (!currentActive && !storedActive) {
                set({ activeCinemaAddon: TMDB_BUILTIN_SOURCE });
                storage?.set(ACTIVE_CINEMA_KEY, TMDB_BUILTIN_SOURCE);
            }

            // Update state with fresh data
            set({ addons: withBuiltin, isLoading: false, isHydrated: true });
            storage.set(JSON_DATAKEY, JSON.stringify(fetchedData)); // Only cache user addons

            // Proactively sync back if we had incomingUrls that might be different from backend
            if (incomingUrls) {
                get().syncWithBackend();
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
        const { addonUrls, addons } = get();

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
            if (data.addontype === 'music' || (data.name && data.name.toLowerCase().includes('music')) || (data.title && data.title.toLowerCase().includes('music'))) {
                // Music addons use Stremio-like manifest format — check addontype/name first
                items = [{
                    title: data.name || data.title,
                    description: data.description,
                    logo: data.logo,
                    url: finalUrl,
                    type: 'music',
                    id: data.id || finalUrl,
                    manifest: data
                }];
            } else if (isStremioUrl || (data.id && data.resources && data.catalogs)) {
                // Stremio Manifest
                isStremio = true;
                items = [{
                    title: data.name || data.title,
                    description: data.description,
                    logo: data.logo,
                    url: finalUrl,
                    type: (data.types?.includes('tv') || data.types?.includes('channel')) ? 'livetv' :
                        data.types?.includes('movie') ? 'movie' :
                            data.types?.includes('series') ? 'series' : 'stremio',
                    id: data.id,
                    manifest: data
                }];
            } else if (data.addontype === 'tmdbaddon' || data.addontype === 'serveraddon') {
                items = [{
                    title: data.title || data.name,
                    description: data.description,
                    logo: data.logo,
                    url: finalUrl,
                    type: 'cinema',
                    id: data.id || finalUrl,
                    manifest: data
                }];
            } else {
                items = Array.isArray(data) ? data : [data];
                items = items.map(ite => ({ ...ite, title: ite.title || ite.name }));
            }

            const sourcedItems = items.map((item: any) => ({ ...item, source: finalUrl }));

            const newAddons = [...addons, ...sourcedItems];
            const newUrls = [...addonUrls, finalUrl];

            set({ addons: newAddons, addonUrls: newUrls });

            storage.set(LOCAL_ADDONKEY, JSON.stringify(newUrls));
            storage.set(JSON_DATAKEY, JSON.stringify(newAddons));

            // Sync with backend if logged in
            get().syncWithBackend();

            return true;
        } catch (error) {
            throw new Error('Failed to fetch addon: ' + (error as Error).message);
        }
    },

    removeAddon: async (sourceUrl: string) => {
        // Protect the built-in addons from removal
        if (sourceUrl === TMDB_BUILTIN_SOURCE || sourceUrl === OPENSUBTITLE_SOURCE) {
            console.warn('Cannot remove built-in addon');
            return;
        }
        const { addonUrls, addons } = get();
        const newUrls = addonUrls.filter(u => u !== sourceUrl);
        const newAddons = addons.filter(a => a.source !== sourceUrl);

        set({ addons: newAddons, addonUrls: newUrls });
        storage.set(LOCAL_ADDONKEY, JSON.stringify(newUrls));
        storage.set(JSON_DATAKEY, JSON.stringify(newAddons));

        // Sync with backend if logged in
        get().syncWithBackend();
    }
}));
