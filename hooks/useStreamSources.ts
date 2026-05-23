import { useState, useCallback } from 'react';
import { useAddonsStore } from '@/store/addonsStore';
import { getExternalIds } from '@/services/tmdb';

export interface StreamResult {
    title: string;
    url: string;
    source: string;
    quality?: string;
    type?: string;
    headers?: any;
    userAgent?: string;
}

export function useStreamSources() {
    const { addons } = useAddonsStore();
    const [results, setResults] = useState<StreamResult[]>([]);
    const [loading, setLoading] = useState(false);

    const addResults = (newItems: StreamResult[], cinemaSources: Set<string> = new Set()) => {
        setResults(prev => {
            const combined = [...prev, ...newItems];
            // Deduplicate by URL
            const unique = combined.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);
            return unique.sort((a, b) => {
                const aIsCinema = cinemaSources.has(a.source);
                const bIsCinema = cinemaSources.has(b.source);
                if (aIsCinema === bIsCinema) return 0;
                return aIsCinema ? -1 : 1;
            });
        });
    };

    const searchStreams = useCallback(async (
        query: string,
        tmdbId?: string | number,
        season?: string | number,
        episode?: string | number,
        type: 'movie' | 'tv' | 'rogmovie' = 'movie',
        directUrl?: string,
        movieData?: string,
        serverAddonUrl?: string    // For serveraddon items: direct URL that returns [{title, url, headers}]
    ) => {
        setLoading(true);
        setResults([]);


        //  ──────────────── ROG MOVIE ADDONS ────────────────

        const isMovie = type === 'movie' || type === 'rogmovie';


        //  ────────────────────────  Cinema Addons  ────────────────────────
        const cinemaAddons = addons.filter(addon => addon.type === 'cinema');
        const cinemaSourceNames = new Set(cinemaAddons.map(addon => addon.title));



        // ─── Direct URL / RogMovie handling ──────────────
        if (type === 'rogmovie' && (directUrl || movieData)) {
            try {
                let data;
                if (movieData && movieData !== 'undefined') {
                    data = typeof movieData === 'string' ? JSON.parse(movieData) : movieData;
                } else if (directUrl && directUrl !== 'undefined') {
                    const cleanUrl = directUrl.trim();
                    const response = await fetch(cleanUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36',
                            'Accept': 'application/json'
                        }
                    });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    data = await response.json();
                }

                if (Array.isArray(data)) {
                    const mapped: StreamResult[] = data.map(item => ({
                        title: item.title || 'Unknown',
                        url: item.url,
                        headers: item.headers,
                        source: 'RogMovie',
                        quality: 'HD'
                    }));
                    addResults(mapped, cinemaSourceNames);
                }
            } catch (e) {
                console.error("Failed to fetch rogmovie data:", e, "URL:", directUrl);
            }
        } else if (directUrl) {
            addResults([{
                title: 'Default Server',
                url: directUrl,
                source: 'Addon Provider',
                quality: 'Auto'
            }], cinemaSourceNames);
        }

        // ─── Server Addon: direct stream URL fetch (DesiHub-style) ──────────
        if (serverAddonUrl && serverAddonUrl !== 'undefined' && serverAddonUrl.trim()) {
            try {
                const cleanUrl = serverAddonUrl.trim();
                const res = await fetch(cleanUrl, {
                    headers: { 'Accept': 'application/json' }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        const mapped: StreamResult[] = data
                            .filter((s: any) => s.url)
                            .map((s: any) => ({
                                title: s.title || s.name || 'Stream',
                                url: s.url,
                                headers: s.headers,
                                source: 'Server Addon',
                                quality: s.quality || 'Auto'
                            }));
                        addResults(mapped, cinemaSourceNames);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch serveraddon stream URL:', e);
            }
        }


        // ─── Stremio Addons (movie/series with manifest) ────────
        const stremioAddons = addons.filter(addon => {
            if (!addon.manifest) return false;
            const catalogs = addon.manifest.catalogs || [];
            const types = addon.manifest.types || [];
            const hasMovieCatalog = catalogs.some((c: any) => c.type === 'movie') || types.includes('movie');
            const hasSeriesCatalog = catalogs.some((c: any) => c.type === 'series') || types.includes('series');
            return hasMovieCatalog || hasSeriesCatalog;
        });

        // ─── Resolve IMDb ID if needed for Stremio addons ───────
        let imdbId: string | null = null;
        let isCustomStremioId = false;

        if (stremioAddons.length > 0 && tmdbId) {
            const tmdbStr = String(tmdbId);
            if (tmdbStr.startsWith('tt')) {
                // Already an IMDb ID
                imdbId = tmdbStr;
            } else if (!isNaN(Number(tmdbStr))) {
                // Fetch IMDb ID from TMDB API
                try {
                    const tmdbType = isMovie ? 'movie' : 'tv';
                    const externalIds = await getExternalIds(tmdbType, tmdbStr);
                    imdbId = externalIds.imdb_id || null;
                    console.log(`Resolved TMDb ${tmdbStr} → IMDb ${imdbId}`);
                } catch (err) {
                    console.error('Failed to fetch IMDb ID from TMDB:', err);
                }
            } else {
                // Custom Stremio ID like kisskh:123
                imdbId = tmdbStr;
                isCustomStremioId = true;
            }
        }



        // ─── Fetch from Stremio addons ──────────────────────────
        const stremioPromises = stremioAddons.map(async (addon) => {
            if (!imdbId) return;
            try {
                const baseUrl = addon.url.replace('/manifest.json', '');
                const stremioType = isMovie ? 'movie' : 'series';
                let streamUrl: string;

                if (isMovie) {
                    streamUrl = `${baseUrl}/stream/${stremioType}/${imdbId}.json`;
                } else {
                    // Series: format is imdbId:season:episode
                    if (isCustomStremioId && (season === undefined || episode === undefined || imdbId.includes(':season='))) {
                        // Some custom stream requests might just take imdbId straight or format it differently
                        // But usually Stremio standard is imdbId:season:episode even for custom IDs
                        streamUrl = `${baseUrl}/stream/${stremioType}/${imdbId}.json`;
                    } else {
                        streamUrl = `${baseUrl}/stream/${stremioType}/${imdbId}:${season}:${episode}.json`;
                    }
                }

                console.log(`STREMIO FETCHING: ${streamUrl}`);
                const res = await fetch(streamUrl);
                if (!res.ok) return;

                const data = await res.json();
                const streamList = data.streams || [];

                const mapped: StreamResult[] = streamList
                    .filter((s: any) => s.url)
                    .map((s: any) => {
                        // Extract quality from title if available (e.g. "720p", "1080p")
                        const qualityMatch = s.title?.match(/(\d{3,4}p)/i);
                        return {
                            title: s.title || s.name || 'Stremio Stream',
                            url: s.url,
                            source: s.name || addon.title || 'Stremio',
                            quality: qualityMatch ? qualityMatch[1] : undefined,
                            headers: s.behaviorHints?.proxyHeaders || {},
                        };
                    });

                if (mapped.length > 0) {
                    addResults(mapped, cinemaSourceNames);
                }
            } catch (error) {
                console.error(`Error fetching Stremio streams from ${addon.title}:`, error);
            }
        });



        // ─── Fetch from cinema/mapping addons ───────────────────
        const cinemaPromises = cinemaAddons.map(async (addon) => {
            try {
                console.log(`Checking addon: ${addon.title} (${addon.url})`);
                const response = await fetch(addon.url);
                const json = await response.json();

                if (!Array.isArray(json)) return;

                const firstItem = json[0];
                // Check if this is a mapping addon (has movieurl/tvurl templates)
                if (firstItem && (firstItem.movieurl || firstItem.tvurl)) {
                    // This is a mapping addon, use TMDB if available
                    if (tmdbId) {
                        const mappingPromises = json.map(async (mapping) => {
                            try {
                                const fetchUrl = isMovie
                                    ? mapping.movieurl?.replace('${tmdb}', String(tmdbId))
                                    : mapping.tvurl
                                        ?.replace('${tmdb}', String(tmdbId))
                                        ?.replace('${season}', String(season))
                                        ?.replace('${episode}', String(episode));

                                if (!fetchUrl) return;

                                console.log(`CINEMA FETCHING: ${fetchUrl}`);
                                const res = await fetch(fetchUrl);
                                if (!res.ok) return;

                                const sourceData = await res.json();
                                if (Array.isArray(sourceData)) {
                                    const mapped = sourceData.map(item => ({
                                        title: item[mapping.title || 'title'] || item.title || 'Unknown',
                                        url: item[mapping.url || 'url'] || item.url,
                                        type: item[mapping.type || 'type'] || item.type,
                                        headers: item.headers || {},
                                        source: addon.title
                                    }));
                                    addResults(mapped, cinemaSourceNames);
                                }
                            } catch (err) {
                                console.error(`Error fetching streams from ${addon.title} mapping:`, err);
                            }
                        });
                        await Promise.all(mappingPromises);
                    }
                } else {
                    // This is a direct content list or search result list
                    const filtered = json.filter((item: any) =>
                        item.title && String(item.title).toLowerCase().includes(String(query).toLowerCase())
                    );
                    const mapped = filtered.map((item: any) => ({
                        ...item,
                        source: addon.title
                    }));
                    addResults(mapped, cinemaSourceNames);
                }
            } catch (error) {
                console.error(`Error fetching from ${addon.title}:`, error);
            }
        });

        await Promise.allSettled([...stremioPromises, ...cinemaPromises]);
        setLoading(false);
    }, [addons]);

    return { results, loading, searchStreams };
}
