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

const VideoWrapperComponent = forwardRef<any, VideoWrapperProps>(function VideoWrapper(props, ref) {
    const { streamUrl, headersData, drmData, newDrmType, isPlaying, playbackSpeed, volume, isMute, resizeMode, bgPlay, importedSubtitles, allTextTracks, selectedAudioTrack, selectedVideoTrack, selectedTextTrack, onProgress, onBuffer, onLoad, onError, onTextTracks, style, duration } = props;

    const internalRef = useRef<any>(null);
    const { isVlcRequired, isDetecting } = useStreamType(streamUrl, headersData);
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
        uri: streamUrl,
        headers: headersData,
        isNetwork: !!(streamUrl && streamUrl.startsWith('http')),
        autoplay: true,
    }), [streamUrl, headersData]);

    const vlcInitOptions = React.useMemo(() => [
        "--codec=hw",
        "--no-stats",
        "--network-caching=3000",
        "--clock-jitter=0",
        "--no-osd",
        "--drop-late-frames",
        "--skip-frames",
        "--avcodec-hw=any",
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
        ":network-caching=2000",
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

    const videoSource = React.useMemo(() => ({
        uri: streamUrl,
        headers: headersData,
        textTracks: importedSubtitles,
        drm: drmData ? {
            type: newDrmType,
            licenseServer: drmData,
        } : undefined
    }), [streamUrl, headersData, importedSubtitles, drmData, newDrmType]);

    if (isDetecting || !streamUrl) {
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
        if (Platform.OS === 'android' && appState !== 'active' && !bgPlay) {
            return <View style={[styles.video, style, { backgroundColor: 'black' }]} />;
        }

        return (
            <VLCPlayer
                key={streamUrl}
                ref={internalRef}
                style={[styles.video, style]}
                source={{ ...vlcSource }}
                initOptions={[...vlcInitOptions]}
                mediaOptions={[...vlcMediaOptions]}
                autoplay={true}
                paused={!isPlaying}
                rate={playbackSpeed}
                seek={vlcSeek}
                volume={volume}
                muted={isMute}
                resizeMode={resizeMode}
                playInBackground={bgPlay}
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
                    console.error('VLC Playback Error', e);
                    const errStr = (typeof e === 'string' && e) || e?.message || '';
                    setPlaybackError(`Playback error: ${errStr || 'Unknown error'}`);
                    onError && onError(`Playback error: ${errStr || 'Unknown error'}`);
                }}
                audioTrack={selectedAudioTrack}
                textTrack={vlcTextTrackId}
                subtitleUri={vlcSubtitleUri}
            />
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
                console.error('ExoPlayer Error', e, { selectedTextTrack, importedSubtitles });
                const errMsg = e?.error?.errorString || e?.message || 'Unknown error';
                setPlaybackError(`Playback error: ${errMsg}`);
                onError && onError(`Playback error: ${errMsg}`);
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
