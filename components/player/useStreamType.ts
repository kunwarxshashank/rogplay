import { useState, useEffect, useRef } from 'react';


// By default VLC is our video player, so we set isVlcRequired to true
// But if the stream type is hls or mp4, we set isVlcRequired to false
export function useStreamType(url: string, headers: any = {}) {
    const [streamType, setStreamType] = useState<'hls' | 'm3u8' | 'mp4' | 'mkv' | 'mpd' | 'unknown' | null>(null);
    const [isVlcRequired, setIsVlcRequired] = useState(false);
    const [isDetecting, setIsDetecting] = useState(true);
    const headersKeyRef = useRef('');

    const currentHeadersKey = typeof headers === 'object' && headers !== null
        ? JSON.stringify(headers, Object.keys(headers).sort())
        : String(headers);

    useEffect(() => {
        let isMounted = true;
        headersKeyRef.current = currentHeadersKey;

        const detectType = async () => {
            if (!url) {
                if (isMounted) setIsDetecting(false);
                return;
            }

            const lowerUrl = url.toLowerCase();

            // Fast paths based on extension
            if (lowerUrl.includes('.m3u8') || lowerUrl.includes('.txt')) {
                if (isMounted) {
                    setStreamType('hls');
                    setIsVlcRequired(false);
                    setIsDetecting(false);
                }
                return;
            }
            if (lowerUrl.includes('.mpd')) {
                if (isMounted) {
                    setStreamType('mpd');
                    setIsVlcRequired(false);
                    setIsDetecting(false);
                }
                return;
            }
            if (lowerUrl.includes('.mp4')) {
                if (isMounted) {
                    setStreamType('mp4');
                    setIsVlcRequired(false);
                    setIsDetecting(false);
                }
                return;
            }
            if (lowerUrl.includes('.mkv')) {
                if (isMounted) {
                    setStreamType('mkv');
                    setIsVlcRequired(true); // VLC handles MKV better than ExoPlayer in most cases
                    setIsDetecting(false);
                }
                return;
            }

            try {
                const response = await fetch(url, {
                    method: 'HEAD',
                    headers: headers || {},
                });

                if (isMounted) {
                    const contentType = response.headers.get('content-type')?.toLowerCase() || '';
                    if (contentType) {
                        if (contentType.includes('application/x-mpegurl') || contentType.includes('application/vnd.apple.mpegurl')) {
                            setStreamType('hls');
                            setIsVlcRequired(false);
                        } else if (contentType.includes('application/dash+xml')) {
                            setStreamType('mpd');
                            setIsVlcRequired(false);
                        } else if (contentType.includes('video/mp4')) {
                            setStreamType('mp4');
                            setIsVlcRequired(false);
                        } else if (contentType.includes('video/x-matroska') || contentType.includes('video/mkv') || contentType.includes('audio/eac3')) {
                            setStreamType('mkv');
                            setIsVlcRequired(true);
                        } else if (contentType.includes('application/octet-stream') || contentType.includes('text/plain')) {
                            setStreamType('unknown');
                            // Generic binary data. If we don't know what it is, ExoPlayer is safer.
                            setIsVlcRequired(false);
                        } else {
                            setStreamType('unknown');
                            setIsVlcRequired(true);
                        }
                    } else {
                        setStreamType('unknown');
                        setIsVlcRequired(true);
                    }
                }
            } catch (error) {
                console.warn('Failed to detect stream type via HEAD request:', error);
                if (isMounted) {
                    setStreamType('unknown');
                    setIsVlcRequired(true);
                }
            } finally {
                if (isMounted) {
                    setIsDetecting(false);
                }
            }
        };

        setIsDetecting(true);
        detectType();

        return () => {
            isMounted = false;
        };
    }, [url, currentHeadersKey]);

    return { streamType, isVlcRequired, isDetecting };
}
