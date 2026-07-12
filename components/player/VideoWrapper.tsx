import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import Video, { SelectedTrackType, SelectedVideoTrackType, DRMType } from 'react-native-video';
import { MaterialIcons } from '@expo/vector-icons';
import { useStreamType } from './useStreamType';
import { useSettingsStore } from '@/store/settingsStore';

let VLCPlayer: any;
try {
    VLCPlayer = require('react-native-vlc-media-player').VLCPlayer;
} catch (e) {
    console.warn('VLC Media Player not linked', e);
}

interface VideoWrapperProps {
    streamUrl: string;
    headersData: any;
    drmData: any;
    newDrmType: DRMType;
    isPlaying: boolean;
    playbackSpeed: number;
    volume: number;
    isMute: boolean;
    resizeMode: any;
    bgPlay: boolean;
    importedSubtitles: any[];
    allTextTracks: any[];
    selectedAudioTrack: number;
    selectedVideoTrack: number;
    selectedTextTrack: number;
    onProgress: (data: any, isVlc: boolean) => void;
    onBuffer: (data: any) => void;
    onLoad: (data: any, isVlc: boolean) => void;
    onError?: (msg: string) => void;
    onTextTracks?: (data: any) => void;
    style?: any;
    duration: number; // For VLC seek fraction calculations
}

const getFriendlyErrorMessage = (rawError: string): string => {
    if (!rawError) return "An error occurred while trying to play this video. Please try a different server.";

    const err = rawError.toLowerCase();

    // If it's a Source error from ExoPlayer (which encompasses 403, 404, bad HTTP status, etc)
    if (err.includes('source error') || err.includes('404') || err.includes('403') || err.includes('forbidden') || err.includes('bad_http_status')) {
        return "Source Error: The stream is unavailable, forbidden, or broken. Try a different server.";
    }

    if (err.includes('timeout') || err.includes('network') || err.includes('connection') || err.includes('socket') || err.includes('unknownhost')) {
        return "Network connection issue. Please check your internet or try a different server.";
    }

    if (err.includes('unrecognized') || err.includes('unsupported') || err.includes('malformed')) {
        return "Source Error: This video format is unsupported by your device.";
    }
    if (err.includes('drm') || err.includes('license')) {
        return "This stream is protected (DRM) and cannot be played.";
    }
    if (err.includes('mediacodec') || err.includes('decoder')) {
        return "Your device does not support decoding this video format.";
    }
    if (err.includes('behindlivewindow')) {
        return "Live stream interrupted. Please retry.";
    }

    return "The video failed to play. Please select a different stream or server.";
};

const VideoWrapperComponent = forwardRef<any, VideoWrapperProps>(function VideoWrapper(props, ref) {
    const { streamUrl, headersData, drmData, newDrmType, isPlaying, playbackSpeed, volume, isMute, resizeMode, bgPlay, importedSubtitles, allTextTracks, selectedAudioTrack, selectedVideoTrack, selectedTextTrack, onProgress, onBuffer, onLoad, onError, onTextTracks, style, duration } = props;

    const safeStreamUrl = React.useMemo(() => {
        if (!streamUrl) return streamUrl;
        try {
            return encodeURI(decodeURI(streamUrl));
        } catch (e) {
            return streamUrl.replace(/ /g, '%20').replace(/\[/g, '%5B').replace(/\]/g, '%5D');
        }
    }, [streamUrl]);

    const finalHeaders = React.useMemo(() => {
        const headers = { ...(headersData || {}) };
        if (safeStreamUrl) {
            try {
                const parsedUrl = new URL(safeStreamUrl);
                const referer = safeStreamUrl;
                const origin = parsedUrl.origin;

                let hasReferer = false;
                let hasOrigin = false;
                let hasUserAgent = false;

                // Case-insensitive check
                for (const key in headers) {
                    if (key.toLowerCase() === 'referer') hasReferer = true;
                    if (key.toLowerCase() === 'origin') hasOrigin = true;
                    if (key.toLowerCase() === 'user-agent') hasUserAgent = true;
                }

                if (!hasReferer) headers['Referer'] = referer;
                if (!hasOrigin) headers['Origin'] = origin;
                if (!hasUserAgent) headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
            } catch (e) {
                // Ignore URL parsing errors
            }
        }
        return headers;
    }, [safeStreamUrl, headersData]);

    const { isVlcRequired, isDetecting, streamType } = useStreamType(safeStreamUrl, finalHeaders);
    const internalRef = useRef<any>(null);
    const { theme } = useSettingsStore();
    const [vlcSeek, setVlcSeek] = useState<number>(0);
    const [playbackError, setPlaybackError] = useState<string | null>(null);
    const [appState, setAppState] = useState(Platform.OS === 'android' ? 'active' : '');

    useEffect(() => {
        if (Platform.OS !== 'android') return;
        const subscription = require('react-native').AppState.addEventListener('change', (nextAppState: string) => {
            setAppState(nextAppState);
        });
        return () => subscription.remove();
    }, []);

    const vlcSource = React.useMemo(() => ({
        uri: safeStreamUrl,
        headers: finalHeaders,
        isNetwork: !!(safeStreamUrl && safeStreamUrl.startsWith('http')),
        autoplay: true,
    }), [safeStreamUrl, finalHeaders]);

    const vlcInitOptions = React.useMemo(() => [
        "--codec=hw",
        "--no-stats",
        "--network-caching=3000",
        "--clock-jitter=0",
        "--no-osd",
        "--drop-late-frames",
        "--skip-frames",
        "--avcodec-hw=any",
        "--http-reconnect",
        "--adaptive-use-access",
        "--rtsp-tcp",
        "--aout=opensles",
        "--audio-resampler=soxr",
        "--audio-time-stretch",
        "--gain=1.0",
        "--audio-desync=0",
        "--no-spdif",
        "--audio-channels=2"
    ], []);

    const vlcMediaOptions = React.useMemo(() => [
        ":network-caching=3000",
        ":live-caching=3000",
        ":http-reconnect",
        ":clock-jitter=0",
        ":no-osd",
    ], []);

    const selectedTextTrackProps = React.useMemo(() => {
        if (selectedTextTrack === -1) {
            return { type: SelectedTrackType.DISABLED };
        }

        const importedOffset = allTextTracks.length;
        if (selectedTextTrack >= importedOffset) {
            const importedIndex = selectedTextTrack - importedOffset;
            const importedTrack = importedSubtitles[importedIndex];
            if (importedTrack?.title) {
                return {
                    type: SelectedTrackType.TITLE,
                    value: importedTrack.title,
                };
            }
        }

        return {
            type: SelectedTrackType.INDEX,
            value: selectedTextTrack,
        };
    }, [selectedTextTrack, allTextTracks.length, importedSubtitles]);

    // Compute VLC-safe subtitle URI — never pass undefined, always a string
    const vlcSubtitleUri = React.useMemo(() => {
        if (selectedTextTrack < 0) return '';
        const importedOffset = allTextTracks.length;
        if (selectedTextTrack >= importedOffset) {
            const importedIndex = selectedTextTrack - importedOffset;
            const track = importedSubtitles[importedIndex];
            return track?.uri || '';
        }
        return '';
    }, [selectedTextTrack, allTextTracks.length, importedSubtitles]);

    // Compute VLC text track ID for embedded tracks
    const vlcTextTrackId = React.useMemo(() => {
        if (selectedTextTrack < 0) return -1;
        const importedOffset = allTextTracks.length;
        if (selectedTextTrack < importedOffset) {
            // Use the VLC SPU track id from allTextTracks
            const track = allTextTracks[selectedTextTrack];
            return track?.id ?? selectedTextTrack;
        }
        // External subtitle is loaded via subtitleUri, no embedded track to select
        return -1;
    }, [selectedTextTrack, allTextTracks]);

    useImperativeHandle(ref, () => ({
        seek: (seconds: number) => {
            if (isVlcRequired) {
                const durationS = duration / 1000;
                const seekFraction = durationS > 0 ? seconds / durationS : 0;
                const clampedSeek = Math.max(0, Math.min(1, seekFraction));
                onBuffer({ isBuffering: true });
                setVlcSeek(clampedSeek);
            } else if (internalRef.current) {
                internalRef.current.seek(seconds);
            }
        },
        enterPictureInPicture: () => {
            if (!isVlcRequired && internalRef.current?.enterPictureInPicture) {
                internalRef.current?.enterPictureInPicture();
            }
        }
    }));

    const videoSource = React.useMemo(() => {
        const src: any = { uri: safeStreamUrl };

        const streamUrlLower = safeStreamUrl ? safeStreamUrl.toLowerCase() : '';
        if (streamType === 'hls' && !streamUrlLower.includes('.m3u8')) src.type = 'm3u8';
        if (streamType === 'mpd' && !streamUrlLower.includes('.mpd')) src.type = 'mpd';
        if (streamType === 'mp4' && !streamUrlLower.includes('.mp4')) src.type = 'mp4';

        if (finalHeaders && Object.keys(finalHeaders).length > 0) {
            // Ensure all header values are strings
            const safeHeaders: Record<string, string> = {};
            for (const key in finalHeaders) {
                if (finalHeaders[key] !== undefined && finalHeaders[key] !== null) {
                    safeHeaders[key] = String(finalHeaders[key]);
                }
            }
            if (Object.keys(safeHeaders).length > 0) {
                src.headers = safeHeaders;
            }
        }

        if (importedSubtitles && importedSubtitles.length > 0) {
            src.textTracks = importedSubtitles;
        }

        if (drmData) {
            src.drm = {
                type: newDrmType,
                licenseServer: drmData,
            };
        }

        return src;
    }, [safeStreamUrl, finalHeaders, importedSubtitles, drmData, newDrmType, streamType]);

    if (isDetecting || !safeStreamUrl) {
        return (
            <View style={[styles.loaderContainer, style]}>
                <ActivityIndicator size="large" color="white" />
            </View>
        );
    }

    if (playbackError) {
        return (
            <View style={[styles.errorOverlay, style]}>
                <MaterialIcons name="error-outline" size={48} color="#ff5555" />
                <Text style={styles.errorText}>{playbackError}</Text>
                <TouchableOpacity
                    style={styles.errorRetryButton}
                    onPress={() => setPlaybackError(null)}
                >
                    <Text style={styles.errorRetryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isVlcRequired && VLCPlayer) {

        const isAndroidBg = Platform.OS === 'android' && appState !== 'active' && !bgPlay;

        return (
            <View style={[styles.video, style, { backgroundColor: 'black' }]}>
                <VLCPlayer
                    key={safeStreamUrl}
                    ref={internalRef}
                    style={isAndroidBg ? [StyleSheet.absoluteFill, { opacity: 0 }] : StyleSheet.absoluteFill}
                    source={{ ...vlcSource }}
                    initOptions={[...vlcInitOptions]}
                    mediaOptions={[...vlcMediaOptions]}
                    autoplay={true}
                    paused={!isPlaying || isAndroidBg}
                    rate={playbackSpeed}
                    seek={vlcSeek}
                    volume={volume}
                    muted={isMute}
                    resizeMode={resizeMode}
                    playInBackground={true} // ALWAYS true to bypass ReactVlcPlayerView's buggy onHostPause that crashes when Surface is destroyed
                    onProgress={(data: any) => {
                        onProgress(data, true);
                        if (data?.currentTime > 0) {
                            onBuffer({ isBuffering: false });
                        }
                    }}
                    onBuffering={(e: any) => {
                        if (e?.isBuffering) {
                            onBuffer({ isBuffering: true });
                        }
                    }}
                    onLoad={(data: any) => {
                        onLoad(data, true);
                        onBuffer({ isBuffering: true });
                    }}
                    onPlaying={() => onBuffer({ isBuffering: false })}
                    onPaused={() => onBuffer({ isBuffering: false })}
                    onVideoEnd={() => onBuffer({ isBuffering: false })}
                    onError={(e: any) => {
                        onBuffer({ isBuffering: false });
                        console.warn('VLC Playback Error', e);
                        const errStr = (typeof e === 'string' && e) || e?.message || '';
                        const friendlyMsg = getFriendlyErrorMessage(errStr);
                        setPlaybackError(friendlyMsg);
                        onError && onError(friendlyMsg);
                    }}
                    audioTrack={selectedAudioTrack}
                    textTrack={vlcTextTrackId}
                    subtitleUri={vlcSubtitleUri}
                />
            </View>
        );
    }

    return (
        <Video
            focusable={false}
            ref={internalRef}
            source={videoSource}
            style={[styles.video, style]}
            paused={!isPlaying}
            rate={playbackSpeed}
            volume={volume}
            muted={isMute}
            resizeMode={resizeMode}
            playInBackground={bgPlay}
            onProgress={(data: any) => onProgress(data, false)}
            onBuffer={onBuffer}
            onLoad={(data: any) => onLoad(data, false)}
            onTextTracks={(data: any) => {
                if (onTextTracks) onTextTracks(data);
            }}
            selectedAudioTrack={{
                type: SelectedTrackType.INDEX,
                value: selectedAudioTrack
            }}
            selectedVideoTrack={{
                type: SelectedVideoTrackType.INDEX,
                value: selectedVideoTrack
            }}
            selectedTextTrack={selectedTextTrackProps}
            onError={(e: any) => {
                console.warn('ExoPlayer Error', e, { selectedTextTrack, importedSubtitles });
                const errorStr = e?.error?.errorString || '';
                const causeStr = e?.error?.cause?.message || e?.error?.errorException || e?.error?.errorStackTrace || '';
                const errMsg = `${errorStr} ${causeStr}` || e?.message || 'Unknown error';
                const friendlyMsg = getFriendlyErrorMessage(errMsg);
                setPlaybackError(friendlyMsg);
                onError && onError(friendlyMsg);
            }}
        />
    );
});

VideoWrapperComponent.displayName = 'VideoWrapperComponent';

export const VideoWrapper = React.memo(VideoWrapperComponent);
VideoWrapper.displayName = 'VideoWrapper';

const styles = StyleSheet.create({
    video: {
        width: '100%',
        height: '100%',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        width: '100%',
        height: '100%',
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
        padding: 32,
    },
    errorText: {
        color: '#ff5555',
        marginTop: 10,
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '600',
    },
    errorRetryButton: {
        marginTop: 20,
        backgroundColor: '#333',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#444',
    },
    errorRetryText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
