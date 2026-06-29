import { useState, useEffect, useRef } from 'react';


// By default VLC is our video player, so we set isVlcRequired to true
// But if the stream type is hls or mp4, we set isVlcRequired to false
export function useStreamType(url: string, headers: any = {}) {
    const [streamType, setStreamType] = useState<'hls' | 'mp4' | 'mkv' | 'unknown' | null>(null);
    const [isVlcRequired, setIsVlcRequired] = useState(true);
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
                    setIsVlcRequired(true);
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
                    const contentType = response.headers.get('content-type');
                    if (contentType) {
                        if (contentType.includes('application/x-mpegURL') || contentType.includes('application/vnd.apple.mpegurl')) {
                            setStreamType('hls');
                            setIsVlcRequired(false);
                        } else if (contentType.includes('video/mp4')) {
                            setStreamType('mp4');
                            setIsVlcRequired(false);
                        } else if (contentType.includes('video/x-matroska') || contentType.includes('video/mkv') || contentType.includes('audio/eac3')) {
                            setStreamType('mkv');
                            setIsVlcRequired(true);
                        } else if (contentType.includes('application/octet-stream')) {
                            setIsVlcRequired(true);
                        }
                    } else {
                        setStreamType('unknown');
                        setIsVlcRequired(false);
                    }
                }
            } catch (error) {
                console.warn('Failed to detect stream type via HEAD request:', error);
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
    }, [url, currentHeadersKey]);

    return { streamType, isVlcRequired, isDetecting };
}
