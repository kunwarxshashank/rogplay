import { StreamResult } from '@/hooks/useStreamSources';

export interface HealthInfo {
    score: number;
    latency: number; // in ms, 9999 = dead/unreachable
    estimatedSpeedMbps: number;
    resolution?: string;
    codec?: string;
    region?: string;
    isAlive: boolean;
    statusBadge: '🟢 Excellent' | '🟢 Good' | '🟡 Fair' | '🔴 Poor' | '💀 Dead';
}

export interface StreamResultWithHealth extends StreamResult {
    healthInfo?: HealthInfo;
}

// ─── In-memory cache with TTL ────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const healthCache = new Map<string, { info: HealthInfo; timestamp: number }>();

function getCachedHealth(url: string): HealthInfo | null {
    const cached = healthCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.info;
    }
    if (cached) healthCache.delete(url);
    return null;
}

function setCachedHealth(url: string, info: HealthInfo): void {
    healthCache.set(url, { info, timestamp: Date.now() });
    // Evict old entries if cache grows too large
    if (healthCache.size > 200) {
        const oldestKey = healthCache.keys().next().value;
        if (oldestKey) healthCache.delete(oldestKey);
    }
}

/**
 * Determines stream type from URL
 */
function getStreamType(url: string, providedType?: string): string {
    if (providedType?.toLowerCase() === 'hls' || url.includes('.m3u8')) return 'HLS';
    if (providedType?.toLowerCase() === 'dash' || url.includes('.mpd')) return 'DASH';
    if (url.includes('.mp4') || url.includes('.mkv')) return 'MP4';
    if (url.includes('api.') || url.includes('stream')) return 'API Stream';
    return 'Unknown';
}

/**
 * Perform a lightweight HEAD/GET request to measure latency and check availability
 */
async function checkStreamHealth(stream: StreamResult, signal?: AbortSignal): Promise<HealthInfo> {
    // Torrents are always "alive" — they don't have HTTP endpoints to probe
    if (stream.isTorrent) {
        let resolution = stream.quality?.toLowerCase() || 'Auto';
        if (!['4k', '1080p', '720p', 'auto'].includes(resolution)) {
            if (resolution.includes('4k')) resolution = '4K';
            else if (resolution.includes('1080')) resolution = '1080p';
            else if (resolution.includes('720')) resolution = '720p';
        }
        return {
            score: 100 + (resolution.includes('4K') ? 10 : resolution.includes('1080') ? 5 : 0),
            latency: 0,
            estimatedSpeedMbps: 0,
            resolution: resolution === 'Auto' ? undefined : resolution.toUpperCase(),
            isAlive: true,
            statusBadge: '🟢 Excellent'
        };
    }

    // Check cache first
    const cached = getCachedHealth(stream.url);
    if (cached) return cached;

    const startTime = Date.now();
    let latency = 9999;
    let score = 0; // 0 means dead
    let speedMbps = 0;
    let isAlive = false;

    // Create an abort controller for timeout, chain with parent signal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

    // If parent signal aborts, cascade
    const onParentAbort = () => controller.abort();
    if (signal) {
        if (signal.aborted) {
            clearTimeout(timeoutId);
            return buildDeadResult(stream);
        }
        signal.addEventListener('abort', onParentAbort);
    }

    try {
        let parsedHeaders = {};
        if (stream.headers) {
            try {
                parsedHeaders = typeof stream.headers === 'string' ? JSON.parse(stream.headers) : stream.headers;
            } catch (e) { }
        }

        const headers: any = {
            'User-Agent': stream.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...parsedHeaders
        };

        // .m3u8 and .mpd need GET (HEAD often rejected); everything else use HEAD
        const isManifest = stream.url.includes('.m3u8') || stream.url.includes('.mpd');
        const method = isManifest ? 'GET' : 'HEAD';

        if (method === 'GET') {
            headers['Range'] = 'bytes=0-100'; // Only first 100 bytes
        }

        const res = await fetch(stream.url, {
            method,
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Success: 200, 206 (partial), 302 (redirect), and even 403 (DRM might handle)
        if (res.ok || res.status === 206 || res.status === 302 || res.status === 301 || res.status === 403) {
            latency = Date.now() - startTime;
            isAlive = true;

            // Score based on latency: lower = better
            if (latency < 150) score = 100;
            else if (latency < 300) score = 95 - ((latency - 150) / 30);
            else if (latency < 500) score = 90 - ((latency - 300) / 20);
            else if (latency < 1000) score = 80 - ((latency - 500) / 16);
            else if (latency < 2000) score = 50 - ((latency - 1000) / 20);
            else if (latency < 3000) score = 20;
            else score = 10;

            // Rough speed estimate from latency
            speedMbps = Math.max(1, Math.round(100 - (latency / 20)));
        } else {
            // Non-success status (404, 500, etc.) = dead
            latency = 9999;
            score = 0;
            isAlive = false;
        }

    } catch (error) {
        clearTimeout(timeoutId);
        latency = 9999;
        score = 0;
        isAlive = false;
    } finally {
        if (signal) signal.removeEventListener('abort', onParentAbort);
    }

    // Apply modifiers for stream type and resolution
    const type = getStreamType(stream.url, stream.type);
    let resolution = stream.quality?.toLowerCase() || 'Auto';
    if (!['4k', '1080p', '720p', 'auto'].includes(resolution)) {
        if (resolution.includes('4k')) resolution = '4K';
        else if (resolution.includes('1080')) resolution = '1080p';
        else if (resolution.includes('720')) resolution = '720p';
    }

    if (isAlive) {
        // Boost adaptive streaming formats
        if (type === 'HLS' || type === 'DASH') {
            score = Math.min(100, score + 5);
        }
        // Boost higher resolutions
        if (resolution.includes('4K')) score = Math.min(100, score + 10);
        else if (resolution.includes('1080')) score = Math.min(100, score + 5);
    }

    let badge: HealthInfo['statusBadge'] = '💀 Dead';
    if (!isAlive) badge = '💀 Dead';
    else if (score >= 90) badge = '🟢 Excellent';
    else if (score >= 75) badge = '🟢 Good';
    else if (score >= 50) badge = '🟡 Fair';
    else badge = '🔴 Poor';

    const result: HealthInfo = {
        score: Math.max(0, Math.round(score)),
        latency,
        estimatedSpeedMbps: speedMbps,
        resolution: resolution === 'Auto' ? undefined : resolution.toUpperCase(),
        codec: type === 'HLS' ? 'H264/H265' : (type === 'MP4' ? 'H264' : undefined),
        isAlive,
        statusBadge: badge,
    };

    setCachedHealth(stream.url, result);
    return result;
}

function buildDeadResult(stream: StreamResult): HealthInfo {
    return {
        score: 0,
        latency: 9999,
        estimatedSpeedMbps: 0,
        isAlive: false,
        statusBadge: '💀 Dead',
    };
}

/**
 * Options for the stream analysis
 */
export interface AnalyzeOptions {
    /** Called progressively as each batch is analyzed, with the full sorted array so far */
    onProgress?: (sorted: StreamResultWithHealth[], checkedCount: number, totalCount: number) => void;
    /** AbortSignal to cancel the analysis */
    signal?: AbortSignal;
    /** Concurrency limit per batch (default: 5) */
    batchSize?: number;
}

/**
 * Analyzes an array of streams with batched concurrency.
 * Returns them sorted: alive streams by score (desc), dead streams at bottom.
 * Calls onProgress after each batch completes.
 */
export async function analyzeAndSortStreams(
    streams: StreamResult[],
    options: AnalyzeOptions = {}
): Promise<StreamResultWithHealth[]> {
    if (!streams.length) return [];

    const { onProgress, signal, batchSize = 5 } = options;
    const processedStreams: StreamResultWithHealth[] = [];
    let checkedCount = 0;

    // Process in batches
    for (let i = 0; i < streams.length; i += batchSize) {
        if (signal?.aborted) break;

        const batch = streams.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
            batch.map(async (stream) => {
                const healthInfo = await checkStreamHealth(stream, signal);
                return { ...stream, healthInfo };
            })
        );

        for (let j = 0; j < batch.length; j++) {
            const result = batchResults[j];
            if (result.status === 'fulfilled') {
                processedStreams.push(result.value);
            } else {
                processedStreams.push({ ...batch[j], healthInfo: buildDeadResult(batch[j]) });
            }
        }

        checkedCount += batch.length;
        const remainingStreams = streams.slice(i + batchSize);
        const combined = [...processedStreams, ...remainingStreams];

        // Sort current combined results and notify
        sortStreamResults(combined);
        onProgress?.(combined, Math.min(checkedCount, streams.length), streams.length);
    }

    // Final sort
    sortStreamResults(processedStreams);
    return processedStreams;
}

/**
 * Sort in-place: alive streams by score desc first, dead streams at bottom
 */
function sortStreamResults(results: StreamResultWithHealth[]): void {
    results.sort((a, b) => {
        // Status: 2 = Alive, 1 = Unchecked, 0 = Dead
        const getStatus = (item: StreamResultWithHealth) => {
            if (!item.healthInfo) return 1; // Unchecked
            if (item.healthInfo.isAlive) return 2; // Alive
            return 0; // Dead
        };

        const statusA = getStatus(a);
        const statusB = getStatus(b);

        if (statusA !== statusB) {
            return statusB - statusA; // 2 comes before 1 comes before 0
        }

        // If both are Alive or both are Dead, sort by score desc
        // If both are Unchecked, maintain original order (return 0)
        if (statusA === 1) return 0;

        return (b.healthInfo?.score || 0) - (a.healthInfo?.score || 0);
    });
}
