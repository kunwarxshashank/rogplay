import { StreamResult } from '@/hooks/useStreamSources';

export interface HealthInfo {
    score: number;
    latency: number; // in ms
    estimatedSpeedMbps: number;
    resolution?: string;
    codec?: string;
    region?: string;
    statusBadge: '🟢 Excellent' | '🟢 Good' | '🟡 Fair' | '🔴 Poor';
}

export interface StreamResultWithHealth extends StreamResult {
    healthInfo?: HealthInfo;
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
 * Perform a lightweight HEAD request to measure latency and check availability
 */
async function checkStreamHealth(stream: StreamResult): Promise<HealthInfo> {
    if (stream.isTorrent) {
        let resolution = stream.quality?.toLowerCase() || 'Auto';
        if (!['4k', '1080p', '720p', 'auto'].includes(resolution)) {
            if (resolution.includes('4k')) resolution = '4K';
            else if (resolution.includes('1080')) resolution = '1080p';
            else if (resolution.includes('720')) resolution = '720p';
        }
        return {
            score: 100 + (resolution.includes('4K') ? 10 : resolution.includes('1080') ? 5 : 0), // Highly rank torrents
            latency: 0,
            estimatedSpeedMbps: 0,
            resolution: resolution === 'Auto' ? undefined : resolution.toUpperCase(),
            statusBadge: '🟢 Excellent'
        };
    }

    const startTime = Date.now();
    let latency = 9999;
    let score = -1; // -1 means dead
    let speedMbps = 0;
    
    // Create an abort controller to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for health ping
    
    try {
        const headers: any = {
            'User-Agent': stream.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        };
        
        // Some streams reject HEAD, so doing a lightweight GET with Range header
        // if supported, otherwise HEAD
        const method = stream.url.includes('.m3u8') || stream.url.includes('.mpd') ? 'GET' : 'HEAD';
        
        if (method === 'GET') {
            headers['Range'] = 'bytes=0-100'; // Only request first 100 bytes if possible
        }

        const res = await fetch(stream.url, {
            method,
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok || res.status === 206 || res.status === 302 || res.status === 403) {
            // Even 403 we might measure latency, but score should ideally reflect playability.
            // For now, if responding quickly, we assign latency. If 403, player drm might handle it.
            latency = Date.now() - startTime;
            
            // Calculate a rough score based on latency
            if (latency < 200) score = 100;
            else if (latency < 500) score = 90 - ((latency - 200) / 30);
            else if (latency < 1000) score = 80 - ((latency - 500) / 16);
            else if (latency < 2000) score = 50 - ((latency - 1000) / 20);
            else score = 20;

            // Simple speed guessing based on latency in reality you would download a segment 
            // but this is 'lightweight'. We'll put an estimated range.
            speedMbps = Math.max(1, Math.round(100 - (latency / 20)));

            // Extract headers if they reveal server info 
            // Often Cloudflare or regional providers set 'Server' or 'cf-ray'
            // We'll leave region blank unless we know
        } else {
            latency = 9999;
            score = 0;
        }

    } catch (error) {
        clearTimeout(timeoutId);
        latency = 9999;
        score = 0;
    }

    // Additional modifiers
    const type = getStreamType(stream.url, stream.type);
    let resolution = stream.quality?.toLowerCase() || 'Auto';
    if (!['4k', '1080p', '720p', 'auto'].includes(resolution)) {
        if (resolution.includes('4k')) resolution = '4K';
        else if (resolution.includes('1080')) resolution = '1080p';
        else if (resolution.includes('720')) resolution = '720p';
    }

    // Give slight boost to HLS/DASH as they are adaptive
    if (type === 'HLS' || type === 'DASH') {
        score = Math.min(100, score + 5);
    }
    
    // Give boost to higher resolutions
    if (resolution.includes('4K')) score = Math.min(100, score + 10);
    else if (resolution.includes('1080')) score = Math.min(100, score + 5);

    let badge: HealthInfo['statusBadge'] = '🔴 Poor';
    if (score >= 90) badge = '🟢 Excellent';
    else if (score >= 75) badge = '🟢 Good';
    else if (score >= 50) badge = '🟡 Fair';

    return {
        score: Math.max(0, Math.round(score)),
        latency,
        estimatedSpeedMbps: speedMbps,
        resolution: resolution === 'Auto' ? undefined : resolution.toUpperCase(),
        codec: type === 'HLS' ? 'H264/H265' : (type === 'MP4' ? 'H264' : undefined),
        statusBadge: badge,
    };
}

/**
 * Analyzes an array of streams concurrently and returns them sorted by health score.
 */
export async function analyzeAndSortStreams(streams: StreamResult[]): Promise<StreamResultWithHealth[]> {
    if (!streams.length) return [];

    const tasks = streams.map(async (stream) => {
        const healthInfo = await checkStreamHealth(stream);
        return {
            ...stream,
            healthInfo
        };
    });

    const analyzed = await Promise.all(tasks);

    // Sort by:
    // 1. Health Score (desc)
    // 2. Resolution priority (4k > 1080p > 720p) ? - For now sticking to just Score as it accounts for res slightly
    analyzed.sort((a, b) => (b.healthInfo?.score || 0) - (a.healthInfo?.score || 0));

    return analyzed;
}
