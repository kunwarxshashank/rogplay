import axios from 'axios';

const API_KEY = process.env.EXPO_PUBLIC_TMDB_APIKEY;
const PROXY_URL = process.env.EXPO_PUBLIC_TMDB_PROXYURL;
const BASE_URL = process.env.EXPO_PUBLIC_TMDB_BASEURL;

const tmdbApi = axios.create({
    baseURL: PROXY_URL ? PROXY_URL : BASE_URL,
    params: {
        api_key: API_KEY,
    },
});

const rawGet = (url: string, options?: any) => tmdbApi.get(url, options);

const CACHE_TTL = 1000 * 60 * 2; // 2 minutes
const cache = new Map<string, { expires: number; data: any }>();

const makeCacheKey = (url: string, params?: any) => `${url}|${JSON.stringify(params || {})}`;

const cachedGet = async (url: string, options?: { params?: any; cacheTTL?: number }) => {
    const params = options?.params;
    const ttl = options?.cacheTTL ?? CACHE_TTL;
    const key = makeCacheKey(url, params);
    const now = Date.now();

    const cached = cache.get(key);
    if (cached && cached.expires > now) {
        return { data: cached.data };
    }

    const response = await rawGet(url, { params });
    cache.set(key, { data: response.data, expires: now + ttl });
    return response;
};

// Add response interceptor for retry logic
// Logging is limited to development to avoid performance impact in production.
tmdbApi.interceptors.response.use(
    (response) => {
        if (__DEV__) {
            console.log(`TMDB API Success: ${response.config.url}`, response.data.results?.length || 0, 'items');
        }
        return response;
    },
    async (error) => {
        const config = error.config;

        // If the request failed and we were using the proxy, retry with the base TMDB URL
        if (config && PROXY_URL && config.baseURL === PROXY_URL && !(config as any)._retry) {
            (config as any)._retry = true;
            if (__DEV__) {
                console.warn(`TMDB Proxy failed (${error.message}), retrying with BASE_URL: ${config.url}`);
            }

            // Update baseURL to the direct TMDB API
            config.baseURL = BASE_URL;

            // Use the same axios instance to retry the request
            return tmdbApi(config);
        }

        if (__DEV__) {
            console.error('TMDB API Error:', error.config?.url, error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
        }
        return Promise.reject(error);
    }
);

export const getTrending = async (timeWindow: 'day' | 'week' = 'week', page: number = 1) => {
    const response = await cachedGet(`/trending/all/${timeWindow}`, { params: { page } });
    return response.data;
};

export const getPopularMovies = async (page: number = 1) => {
    const response = await cachedGet('/movie/popular', { params: { page } });
    return response.data;
};

export const getPopularTV = async (page: number = 1) => {
    const response = await cachedGet('/tv/popular', { params: { page } });
    return response.data;
};

export const searchMulti = async (query: string) => {
    const response = await cachedGet('/search/multi', {
        params: { query },
    });
    // Filter for only movies and tv shows, then sort by popularity descending
    const results = (response.data.results || []).filter((item: any) =>
        item.media_type === 'movie' || item.media_type === 'tv'
    );
    return results.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));
};

export const getDetails = async (type: 'movie' | 'tv', id: number | string) => {
    let tmdbId = id;
    if (String(id).startsWith('tt')) {
        try {
            const findRes = await cachedGet(`/find/${id}`, { params: { external_source: 'imdb_id' } });
            const results = type === 'movie' ? findRes.data.movie_results : findRes.data.tv_results;
            if (results && results.length > 0) {
                tmdbId = results[0].id;
            }
        } catch (e) {
            console.error('Failed to resolve IMDb ID to TMDB ID:', e);
        }
    }

    const response = await cachedGet(`/${type}/${tmdbId}`, {
        params: {
            append_to_response: 'credits,videos,similar',
        },
    });
    return response.data;
};

export const getExternalIds = async (type: 'movie' | 'tv', id: number | string) => {
    const response = await cachedGet(`/${type}/${id}/external_ids`);
    return response.data;
};

export const getSeasonDetails = async (tvId: number | string, seasonNumber: number) => {
    let tmdbId = tvId;
    if (String(tvId).startsWith('tt')) {
        try {
            const findRes = await cachedGet(`/find/${tvId}`, { params: { external_source: 'imdb_id' } });
            if (findRes.data.tv_results && findRes.data.tv_results.length > 0) {
                tmdbId = findRes.data.tv_results[0].id;
            }
        } catch (e) {
            console.error('Failed to resolve IMDb ID to TMDB ID for season:', e);
        }
    }
    const response = await cachedGet(`/tv/${tmdbId}/season/${seasonNumber}`);
    return response.data;
};

export const getMoviesByProvider = async (providerId: number, page: number = 1) => {
    const response = await cachedGet(`/discover/movie`, {
        params: {
            with_watch_providers: providerId,
            watch_region: 'US',
            sort_by: 'popularity.desc',
            page
        }
    });
    return response.data.results;
};

export const getTVByProvider = async (providerId: number, page: number = 1) => {
    const response = await cachedGet(`/discover/tv`, {
        params: {
            with_watch_providers: providerId,
            watch_region: 'US',
            sort_by: 'popularity.desc',
            page
        }
    });
    return response.data.results;
}

export const getLatestMovies = async (page: number = 1) => {
    const response = await cachedGet('/discover/movie', {
        params: {
            sort_by: 'primary_release_date.desc',
            'vote_count.gte': 50,
            'primary_release_date.lte': new Date().toISOString().split('T')[0],
            with_original_language: 'en',
            page
        }
    });
    return response.data;
};

export const getOnAirTV = async (page: number = 1) => {
    const response = await cachedGet('/tv/on_the_air', {
        params: {
            timezone: 'America/New_York',
            page
        }
    });
    return response.data;
};

export const getAnime = async (page: number = 1) => {
    const response = await cachedGet('/discover/tv', {
        params: {
            with_genres: 16,
            with_original_language: 'ja',
            sort_by: 'popularity.desc',
            page
        }
    });
    return response.data;
};

export const getBollywoodMovies = async (page: number = 1) => {
    const response = await cachedGet('/discover/movie', {
        params: {
            with_original_language: 'hi',
            sort_by: 'popularity.desc',
            watch_region: 'IN',
            page
        }
    });
    return response.data;
};

export const getKDrama = async (page: number = 1) => {
    const response = await cachedGet('/discover/tv', {
        params: {
            with_original_language: 'ko',
            sort_by: 'popularity.desc',
            page
        }
    });
    return response.data;
};

export const getGenres = async (type: 'movie' | 'tv') => {
    const response = await cachedGet(`/genre/${type}/list`);
    return response.data.genres;
};

export const getLanguages = async () => {
    const response = await cachedGet('/configuration/languages');
    return response.data;
};

export const getCountries = async () => {
    const response = await cachedGet('/configuration/countries');
    return response.data;
};

export const discoverContent = async (type: 'movie' | 'tv', filters: any) => {
    const params: any = {
        page: filters.page || 1,
        sort_by: filters.sort_by || 'popularity.desc',
    };

    if (filters.genre) params.with_genres = filters.genre;
    if (filters.year) {
        if (type === 'movie') {
            params.primary_release_year = filters.year;
        } else {
            params.first_air_date_year = filters.year;
        }
    }
    if (filters.rating) params['vote_average.gte'] = filters.rating;
    if (filters.language) params.with_original_language = filters.language;
    if (filters.country) params.region = filters.country;

    const response = await cachedGet(`/discover/${type}`, { params });
    return response.data;
};

export const discoverAllContent = async (filters: any) => {
    const page = filters.page || 1;
    const [movies, tv] = await Promise.all([
        discoverContent('movie', { ...filters, page }),
        discoverContent('tv', { ...filters, page })
    ]);

    const combined = [
        ...(movies.results || []).map((m: any) => ({ ...m, media_type: 'movie' })),
        ...(tv.results || []).map((t: any) => ({ ...t, media_type: 'tv' }))
    ];

    // Interleave or sort by popularity
    combined.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    return {
        results: combined,
        page,
        total_pages: Math.max(movies.total_pages || 0, tv.total_pages || 0),
        total_results: (movies.total_results || 0) + (tv.total_results || 0)
    };
};

export const PROVIDERS = {
    NETFLIX: 8,
    AMAZON: 9,
    HULU: 15,
    DISNEY: 390,
    PEACOCK: 386,
    APPLETV: 350,
    HBOMAX: 118,
    ZEE5: 232,
    PARAMOUNT: 531
};
