import { useState, useRef, useEffect, useCallback } from 'react';
import { BackHandler, Dimensions, Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import * as Brightness from 'expo-brightness';
import { useSettingsStore } from '@/store/settingsStore';
import { buildContinueWatchingId, useContinueWatchingStore } from '@/store/continueWatchingStore';
import { processDrmConfig } from '@/services/drmHandler';
import { PlaylistItem } from '@/services/playlistParser';
import { EpgProgram } from '@/services/epgParser';
import { TextTrackType, DRMType } from 'react-native-video';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '@/store/authStore';
import { fetchOpenSubtitles } from '@/services/subtitles';

export interface UsePlayerLogicProps {
    url: string;
    title?: string;
    referer?: string;
    origin?: string;
    cookie?: string;
    userAgent?: string;
    drmkeys?: string;
    drmtype?: string;
    headers?: any;
    onBack: () => void;
    channelLogo?: string;
    channelGroup?: string;
    epgUrl?: string;
    channelId?: string;
    watchPartyCode?: string;
    watchPartyUsername?: string;
    channels?: PlaylistItem[];
    playlistUrl?: string;
    sourceType?: 'cinema' | string;
    poster?: string;
    backdrop?: string;
    contentType?: 'movie' | 'tv';
    tmdbId?: string;
    season?: string;
    episode?: string;
    resumeMs?: string;
}

export function usePlayerLogic(props: UsePlayerLogicProps) {
    const {
        url, title, referer, origin, cookie, userAgent, drmkeys, drmtype, headers,
        onBack, channelLogo, channelGroup, epgUrl, channelId, watchPartyCode, watchPartyUsername,
        channels = [], playlistUrl, sourceType, poster, backdrop, contentType, tmdbId, season, episode, resumeMs
    } = props;

    const videoRef = useRef<any>(null);

    const { user } = useAuthStore();
    const isPremium = user?.isPremium || false;
    const [premiumModalVisible, setPremiumModalVisible] = useState(false);

    const [volume, setVolume] = useState(1.0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMute, setIsMute] = useState(false);
    const [resizeMode, setResizeMode] = useState<any>('contain');
    const [isBuffering, setIsBuffering] = useState(false);
    const [bufferProgress, setBufferProgress] = useState(0);
    const [controlsVisible, setControlsVisible] = useState(true);
    const controlsVisibleRef = useRef(controlsVisible);

    const setControlsVisibleSync = (val: boolean) => {
        setControlsVisible(val);
        controlsVisibleRef.current = val;
    };
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const durationRef = useRef(0);
    const positionRef = useRef(0);

    // Keep refs in sync with state for use in callbacks
    useEffect(() => { durationRef.current = duration; }, [duration]);
    useEffect(() => { positionRef.current = position; }, [position]);

    const [selectedAudioTrack, setSelectedAudioTrack] = useState(0);
    const [selectedVideoTrack, setSelectedVideoTrack] = useState(0);
    const [selectedTextTrack, setSelectedTextTrack] = useState(-1);
    const [allAudioTracks, setAllAudioTracks] = useState<any[]>([]);
    const [allVideoTracks, setAllVideoTracks] = useState<any[]>([]);
    const [allTextTracks, setAllTextTracks] = useState<any[]>([]);

    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [speedModalVisible, setSpeedModalVisible] = useState(false);
    const [subtitleModalVisible, setSubtitleModalVisible] = useState(false);
    const [epgSidebarVisible, setEpgSidebarVisible] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [subtitleDelay, setSubtitleDelay] = useState(0);
    const [bgPlay, setBgPlay] = useState(false);
    const [pipEnabled, setPipEnabled] = useState(true);

    const [epgPrograms, setEpgPrograms] = useState<EpgProgram[]>([]);
    const [currentProgram, setCurrentProgram] = useState<EpgProgram | null>(null);

    const [activeUrl, setActiveUrl] = useState(url);
    const [activeTitle, setActiveTitle] = useState(title);
    const [activeChannelId, setActiveChannelId] = useState(channelId);
    const [activeChannelLogo, setActiveChannelLogo] = useState(channelLogo);
    const [activeDrmKeys, setActiveDrmKeys] = useState(drmkeys);
    const [activeDrmType, setActiveDrmType] = useState(drmtype);
    const [activeReferer, setActiveReferer] = useState(referer || '');
    const [activeOrigin, setActiveOrigin] = useState(origin || '');
    const [activeCookie, setActiveCookie] = useState(cookie || '');
    const [activeUserAgent, setActiveUserAgent] = useState(userAgent || '');
    const [activeHeaders, setActiveHeaders] = useState<any>(headers || null);

    const [drmData, setDrmData] = useState<any>(null);
    const [headersData, setHeadersData] = useState<any>(null);
    const [newDrmType, setNewDrmType] = useState<DRMType>(DRMType.CLEARKEY);
    const [streamUrl, setStreamUrl] = useState("");
    const [isReady, setIsReady] = useState(false);
    const [importedSubtitles, setImportedSubtitles] = useState<any[]>([]);
    const [isFetchingSubtitles, setIsFetchingSubtitles] = useState(false);
    const [playbackError, setPlaybackError] = useState<string | null>(null);
    const [watchPartyModalVisible, setWatchPartyModalVisible] = useState(false);

    const { upsertItem, removeItem } = useContinueWatchingStore();
    const hasAppliedResumeRef = useRef(false);
    const lastProgressSaveSecondRef = useRef(0);

    const parsedResumeMs = Number(resumeMs || 0);
    const safeResumeMs = Number.isFinite(parsedResumeMs) ? Math.max(0, parsedResumeMs) : 0;

    const parseHeadersObject = useCallback((rawHeaders: any) => {
        if (!rawHeaders) return {};
        if (typeof rawHeaders === 'string') {
            try {
                const parsed = JSON.parse(rawHeaders);
                return typeof parsed === 'object' && parsed !== null ? parsed : {};
            } catch {
                return {};
            }
        }
        return typeof rawHeaders === 'object' ? rawHeaders : {};
    }, []);

    useEffect(() => {
        setActiveUrl(url);
        setActiveTitle(title);
        setActiveChannelId(channelId || '');
        setActiveChannelLogo(channelLogo || '');
        setActiveDrmKeys(drmkeys || '');
        setActiveDrmType(drmtype || '');
        setActiveReferer(referer || '');
        setActiveOrigin(origin || '');
        setActiveCookie(cookie || '');
        setActiveUserAgent(userAgent || '');
        setActiveHeaders(headers || null);
    }, [url, title, channelId, channelLogo, drmkeys, drmtype, referer, origin, cookie, userAgent, headers]);

    const forceLandscape = useSettingsStore(s => s.forceLandscape);
    const autoSubtitles = useSettingsStore(s => s.autoSubtitles);

    const hideTimeout = useRef<any>(null);

    const resetHideTimeout = useCallback(() => {
        if (hideTimeout.current) clearTimeout(hideTimeout.current);
        setControlsVisibleSync(true);
        hideTimeout.current = setTimeout(() => {
            if (isPlaying && !subtitleModalVisible && !settingsModalVisible && !speedModalVisible && !epgSidebarVisible && !watchPartyModalVisible) {
                setControlsVisibleSync(false);
            }
        }, 5000);
    }, [isPlaying, subtitleModalVisible, settingsModalVisible, speedModalVisible, epgSidebarVisible, watchPartyModalVisible]);

    useEffect(() => {
        resetHideTimeout();
        return () => {
            if (hideTimeout.current) clearTimeout(hideTimeout.current);
        };
    }, [isPlaying, resetHideTimeout]);

    const handleChannelSelect = useCallback(async (channel: PlaylistItem) => {
        const decodedUrl = decodeURIComponent(channel.url);
        setActiveUrl(channel.url);
        setActiveTitle(channel.title);
        setActiveChannelId(channel.channelId || '');
        setActiveChannelLogo(channel.imageUrl || '');
        setActiveDrmKeys(channel.drmkeys || '');
        setActiveDrmType(channel.drmtype || '');
        setActiveReferer(channel.referer || '');
        setActiveOrigin(channel.origin || '');
        setActiveCookie(channel.cookie || '');
        setActiveUserAgent(channel.userAgent || '');
        setActiveHeaders(channel.headers || null);
        setStreamUrl(decodedUrl);

        const parsedHeaders = parseHeadersObject(channel.headers);
        const newHeaders: any = {
            ...parsedHeaders,
            ...(channel.referer ? { Referer: channel.referer } : {}),
            ...(channel.origin ? { Origin: channel.origin } : {}),
            ...(channel.cookie ? { Cookie: channel.cookie } : {}),
            'User-Agent': channel.userAgent || parsedHeaders['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
        };
        setHeadersData(newHeaders);

        setAllAudioTracks([]);
        setAllVideoTracks([]);
        setAllTextTracks([]);
        setImportedSubtitles([]);
        setSelectedAudioTrack(0);
        setSelectedVideoTrack(0);
        setSelectedTextTrack(-1);
        setSubtitleDelay(0);

        setIsPlaying(true);
        resetHideTimeout();
    }, [parseHeadersObject, resetHideTimeout]);

    useEffect(() => {
        if (!activeUrl) return;

        const decodedUrl = decodeURIComponent(activeUrl);
        setStreamUrl(decodedUrl);

        const parsedHeaders = parseHeadersObject(activeHeaders);
        const mergedHeaders = {
            ...parsedHeaders,
            ...(activeReferer ? { Referer: activeReferer } : {}),
            ...(activeOrigin ? { Origin: activeOrigin } : {}),
            ...(activeCookie ? { Cookie: activeCookie } : {}),
            'User-Agent': activeUserAgent || parsedHeaders['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
        };
        setHeadersData(mergedHeaders);

        const setupPlayer = async () => {
            try {
                if (activeDrmKeys && activeDrmType) {
                    const config = await processDrmConfig(activeDrmKeys as string, activeDrmType as string, mergedHeaders);
                    if (config) {
                        setNewDrmType(config.type as DRMType);
                        setDrmData(config.licenseServer);
                    } else {
                        setDrmData(null);
                    }
                } else {
                    setDrmData(null);
                }
            } catch (e) {
                console.error('DRM setup failed:', e);
                setDrmData(null);
            } finally {
                setIsReady(true);
            }
        };

        setPlaybackError(null);
        setupPlayer();

        Brightness.getBrightnessAsync().then(setBrightness);

        if (Platform.isTV || forceLandscape) {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } else {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }

        if (Platform.OS === 'android') {
            NavigationBar.setVisibilityAsync("hidden");
        }

        const backAction = () => {
            onBack();
            return true;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => {
            subscription.remove();
            if (!Platform.isTV) {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            }
            if (Platform.OS === 'android') {
                NavigationBar.setVisibilityAsync("visible");
            }
        };
    }, [activeUrl, activeDrmKeys, activeDrmType, activeHeaders, activeReferer, activeOrigin, activeCookie, activeUserAgent, forceLandscape, onBack, parseHeadersObject]);

    const handlePlayPause = useCallback(() => {
        setIsPlaying(prev => !prev);
        resetHideTimeout();
    }, [resetHideTimeout]);

    const skip = useCallback((forward = true) => {
        const skipTime = 10000;
        const newPosition = positionRef.current + (forward ? skipTime : -skipTime);
        const clampedPosition = Math.max(0, Math.min(newPosition, durationRef.current));

        if (videoRef.current) {
            videoRef.current.seek(clampedPosition / 1000);
        }
        setPosition(clampedPosition);
        resetHideTimeout();
    }, [resetHideTimeout]);

    const handleSeek = useCallback((value: number) => {
        if (videoRef.current) {
            videoRef.current.seek(value / 1000);
        }
        setPosition(value);
        resetHideTimeout();
    }, [resetHideTimeout]);

    const formatDuration = useCallback((millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours > 0 ? hours + ':' : ''}${hours > 0 && minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }, []);

    const lastStateUpdateRef = useRef(0);
    // Use refs for callbacks so VideoWrapper (React.memo) gets stable references
    const onProgressRef = useRef<(data: any, isVlc?: boolean) => void>(() => {});

    onProgressRef.current = (data: any, isVlc: boolean = false) => {
        let currentMs = 0;
        let totalMs = 0;
        let newBufferProgress = 0;

        if (isVlc) {
            currentMs = typeof data?.currentTime === 'number' ? data.currentTime : positionRef.current;
            totalMs = typeof data?.duration === 'number' && data.duration > 0 ? data.duration : durationRef.current;
            if (typeof data?.position === 'number') newBufferProgress = data.position;
        } else {
            currentMs = data.currentTime * 1000;
            totalMs = durationRef.current || (typeof data.seekableDuration === 'number' ? data.seekableDuration * 1000 : 0);
            if (typeof data?.playableDuration === 'number' && typeof data?.seekableDuration === 'number' && data.seekableDuration > 0) {
                newBufferProgress = Math.min(1, Math.max(0, (data.playableDuration * 1000) / (data.seekableDuration * 1000)));
            }
        }

        const now = Date.now();
        const diffAbs = Math.abs(currentMs - positionRef.current);
        const positionChanged = diffAbs > 100;

        if ((now - lastStateUpdateRef.current > 500 && positionChanged) || diffAbs > 1000) {
            setPosition(currentMs);
            setBufferProgress(newBufferProgress);
            if (isVlc && totalMs && totalMs !== durationRef.current) setDuration(totalMs);
            lastStateUpdateRef.current = now;

            if (isBuffering && currentMs > 0) {
                setIsBuffering(false);
            }
        } else {
            positionRef.current = currentMs;
        }

        if (sourceType !== 'cinema' || !activeUrl) return;
        if (!totalMs || currentMs < 15000) return;

        const ratio = currentMs / totalMs;
        const currentSecond = Math.floor(currentMs / 1000);
        if (currentSecond - lastProgressSaveSecondRef.current < 8 && ratio < 0.96) return;
        lastProgressSaveSecondRef.current = currentSecond;

        const itemId = buildContinueWatchingId(activeUrl, contentType, tmdbId, season, episode);
        if (ratio >= 0.96) {
            removeItem(itemId);
            return;
        }

        upsertItem({
            id: itemId,
            sourceType: 'cinema',
            url: activeUrl,
            title: activeTitle || title || 'Untitled',
            headers: activeHeaders,
            userAgent: activeUserAgent,
            referer: activeReferer,
            origin: activeOrigin,
            cookie: activeCookie,
            drmkeys: activeDrmKeys,
            drmtype: activeDrmType,
            poster,
            backdrop,
            contentType,
            tmdbId,
            season,
            episode,
            positionMs: currentMs,
            durationMs: totalMs,
        });
    };

    const onProgress = useCallback((data: any, isVlc: boolean = false) => {
        onProgressRef.current(data, isVlc);
    }, []);

    const onBufferRef = useRef<(arg: { isBuffering: boolean }) => void>(() => {});
    onBufferRef.current = ({ isBuffering: buffering }: { isBuffering: boolean }) => {
        setIsBuffering(buffering);
        if (!buffering) {
            setBufferProgress(0);
        }
    };

    const onBuffer = useCallback((data: { isBuffering: boolean }) => {
        onBufferRef.current(data);
    }, []);

    const onLoadRef = useRef<(videoInfo: any, isVlc?: boolean) => void>(() => {});
    onLoadRef.current = (videoInfo: any, isVlc: boolean = false) => {
        const audioTracks = videoInfo.audioTracks || [];
        const videoTracks = videoInfo.videoTracks || [];
        const textTracks = videoInfo.textTracks || [];

        setAllAudioTracks(audioTracks);
        setAllVideoTracks(videoTracks);
        setAllTextTracks(textTracks);

        const durationMs = isVlc ? (videoInfo.duration || 0) : (videoInfo.duration * 1000 || 0);
        setDuration(durationMs);

        if (!hasAppliedResumeRef.current && safeResumeMs > 0 && durationMs > safeResumeMs + 5000) {
            if (videoRef.current) {
                if (isVlc) {
                    const seekFraction = durationMs > 0 ? safeResumeMs / durationMs : 0;
                    videoRef.current.seek(seekFraction);
                } else {
                    videoRef.current.seek(safeResumeMs / 1000);
                }
            }
            setPosition(safeResumeMs);
            hasAppliedResumeRef.current = true;
        }

        if (autoSubtitles && textTracks.length > 0 && selectedTextTrack === -1) {
            setSelectedTextTrack(0);
        }
    };

    const onLoad = useCallback((videoInfo: any, isVlc: boolean = false) => {
        onLoadRef.current(videoInfo, isVlc);
    }, []);

    useEffect(() => {
        hasAppliedResumeRef.current = false;
        lastProgressSaveSecondRef.current = 0;
    }, [activeUrl]);

    // ─── Fetch subtitles from OpenSubtitle addon ──────────────────────────
    useEffect(() => {
        if (!tmdbId || sourceType !== 'cinema') return;
        setImportedSubtitles([]);
        setIsFetchingSubtitles(true);

        fetchOpenSubtitles({
            tmdbId,
            contentType,
            season,
            episode,
        }).then(tracks => {
            const newTracks = tracks.map(t => ({
                title: t.title,
                language: t.language,
                uri: t.uri,
                type: t.uri?.toLowerCase().endsWith('.vtt') ? TextTrackType.VTT : TextTrackType.SUBRIP,
            }));
            setImportedSubtitles(newTracks);
        }).catch(err => {
            console.warn('Failed to fetch OpenSubtitles:', err);
        }).finally(() => {
            setIsFetchingSubtitles(false);
        });
    }, [tmdbId, contentType, season, episode, sourceType]);

    const handleRotate = useCallback(async () => {
        const orientation = await ScreenOrientation.getOrientationAsync();
        if (orientation === ScreenOrientation.Orientation.PORTRAIT_UP) {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } else {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }
    }, []);

    const handlePip = useCallback(() => {
        if (videoRef.current && pipEnabled) {
            if (videoRef.current.enterPictureInPicture) {
                videoRef.current.enterPictureInPicture();
            }
        }
    }, [pipEnabled]);

    const handleImportSubtitle = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['*/*'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                // Normalize/copy URIs (Android content:// URIs may be inaccessible to ExoPlayer)
                let normalizedUri = asset.uri;
                try {
                    if (Platform.OS === 'android' && normalizedUri && normalizedUri.startsWith('content://')) {
                        const fileName = asset.name || `subtitle-${Date.now()}`;
                        const dest = FileSystem.cacheDirectory + fileName;
                        await FileSystem.copyAsync({ from: normalizedUri, to: dest });
                        normalizedUri = dest;
                    } else if (normalizedUri && !normalizedUri.startsWith('file://') && normalizedUri.startsWith('/')) {
                        normalizedUri = `file://${normalizedUri}`;
                    }
                } catch (copyErr) {
                    console.warn('Subtitle copy to cache failed, using original uri', copyErr, asset.uri);
                    // fallback: keep original uri
                }

                const newSubtitle = {
                    title: asset.name || 'subtitle',
                    language: 'en',
                    type: asset.name?.toLowerCase().endsWith('.vtt') ? TextTrackType.VTT : TextTrackType.SUBRIP,
                    uri: normalizedUri,
                };
                setImportedSubtitles(prev => {
                    const updated = [...prev, newSubtitle];
                    const newIndex = allTextTracks.length + updated.length - 1;
                    const totalTracks = allTextTracks.length + updated.length;
                    const safeIndex = Math.max(0, Math.min(totalTracks - 1, newIndex));
                    setTimeout(() => {
                        setSelectedTextTrack(safeIndex);
                    }, 500);
                    return updated;
                });
                resetHideTimeout();
            }
        } catch (err) {
            console.error("Picking error", err);
        }
    }, [allTextTracks.length, resetHideTimeout]);

    const [brightness, setBrightness] = useState(0.5);

    return {
        videoRef,
        isPremium,
        premiumModalVisible, setPremiumModalVisible,
        volume, setVolume,
        isPlaying, setIsPlaying,
        isMute, setIsMute,
        resizeMode, setResizeMode,
        isBuffering, setIsBuffering,
        bufferProgress,
        controlsVisible, setControlsVisible: setControlsVisibleSync,
        duration, setDuration,
        position, setPosition,
        selectedAudioTrack, setSelectedAudioTrack,
        selectedVideoTrack, setSelectedVideoTrack,
        selectedTextTrack, setSelectedTextTrack,
        allAudioTracks, setAllAudioTracks,
        allVideoTracks, setAllVideoTracks,
        allTextTracks, setAllTextTracks,
        settingsModalVisible, setSettingsModalVisible,
        speedModalVisible, setSpeedModalVisible,
        subtitleModalVisible, setSubtitleModalVisible,
        epgSidebarVisible, setEpgSidebarVisible,
        playbackSpeed, setPlaybackSpeed,
        subtitleDelay, setSubtitleDelay,
        bgPlay, setBgPlay,
        pipEnabled, setPipEnabled,
        epgPrograms, setEpgPrograms,
        currentProgram, setCurrentProgram,
        activeUrl, activeTitle, activeChannelId, activeChannelLogo,
        activeDrmKeys, activeDrmType, activeReferer, activeOrigin,
        activeCookie, activeUserAgent, activeHeaders,
        drmData, headersData, newDrmType,
        streamUrl, isReady, setIsReady,
        importedSubtitles, setImportedSubtitles,
        isFetchingSubtitles,
        playbackError, setPlaybackError,
        watchPartyModalVisible, setWatchPartyModalVisible,
        handleChannelSelect,
        handlePlayPause,
        skip,
        handleSeek,
        formatDuration,
        onProgress,
        onBuffer,
        onLoad,
        handleRotate,
        handlePip,
        handleImportSubtitle,
        resetHideTimeout,
        brightness,
        setBrightness,
        controlsVisibleRef,
    };
}
