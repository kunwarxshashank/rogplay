/**
 * Fallback: determine stream type from URL patterns.
 */
function getStreamTypeFromUrl(url: string): string | undefined {
    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes('.mpd') || lowerUrl.includes('/mpd/')) return 'mpd';
    if (lowerUrl.includes('.m3u8') || lowerUrl.includes('m3u8') || lowerUrl.includes('/hls/')) return 'm3u8';
    if (lowerUrl.includes('.ism/manifest') || lowerUrl.includes('/manifest(format=mpd-time-csf)')) return 'ism';
    if (lowerUrl.includes('.mp4')) return 'mp4';
    if (lowerUrl.includes('.mkv')) return 'mkv';

    return undefined;
}


/**
 * Map a Content-Type header value to a react-native-video stream type.
 */
function getStreamTypeFromContentType(contentType: string): string | undefined {
    const ct = contentType.toLowerCase();

    // HLS
    if (ct.includes('application/x-mpegurl') || ct.includes('application/vnd.apple.mpegurl')) return 'm3u8';
    // DASH
    if (ct.includes('application/dash+xml')) return 'mpd';
    // Smooth Streaming
    if (ct.includes('application/vnd.ms-sstr+xml')) return 'ism';
    // MP4
    if (ct.includes('video/mp4')) return 'mp4';
    // Matroska (MKV)
    if (ct.includes('video/x-matroska') || ct.includes('video/x-mkv')) return 'mkv';

    // application/octet-stream is generic — fall through
    return undefined;
}

/**
 * Detect the stream type by making a HEAD request to check Content-Type,
 * then falling back to URL pattern matching.
 *
 * @param url      The stream URL
 * @param headers  Optional headers to send (for protected URLs)
 */
export async function getStreamType(
    url: string | null | undefined,
    headers?: Record<string, string> | null,
): Promise<string | undefined> {
    if (!url) return undefined;

    // Try Content-Type detection via HEAD request
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: headers ? (headers as any) : undefined,
        });
        clearTimeout(timeout);

        const contentType = response.headers.get('content-type') || '';
        const fromCT = getStreamTypeFromContentType(contentType);
        if (fromCT) return fromCT;
    } catch (_) {
        // Network error or timeout — fall through to URL-based detection
    }

    // Fallback to URL pattern matching
    return getStreamTypeFromUrl(url);
}
