import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAddonsStore } from '@/store/addonsStore';
import { usePluginsStore } from '@/store/pluginsStore';
import { executeNuvioPlugin } from '@/services/pluginEngine';
import { getExternalIds } from '@/services/tmdb';
import { analyzeAndSortStreams, StreamResultWithHealth } from '@/services/streamHealthEngine';
import type { HealthInfo } from '@/services/streamHealthEngine';

export interface StreamResult {
    title: string;
    url: string; // For torrents, this could be the magnet link temporarily
    source: string;
    quality?: string;
    type?: string;
    headers?: any;
    userAgent?: string;
    isTorrent?: boolean;
    magnetLink?: string;
}

// ─── Progressive health check helper ─────────────────────────────────
// Takes a small batch of newly scraped streams, health-checks them,
// then merges + sorts them into the existing results array.
async function healthCheckAndMerge(
    newStreams: StreamResult[],
    existingRef: React.MutableRefObject<StreamResultWithHealth[]>,
    setResults: React.Dispatch<React.SetStateAction<StreamResultWithHealth[]>>,
    signal?: AbortSignal,
): Promise<void> {
    if (!newStreams.length || signal?.aborted) return;

    // Health-check this small batch (concurrency = batch size, they're already small)
    const checked = await analyzeAndSortStreams(newStreams, {
        signal,
        batchSize: newStreams.length,
    });

    if (signal?.aborted) return;

    // Merge into existing results, deduplicate by URL
    const merged = [...existingRef.current];
    for (const item of checked) {
        if (!merged.some(m => m.url === item.url)) {
            merged.push(item);
        }
    }

    // Sort: Alive (by score desc) → Unchecked → Dead
    merged.sort((a, b) => {
        const getStatus = (x: StreamResultWithHealth) => {
            if (!x.healthInfo) return 1;
            if (x.healthInfo.isAlive) return 2;
            return 0;
        };
        const sa = getStatus(a);
        const sb = getStatus(b);
        if (sa !== sb) return sb - sa;
        if (sa === 1) return 0;
        return (b.healthInfo?.score || 0) - (a.healthInfo?.score || 0);
    });

    existingRef.current = merged;
    setResults([...merged]);
}

/**
 * Runs an array of async tasks with a concurrency limit.
 * As soon as one task finishes, the next one starts — keeps N slots busy.
 */
async function runWithConcurrency(
    tasks: (() => Promise<void>)[],
    limit: number,
    signal?: AbortSignal,
): Promise<void> {
    let index = 0;

    const runNext = async (): Promise<void> => {
        while (index < tasks.length) {
            if (signal?.aborted) return;
            const currentIndex = index++;
            await tasks[currentIndex]();
        }
    };

    // Launch `limit` workers that each pull from the task queue
    const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => runNext());
    await Promise.all(workers);
}

const streamCache = new Map<string, StreamResultWithHealth[]>();

export function useStreamSources() {
    const addons = useAddonsStore(s => s.addons);
    const scrapers = usePluginsStore(s => s.scrapers);
    const enabledScrapers = useMemo(() => scrapers.filter(sc => sc.enabled && sc.rawCode), [scrapers]);
    const [results, setResults] = useState<StreamResultWithHealth[]>([]);
    const [loading, setLoading] = useState(true);
    const [healthChecking, setHealthChecking] = useState(false);
    const [healthProgress, setHealthProgress] = useState({ checked: 0, total: 0 });
    const [currentLog, setCurrentLog] = useState<string>('');
    const abortRef = useRef<AbortController | null>(null);

    // Mutable ref that always points to the latest merged results so
    // concurrent scrapers can safely read the most current list.
    const resultsRef = useRef<StreamResultWithHealth[]>([]);

    // Track how many sources we've health-checked for progress UI
    const checkedCountRef = useRef(0);
    const totalCountRef = useRef(0);

    // Cleanup AbortController on unmount
    useEffect(() => {
        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
        };
    }, []);

    /**
     * Called by each scraper when it produces results.
     * Health-checks the batch immediately, then merges into the UI.
     */
    const pushResults = useCallback(async (
        newItems: StreamResult[],
        signal?: AbortSignal,
    ) => {
        if (!newItems.length || signal?.aborted) return;

        totalCountRef.current += newItems.length;
        setHealthProgress(prev => ({ ...prev, total: totalCountRef.current }));

        await healthCheckAndMerge(newItems, resultsRef, setResults, signal);

        checkedCountRef.current += newItems.length;
        setHealthProgress({ checked: checkedCountRef.current, total: totalCountRef.current });
    }, []);

    const searchStreams = useCallback(async (
        query: string,
        tmdbId?: string | number,
        season?: string | number,
        episode?: string | number,
        type: 'movie' | 'tv' | 'rogmovie' = 'movie',
        directUrl?: string,
        movieData?: string,
        serverAddonUrl?: string
    ) => {
        if (!query && !tmdbId && !directUrl && !movieData && !serverAddonUrl) {
            setLoading(false);
            setHealthChecking(false);
            return;
        }

        const cacheKey = `${tmdbId}-${season}-${episode}-${type}-${directUrl || ''}-${serverAddonUrl || ''}`;
        if (streamCache.has(cacheKey)) {
            const cached = streamCache.get(cacheKey)!;
            setResults(cached);
            resultsRef.current = cached;
            setLoading(false);
            setHealthChecking(false);
            return;
        }

        // Cancel previous request
        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;
        const signal = controller.signal;

        setLoading(true);
        setResults([]);
        resultsRef.current = [];
        checkedCountRef.current = 0;
        totalCountRef.current = 0;
        setHealthChecking(true);
        setHealthProgress({ checked: 0, total: 0 });
        setCurrentLog('');

        const isMovie = type === 'movie' || type === 'rogmovie';

        // ─── Direct URL / RogMovie handling ──────────────
        if (type === 'rogmovie' && (directUrl || movieData)) {
            try {
                let data;
                if (movieData && movieData !== 'undefined') {
                    data = typeof movieData === 'string' ? JSON.parse(movieData) : movieData;
                } else if (directUrl && directUrl !== 'undefined') {
                    const cleanUrl = directUrl.trim();
                    const response = await fetch(cleanUrl, {
                        signal,
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
                    await pushResults(mapped, signal);
                }
            } catch (e) {
                console.error("Failed to fetch rogmovie data:", e, "URL:", directUrl);
            }
        } else if (directUrl) {
            await pushResults([{
                title: 'Default Server',
                url: directUrl,
                source: 'Addon Provider',
                quality: 'Auto'
            }], signal);
        }

        // ─── Server Addon: direct stream URL fetch (DesiHub-style) ──────────
        if (serverAddonUrl && serverAddonUrl !== 'undefined' && serverAddonUrl.trim()) {
            try {
                const cleanUrl = serverAddonUrl.trim();
                const res = await fetch(cleanUrl, {
                    signal,
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
                        await pushResults(mapped, signal);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch serveraddon stream URL:', e);
            }
        }

        // ─── Resolve IMDb ID if needed for Stremio addons ───────
        const stremioAddons = addons.filter(addon => {
            if (!addon.manifest) return false;
            const catalogs = addon.manifest.catalogs || [];
            const types = addon.manifest.types || [];
            const hasMovieCatalog = catalogs.some((c: any) => c.type === 'movie') || types.includes('movie');
            const hasSeriesCatalog = catalogs.some((c: any) => c.type === 'series') || types.includes('series');
            return hasMovieCatalog || hasSeriesCatalog;
        });

        let imdbId: string | null = null;
        let isCustomStremioId = false;

        if (stremioAddons.length > 0 && tmdbId) {
            const tmdbStr = String(tmdbId);
            if (tmdbStr.startsWith('tt')) {
                imdbId = tmdbStr;
            } else if (!isNaN(Number(tmdbStr))) {
                try {
                    const tmdbType = isMovie ? 'movie' : 'tv';
                    const externalIds = await getExternalIds(tmdbType, tmdbStr);
                    imdbId = externalIds.imdb_id || null;
                    console.log(`Resolved TMDb ${tmdbStr} → IMDb ${imdbId}`);
                } catch (err) {
                    console.error('Failed to fetch IMDb ID from TMDB:', err);
                }
            } else {
                imdbId = tmdbStr;
                isCustomStremioId = true;
            }
        }

        // ═══════════════════════════════════════════════════════════════
        //  CONCURRENT BATCHED SCRAPING (3 at a time)
        //  Each scraper is wrapped as an async task. We run up to 3
        //  concurrently. As soon as any task finishes, its results are
        //  health-checked and merged into the UI immediately.
        // ═══════════════════════════════════════════════════════════════

        const CONCURRENCY = 3;
        const cinemaAddons = addons.filter(addon => addon.type === 'cinema');

        // Build a unified task list from all scraper categories
        type ScraperTask = () => Promise<void>;
        const tasks: ScraperTask[] = [];

        // ─── Stremio addon tasks ────────────────────────────────────
        for (const addon of stremioAddons) {
            if (!imdbId) continue;
            tasks.push(async () => {
                if (signal.aborted) return;
                try {
                    const baseUrl = addon.url.replace('/manifest.json', '');
                    const stremioType = isMovie ? 'movie' : 'series';
                    let streamUrl: string;

                    if (isMovie) {
                        streamUrl = `${baseUrl}/stream/${stremioType}/${imdbId}.json`;
                    } else {
                        if (isCustomStremioId && (season === undefined || episode === undefined || imdbId!.includes(':season='))) {
                            streamUrl = `${baseUrl}/stream/${stremioType}/${imdbId}.json`;
                        } else {
                            streamUrl = `${baseUrl}/stream/${stremioType}/${imdbId}:${season}:${episode}.json`;
                        }
                    }

                    setCurrentLog(`Fetching Stremio: ${addon.title}`);
                    const res = await fetch(streamUrl, { signal });
                    if (!res.ok) return;

                    const data = await res.json();
                    const streamList = data.streams || [];

                    const mapped: StreamResult[] = streamList
                        .filter((s: any) => s.url || s.infoHash || s.magnet)
                        .map((s: any) => {
                            const qualityMatch = s.title?.match(/(\d{3,4}p)/i) || s.name?.match(/(\d{3,4}p)/i);
                            let isTorrent = false;
                            let magnetLink = '';
                            let url = s.url || '';

                            if (s.infoHash) {
                                isTorrent = true;
                                magnetLink = s.magnet || `magnet:?xt=urn:btih:${s.infoHash}&dn=${encodeURIComponent(s.title || 'video')}`;
                                url = magnetLink;
                            } else if (s.magnet) {
                                isTorrent = true;
                                magnetLink = s.magnet;
                                url = s.magnet;
                            }

                            return {
                                title: s.title || s.name || 'Stremio Stream',
                                url: url,
                                source: s.name || addon.title || 'Stremio',
                                quality: qualityMatch ? qualityMatch[1] : undefined,
                                headers: s.behaviorHints?.proxyHeaders || {},
                                isTorrent,
                                magnetLink,
                            };
                        });

                    if (mapped.length > 0) {
                        await pushResults(mapped, signal);
                    }
                } catch (error) {
                    if (!signal.aborted) {
                        console.error(`Error fetching Stremio streams from ${addon.title}:`, error);
                    }
                }
            });
        }

        // ─── Cinema / mapping addon tasks ───────────────────────────
        for (const addon of cinemaAddons) {
            tasks.push(async () => {
                if (signal.aborted) return;
                try {
                    setCurrentLog(`Checking: ${addon.title}`);
                    const response = await fetch(addon.url, { signal });
                    const json = await response.json();

                    if (!Array.isArray(json)) return;

                    const firstItem = json[0];
                    if (firstItem && (firstItem.movieurl || firstItem.tvurl)) {
                        if (tmdbId) {
                            // Process mappings concurrently within this addon (max 3)
                            const mappingTasks = json.map((mapping: any) => async () => {
                                if (signal.aborted) return;
                                try {
                                    const fetchUrl = isMovie
                                        ? mapping.movieurl?.replace('${tmdb}', String(tmdbId))
                                        : mapping.tvurl
                                            ?.replace('${tmdb}', String(tmdbId))
                                            ?.replace('${season}', String(season))
                                            ?.replace('${episode}', String(episode));

                                    if (!fetchUrl) return;

                                    setCurrentLog(`Fetching Cinema: ${addon.title}`);
                                    const res = await fetch(fetchUrl, { signal });
                                    if (!res.ok) return;

                                    const sourceData = await res.json();
                                    if (Array.isArray(sourceData)) {
                                        const mapped = sourceData.map((item: any) => ({
                                            title: item[mapping.title || 'title'] || item.title || 'Unknown',
                                            url: item[mapping.url || 'url'] || item.url,
                                            type: item[mapping.type || 'type'] || item.type,
                                            headers: item.headers || {},
                                            source: addon.title
                                        }));
                                        await pushResults(mapped, signal);
                                    }
                                } catch (err) {
                                    console.error(`Error fetching streams from ${addon.title} mapping:`, err);
                                }
                            });
                            await runWithConcurrency(mappingTasks, CONCURRENCY, signal);
                        }
                    } else {
                        const filtered = json.filter((item: any) =>
                            item.title && String(item.title).toLowerCase().includes(String(query).toLowerCase())
                        );
                        const mapped = filtered.map((item: any) => ({
                            ...item,
                            source: addon.title
                        }));
                        await pushResults(mapped, signal);
                    }
                } catch (error) {
                    if (!signal.aborted) {
                        console.error(`Error fetching from ${addon.title}:`, error);
                    }
                }
            });
        }

        // ─── Nuvio Plugin tasks ─────────────────────────────────────
        for (const scraper of enabledScrapers) {
            if (!tmdbId) continue;
            tasks.push(async () => {
                if (signal.aborted) return;
                try {
                    const nuvioType = isMovie ? 'movie' : 'tv';
                    setCurrentLog(`Searching with: ${scraper.name}`);

                    const rawStreams = await executeNuvioPlugin(
                        scraper.rawCode!,
                        String(tmdbId),
                        nuvioType,
                        season ? Number(season) : null,
                        episode ? Number(episode) : null
                    );

                    if (signal.aborted) return;

                    if (rawStreams && rawStreams.length > 0) {
                        const mapped: StreamResult[] = rawStreams
                            .filter(s => s.url || s.link)
                            .map(s => ({
                                title: s.name || s.title || scraper.name,
                                url: s.url || s.link,
                                source: s.source || scraper.name,
                                quality: s.quality || (typeof s.quality === 'number' ? `${s.quality}p` : undefined),
                                headers: s.headers || {},
                            }));
                        if (mapped.length > 0) {
                            await pushResults(mapped, signal);
                        }
                    }
                } catch (error) {
                    if (!signal.aborted) {
                        console.error(`Error executing Nuvio Plugin ${scraper.name}:`, error);
                    }
                }
            });
        }

        // ─── Run all tasks with concurrency limit of 3 ─────────────
        await runWithConcurrency(tasks, CONCURRENCY, signal);

        setLoading(false);
        setHealthChecking(false);
        setCurrentLog('Finished scanning');
    }, [addons, enabledScrapers, pushResults]);

    return { results, loading, searchStreams, healthChecking, healthProgress, currentLog };
}
