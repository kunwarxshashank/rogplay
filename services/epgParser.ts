/**
 * EPG (Electronic Program Guide) Parser
 * Fetches and parses XMLTV format EPG data with persistent caching.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';

const EPG_CACHE_DIR = FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}epg_cache/` : '';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Ensure cache directory exists
async function ensureCacheDir() {
    const dirInfo = await FileSystem.getInfoAsync(EPG_CACHE_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(EPG_CACHE_DIR, { intermediates: true });
    }
}

// Generate unique hash for URL
function getUrlHash(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

export interface EpgChannel {
    id: string;
    name: string;
    icon?: string;
}

export interface EpgProgram {
    channelId: string;
    title: string;
    description?: string;
    start: Date;
    end: Date;
    category?: string;
}

export interface EpgData {
    channels: EpgChannel[];
    programs: EpgProgram[];
}

/**
 * Parse XMLTV datetime format: "20260225183000 +0530"
 */
function parseXmltvDate(dateStr: string): Date {
    if (!dateStr) return new Date(0);
    // Format: YYYYMMDDHHmmss +TZ
    const cleaned = dateStr.trim();
    const year = parseInt(cleaned.substring(0, 4));
    const month = parseInt(cleaned.substring(4, 6)) - 1;
    const day = parseInt(cleaned.substring(6, 8));
    const hour = parseInt(cleaned.substring(8, 10));
    const min = parseInt(cleaned.substring(10, 12));
    const sec = parseInt(cleaned.substring(12, 14)) || 0;

    // Handle timezone offset
    const tzMatch = cleaned.match(/([+-]\d{4})/);
    if (tzMatch) {
        const tzStr = tzMatch[1];
        const tzSign = tzStr[0] === '+' ? 1 : -1;
        const tzHours = parseInt(tzStr.substring(1, 3));
        const tzMins = parseInt(tzStr.substring(3, 5));
        const tzOffsetMs = tzSign * (tzHours * 60 + tzMins) * 60 * 1000;

        // Create UTC date and apply offset
        const utcMs = Date.UTC(year, month, day, hour, min, sec) - tzOffsetMs;
        return new Date(utcMs);
    }

    return new Date(year, month, day, hour, min, sec);
}

/**
 * Extract attribute value from XML tag string
 */
function getAttr(tag: string, attr: string): string {
    const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
    const match = tag.match(regex);
    return match ? match[1] : '';
}

/**
 * Extract text content between XML tags
 */
function getTagContent(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
}

/**
 * Parse XMLTV content string into EpgData
 */
export function parseXmltvContent(xmlContent: string): EpgData {
    const channels: EpgChannel[] = [];
    const programs: EpgProgram[] = [];

    // Parse channels: <channel id="...">
    const channelRegex = /<channel\s+([^>]*)>([\s\S]*?)<\/channel>/gi;
    let channelMatch;
    while ((channelMatch = channelRegex.exec(xmlContent)) !== null) {
        const attrs = channelMatch[1];
        const body = channelMatch[2];
        const id = getAttr(attrs, 'id');
        const name = getTagContent(body, 'display-name');
        const iconMatch = body.match(/<icon\s+src="([^"]*)"/i);
        channels.push({
            id,
            name: name || id,
            icon: iconMatch ? iconMatch[1] : undefined,
        });
    }

    // Parse programmes: <programme start="..." stop="..." channel="...">
    const progRegex = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/gi;
    let progMatch;
    while ((progMatch = progRegex.exec(xmlContent)) !== null) {
        const attrs = progMatch[1];
        const body = progMatch[2];
        const channelId = getAttr(attrs, 'channel');
        const startStr = getAttr(attrs, 'start');
        const stopStr = getAttr(attrs, 'stop');
        const title = getTagContent(body, 'title');
        const desc = getTagContent(body, 'desc');
        const category = getTagContent(body, 'category');

        if (channelId && startStr) {
            programs.push({
                channelId,
                title: title || 'Unknown Program',
                description: desc || undefined,
                start: parseXmltvDate(startStr),
                end: parseXmltvDate(stopStr),
                category: category || undefined,
            });
        }
    }

    return { channels, programs };
}

/**
 * Fetch and parse EPG data from a URL
 */
export async function fetchAndParseEpg(epgUrl: string): Promise<EpgData> {
    try {
        const response = await fetch(epgUrl, {
            headers: {
                'Accept': 'application/xml, text/xml, */*',
            },
        });
        if (!response.ok) {
            console.warn(`EPG fetch failed: ${response.status}`);
            return { channels: [], programs: [] };
        }

        const text = await response.text();
        return parseXmltvContent(text);
    } catch (err) {
        console.warn('EPG fetch/parse error:', err);
        return { channels: [], programs: [] };
    }
}

/**
 * Lazy/streaming EPG fetch — processes large XML files (30-50MB+) in chunks.
 * Uses ReadableStream to avoid loading the entire file into memory at once.
 * Calls onProgress with partial results as they are parsed.
 */
export async function fetchEpgLazy(
    epgUrl: string,
    onProgress?: (data: EpgData) => void,
    limitToChannelIds?: string[],
): Promise<EpgData> {
    const channels: EpgChannel[] = [];
    const programs: EpgProgram[] = [];
    const seenChannelIds = new Set<string>();
    const filterSet = limitToChannelIds ? new Set(limitToChannelIds) : null;

    // Use a hash of URL + channel filter for specific caching if needed
    // or just use URL hash and handle cache invalidation
    const urlHash = getUrlHash(epgUrl);
    const filterHash = limitToChannelIds ? getUrlHash(limitToChannelIds.sort().join(',')) : 'all';
    const cacheFile = `${EPG_CACHE_DIR}${urlHash}_${filterHash}.json`;

    try {
        await ensureCacheDir();

        // Check cache first
        const cacheInfo = await FileSystem.getInfoAsync(cacheFile);
        if (cacheInfo.exists && !cacheInfo.isDirectory && (Date.now() - (cacheInfo.modificationTime || 0) * 1000 < CACHE_EXPIRY_MS)) {
            try {
                const cachedData = await FileSystem.readAsStringAsync(cacheFile);
                const parsed = JSON.parse(cachedData);
                // JSON dates need to be converted back to Date objects
                if (parsed.programs) {
                    parsed.programs = parsed.programs.map((p: any) => ({
                        ...p,
                        start: new Date(p.start),
                        end: new Date(p.end),
                    }));
                }
                return parsed;
            } catch (err) {
                console.warn('Failed to read EPG cache:', err);
            }
        }

        const response = await fetch(epgUrl, {
            headers: { 'Accept': 'application/xml, text/xml, */*' },
        });

        if (!response.ok) {
            console.warn(`EPG lazy fetch failed: ${response.status}`);
            return { channels: [], programs: [] };
        }

        // If ReadableStream is not available (some RN environments), fall back
        if (!response.body || typeof response.body.getReader !== 'function') {
            const text = await response.text();
            return parseXmltvContent(text);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let chunkCount = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            chunkCount++;

            // Process complete <channel>...</channel> blocks
            const channelRegex = /<channel\s+([^>]*)>([\s\S]*?)<\/channel>/gi;
            let channelMatch;
            let lastChannelEnd = 0;
            while ((channelMatch = channelRegex.exec(buffer)) !== null) {
                const attrs = channelMatch[1];
                const body = channelMatch[2];
                const id = getAttr(attrs, 'id');
                if (!seenChannelIds.has(id)) {
                    seenChannelIds.add(id);
                    const name = getTagContent(body, 'display-name');
                    const iconMatch = body.match(/<icon\s+src="([^"]*)"/i);
                    channels.push({
                        id,
                        name: name || id,
                        icon: iconMatch ? iconMatch[1] : undefined,
                    });
                }
                lastChannelEnd = channelRegex.lastIndex;
            }

            // Process complete <programme>...</programme> blocks
            const progRegex = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/gi;
            let progMatch;
            let lastProgEnd = 0;
            while ((progMatch = progRegex.exec(buffer)) !== null) {
                const attrs = progMatch[1];
                const body = progMatch[2];
                const channelId = getAttr(attrs, 'channel');
                const startStr = getAttr(attrs, 'start');
                const stopStr = getAttr(attrs, 'stop');
                const title = getTagContent(body, 'title');
                const desc = getTagContent(body, 'desc');
                const category = getTagContent(body, 'category');

                if (channelId && startStr) {
                    // Skip if not in our filter set
                    if (filterSet && !filterSet.has(channelId)) {
                        lastProgEnd = progRegex.lastIndex;
                        continue;
                    }

                    programs.push({
                        channelId,
                        title: title || 'Unknown Program',
                        description: desc || undefined,
                        start: parseXmltvDate(startStr),
                        end: parseXmltvDate(stopStr),
                        category: category || undefined,
                    });
                }
                lastProgEnd = progRegex.lastIndex;
            }

            // Trim processed content from buffer to keep memory low
            const trimPoint = Math.max(lastChannelEnd, lastProgEnd);
            if (trimPoint > 0) {
                buffer = buffer.substring(trimPoint);
            }

            // Report progress every 10 chunks
            if (chunkCount % 10 === 0 && onProgress) {
                onProgress({ channels: [...channels], programs: [...programs] });
            }
        }

        // Process any remaining content in the buffer
        if (buffer.length > 0) {
            const remaining = parseXmltvContent(buffer);
            for (const ch of remaining.channels) {
                if (!seenChannelIds.has(ch.id) && (!filterSet || filterSet.has(ch.id))) {
                    seenChannelIds.add(ch.id);
                    channels.push(ch);
                }
            }
            if (filterSet) {
                programs.push(...remaining.programs.filter(p => filterSet.has(p.channelId)));
            } else {
                programs.push(...remaining.programs);
            }
        }

    } catch (err) {
        console.warn('EPG lazy fetch/parse error:', err);
    }

    const result = { channels, programs };
    onProgress?.(result);

    // Save to cache on success
    if (channels.length > 0 || programs.length > 0) {
        try {
            await ensureCacheDir();
            // We save the JSON of results for fastest possible reload
            await FileSystem.writeAsStringAsync(cacheFile, JSON.stringify(result));
        } catch (err) {
            console.warn('Failed to save EPG cache:', err);
        }
    }

    return result;
}

/**
 * Clear all cached EPG files
 */
export async function clearEpgCache() {
    try {
        await ensureCacheDir();
        await FileSystem.deleteAsync(EPG_CACHE_DIR, { idempotent: true });
        await ensureCacheDir();
    } catch (err) {
        console.warn('Failed to clear EPG cache:', err);
    }
}

/**
 * Fetch and merge EPG data from multiple URLs.
 * Accepts a comma-separated string or array of URLs.
 * Deduplicates URLs and fetches in parallel using lazy loading.
 */
export async function fetchMultipleEpgUrls(
    epgUrls: string | string[],
    onProgress?: (data: EpgData) => void,
    limitToChannelIds?: string[],
): Promise<EpgData> {
    // Parse URLs — can be comma-separated string or array
    let urls: string[];
    if (typeof epgUrls === 'string') {
        urls = epgUrls.split(',').map(u => u.trim()).filter(u => u.length > 0);
    } else {
        urls = epgUrls.filter(u => u && u.trim().length > 0);
    }

    // Deduplicate
    urls = [...new Set(urls)];

    if (urls.length === 0) {
        return { channels: [], programs: [] };
    }

    // Single URL — use lazy fetch directly
    if (urls.length === 1) {
        return fetchEpgLazy(urls[0], onProgress, limitToChannelIds);
    }

    // Multiple URLs — fetch in parallel and merge
    const results = await Promise.all(
        urls.map(url => fetchEpgLazy(url, undefined, limitToChannelIds))
    );

    const mergedChannels: EpgChannel[] = [];
    const mergedPrograms: EpgProgram[] = [];
    const seenIds = new Set<string>();

    for (const result of results) {
        for (const ch of result.channels) {
            if (!seenIds.has(ch.id)) {
                seenIds.add(ch.id);
                mergedChannels.push(ch);
            }
        }
        mergedPrograms.push(...result.programs);
    }

    const merged = { channels: mergedChannels, programs: mergedPrograms };
    onProgress?.(merged);
    return merged;
}

/**
 * Get programs for a specific channel, sorted by start time
 */
export function getProgramsForChannel(programs: EpgProgram[], channelId: string): EpgProgram[] {
    return programs
        .filter(p => p.channelId === channelId)
        .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Get the currently airing program for a channel
 */
export function getCurrentProgram(programs: EpgProgram[], channelId: string): EpgProgram | null {
    const now = new Date();
    return programs.find(
        p => p.channelId === channelId && p.start <= now && p.end > now
    ) || null;
}

/**
 * Get upcoming programs for a channel (next N programs after now)
 */
export function getUpcomingPrograms(programs: EpgProgram[], channelId: string, count: number = 10): EpgProgram[] {
    const now = new Date();
    return programs
        .filter(p => p.channelId === channelId && p.end > now)
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .slice(0, count);
}

/**
 * Format time for EPG display (e.g., "10:00 pm")
 */
export function formatEpgTime(date: Date): string {
    let hours = date.getHours();
    const mins = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    return `${hours}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

// ============================================================================
// ADVANCED EPG BUCKETING SYSTEM 
// Indexes large XML files into smaller JSON chunks for O(1) lazy loading
// ============================================================================

export const NUM_BUCKETS = 50;

export function getBucketId(channelId: string): number {
    if (!channelId) return 0;
    let hash = 0;
    for (let i = 0; i < channelId.length; i++) {
        hash = ((hash << 5) - hash) + channelId.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash) % NUM_BUCKETS;
}

export async function checkEpgIndexed(epgUrl: string): Promise<boolean> {
    const urlHash = getUrlHash(epgUrl);
    const indexFile = `${EPG_CACHE_DIR}${urlHash}_index.json`;
    try {
        const info = await FileSystem.getInfoAsync(indexFile);
        if (info.exists && !info.isDirectory) {
            if (Date.now() - (info.modificationTime || 0) * 1000 < CACHE_EXPIRY_MS) {
                return true;
            }
        }
    } catch (e) { }
    return false;
}

/**
 * Parses XML stream and bins programs into 50 separate arrays in memory,
 * periodically yielding to the JS event loop, then flushes them to disk.
 * 
 * Uses FileSystem.downloadAsync + chunked reading for React Native compatibility
 * (ReadableStream / TextDecoder are often unavailable).
 */
export async function indexEpgBackground(
    epgUrl: string,
    onProgress?: (msg: string) => void,
    limitToChannelIds?: string[]
): Promise<void> {
    const urlHash = getUrlHash(epgUrl);
    const buckets: { [key: number]: EpgProgram[] } = {};
    for (let i = 0; i < NUM_BUCKETS; i++) buckets[i] = [];

    const filterSet = limitToChannelIds && limitToChannelIds.length > 0 ? new Set(limitToChannelIds) : null;
    let totalParsed = 0;

    await ensureCacheDir();
    onProgress?.('Downloading EPG...');

    const tempFile = `${EPG_CACHE_DIR}${urlHash}_temp.xml`;

    try {
        // Download the file to disk first — avoids huge memory allocations
        const downloadResult = await FileSystem.downloadAsync(epgUrl, tempFile, {
            headers: { 'Accept': 'application/xml, text/xml, */*' },
        });

        if (downloadResult.status !== 200) {
            throw new Error(`EPG fetch failed: ${downloadResult.status}`);
        }

        onProgress?.('Reading EPG file...');

        // Read the file in chunks to avoid loading 30-50MB into memory at once
        const fileInfo = await FileSystem.getInfoAsync(tempFile);
        const fileSize = (fileInfo as any).size || 0;
        const CHUNK_SIZE = 512 * 1024; // 512KB chunks
        let offset = 0;
        let buffer = '';
        let chunkCount = 0;

        // If the file is small (<2MB) just read it all at once
        if (fileSize > 0 && fileSize < 2 * 1024 * 1024) {
            const text = await FileSystem.readAsStringAsync(tempFile);
            onProgress?.('Parsing EPG...');
            const data = parseXmltvContent(text);
            for (const p of data.programs) {
                if (!filterSet || filterSet.has(p.channelId)) {
                    buckets[getBucketId(p.channelId)].push(p);
                    totalParsed++;
                }
            }
        } else {
            // Chunked reading — read file in 512KB slices
            // expo-file-system doesn't support byte-range reads natively, so read the full file
            // but parse it incrementally with regex to avoid keeping all parsed data simultaneously
            onProgress?.('Parsing large EPG file...');
            const text = await FileSystem.readAsStringAsync(tempFile);

            // Process in slices to yield to event loop periodically
            const SLICE_SIZE = 256 * 1024; // Parse 256KB worth at a time
            let searchStart = 0;

            while (searchStart < text.length) {
                // Find the end of the next slice — extend to the next </programme> boundary
                let sliceEnd = Math.min(searchStart + SLICE_SIZE, text.length);
                if (sliceEnd < text.length) {
                    const closingTag = text.indexOf('</programme>', sliceEnd);
                    if (closingTag !== -1) {
                        sliceEnd = closingTag + '</programme>'.length;
                    }
                }

                const slice = text.substring(searchStart, sliceEnd);

                // Parse programmes from this slice
                const progRegex = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/gi;
                let progMatch;
                while ((progMatch = progRegex.exec(slice)) !== null) {
                    const attrs = progMatch[1];
                    const channelId = getAttr(attrs, 'channel');

                    if (channelId && (!filterSet || filterSet.has(channelId))) {
                        const startStr = getAttr(attrs, 'start');
                        if (startStr) {
                            buckets[getBucketId(channelId)].push({
                                channelId,
                                title: getTagContent(progMatch[2], 'title') || 'Unknown',
                                description: getTagContent(progMatch[2], 'desc') || undefined,
                                start: parseXmltvDate(startStr),
                                end: parseXmltvDate(getAttr(attrs, 'stop')),
                                category: getTagContent(progMatch[2], 'category') || undefined,
                            });
                            totalParsed++;
                        }
                    }
                }

                searchStart = sliceEnd;
                chunkCount++;

                // Yield to event loop every few slices to prevent UI freeze
                if (chunkCount % 3 === 0) {
                    onProgress?.(`Parsing... (${totalParsed} programs)`);
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }
        }

        onProgress?.(`Saving ${totalParsed} programs...`);

        // Write buckets in parallel batches of 10
        const bucketIds = Array.from({ length: NUM_BUCKETS }, (_, i) => i);
        for (let batch = 0; batch < bucketIds.length; batch += 10) {
            const batchSlice = bucketIds.slice(batch, batch + 10);
            await Promise.all(batchSlice.map(async (i) => {
                const file = `${EPG_CACHE_DIR}${urlHash}_bucket_${i}.json`;
                if (buckets[i].length > 0) {
                    await FileSystem.writeAsStringAsync(file, JSON.stringify(buckets[i]));
                } else {
                    try { await FileSystem.deleteAsync(file, { idempotent: true }); } catch (e) { }
                }
            }));
            // Yield between batches
            await new Promise(resolve => setTimeout(resolve, 1));
        }

        // Write index file indicating completion
        await FileSystem.writeAsStringAsync(
            `${EPG_CACHE_DIR}${urlHash}_index.json`,
            JSON.stringify({ indexedAt: Date.now(), filterApplied: !!filterSet, totalPrograms: totalParsed })
        );

        onProgress?.(`Done — ${totalParsed} programs indexed`);
    } finally {
        // Clean up temp file
        try { await FileSystem.deleteAsync(tempFile, { idempotent: true }); } catch (e) { }
    }
}

/**
 * Loads programs exclusively from specific buckets.
 * O(1) loading time scaling. Loads all requested buckets in parallel.
 */
export async function loadEpgBuckets(epgUrl: string, bucketIds: number[]): Promise<EpgProgram[]> {
    const urlHash = getUrlHash(epgUrl);

    // Deduplicate array of buckets
    const uniqueBuckets = [...new Set(bucketIds)];

    // Load all buckets in parallel
    const results = await Promise.all(uniqueBuckets.map(async (bId) => {
        const file = `${EPG_CACHE_DIR}${urlHash}_bucket_${bId}.json`;
        try {
            const info = await FileSystem.getInfoAsync(file);
            if (info.exists) {
                const content = await FileSystem.readAsStringAsync(file);
                const parsed: any[] = JSON.parse(content);
                // Hydrate Date objects
                return parsed.map(p => ({
                    ...p,
                    start: new Date(p.start),
                    end: new Date(p.end)
                })) as EpgProgram[];
            }
        } catch (e) {
            // It's normal for some buckets to not exist
        }
        return [] as EpgProgram[];
    }));

    return results.flat();
}

/**
 * Loads programs for specific channel IDs only.
 * Resolves which buckets to read, loads them in parallel,
 * then filters to only the requested channels.
 */
export async function loadEpgForChannels(
    epgUrl: string,
    channelIds: string[],
    alreadyLoadedBuckets?: Set<number>,
): Promise<{ programs: EpgProgram[]; loadedBuckets: number[] }> {
    if (channelIds.length === 0) return { programs: [], loadedBuckets: [] };

    // Figure out which buckets we need
    const requiredBuckets = new Set<number>();
    for (const id of channelIds) {
        requiredBuckets.add(getBucketId(id));
    }

    // Skip already-loaded buckets
    const bucketsToLoad = Array.from(requiredBuckets).filter(
        bId => !alreadyLoadedBuckets || !alreadyLoadedBuckets.has(bId)
    );

    if (bucketsToLoad.length === 0) return { programs: [], loadedBuckets: [] };

    const allPrograms = await loadEpgBuckets(epgUrl, bucketsToLoad);

    // Filter to only the requested channel IDs
    const channelSet = new Set(channelIds);
    const filtered = allPrograms.filter(p => channelSet.has(p.channelId));

    return { programs: filtered, loadedBuckets: bucketsToLoad };
}
