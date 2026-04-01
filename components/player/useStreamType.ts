import { useState, useEffect } from 'react';

export function useStreamType(url: string, headers: any = {}) {
    const [streamType, setStreamType] = useState<'hls' | 'mp4' | 'mkv' | 'unknown' | null>(null);
    const [isVlcRequired, setIsVlcRequired] = useState(false);
    const [isDetecting, setIsDetecting] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const detectType = async () => {
            if (!url) {
                if (isMounted) setIsDetecting(false);
                return;
            }

            // Quick check based on URL extension
            if (url.includes('.m3u8')) {
                if (isMounted) {
                    setStreamType('hls');
                    setIsVlcRequired(false);
                    setIsDetecting(false);
                }
                return;
            }

            if (url.includes('.mp4')) {
                if (isMounted) {
                    setStreamType('mp4');
                    setIsVlcRequired(false);
                    setIsDetecting(false);
                }
                return;
            }

            if (url.includes('.mkv')) {
                if (isMounted) {
                    setStreamType('mkv');
                    setIsVlcRequired(true); // MKV generally needs VLC for better support
                    setIsDetecting(false);
                }
                return;
            }

            // If URL has no obvious extension, perform a HEAD request to check Content-Type
            try {
                const response = await fetch(url, {
                    method: 'HEAD',
                    headers: headers || {},
                });

                if (isMounted) {
                    const contentType = response.headers.get('content-type');
                    if (contentType) {
                        if (contentType.includes('application/x-mpegURL') || contentType.includes('application/vnd.apple.mpegurl')) {
                            setStreamType('hls');
                            setIsVlcRequired(false);
                        } else if (contentType.includes('video/mp4')) {
                            setStreamType('mp4');
                            setIsVlcRequired(false);
                        } else if (contentType.includes('video/x-matroska') || contentType.includes('video/mkv') || contentType.includes('audio/eac3')) {
                            console.log('using vlc');
                            setStreamType('mkv');
                            setIsVlcRequired(true);
                        } else if (contentType.includes('application/octet-stream')) {
                            console.log('using vlc');
                            setIsVlcRequired(true);
                        }
                    } else {
                        setStreamType('unknown');
                        setIsVlcRequired(false);
                    }
                }
            } catch (error) {
                console.warn('Failed to detect stream type via HEAD request:', error);
                // Fallback to Exoplayer on network check error
                if (isMounted) {
                    setStreamType('unknown');
                    setIsVlcRequired(false);
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
    }, [url, JSON.stringify(headers)]);

    return { streamType, isVlcRequired, isDetecting };
}
