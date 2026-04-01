import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    StatusBar,
    Dimensions,
    Platform,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useTVRemote } from '@/hooks/useTVRemote';
import { MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/settingsStore';
import { Colors } from '@/constants/Colors';
import PlayerModal, { SpeedModal } from './PlayerModal';
import SubtitleModal from './SubtitleModal';
import EpgSidebar from './EpgSidebar';
import { useWatchParty } from '@/hooks/useWatchParty';
import WatchPartyModal from './WatchPartyModal';
import JoinPremiumModal from './JoinPremiumModal';

import { usePlayerLogic, UsePlayerLogicProps } from './usePlayerLogic';
import { VideoWrapper } from './VideoWrapper';
import { formatEpgTime } from '@/services/epgParser';
import { useRouter } from 'expo-router';

/** Helper: a Pressable that tracks focus state via onFocus/onBlur */
function TVPressable({ style, focusedStyle, children, ...props }: any) {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <Pressable
            focusable={true}
            isTVSelectable={true}
            accessible={true}
            {...props}
            onFocus={(e: any) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e: any) => { setIsFocused(false); props.onBlur?.(e); }}
            style={[style, isFocused && focusedStyle]}
        >
            {children}
        </Pressable>
    );
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- Memoized Sub-components for Performance ---

const PlayerHeader = React.memo(function PlayerHeader({ onBack, isMute, setIsMute }: any) {
    return (
        <View style={styles.topBar} pointerEvents="box-none">
            <TVPressable
                onPress={onBack}
                style={styles.topIconButton}
                focusedStyle={styles.controlButtonFocused}
                nativeID="tv-player-back"
            >
                <MaterialIcons name="arrow-back" size={28} color="white" />
            </TVPressable>
            <View style={{ flex: 1 }} />
            <TVPressable
                onPress={() => setIsMute(!isMute)}
                style={styles.topIconButton}
                focusedStyle={styles.controlButtonFocused}
                nativeID="tv-player-mute"
            >
                <MaterialIcons name={isMute ? "volume-off" : "volume-up"} size={28} color="white" />
            </TVPressable>
        </View>
    );
});

const CenterControls = React.memo(function CenterControls({ isPlaying, handlePlayPause, skip, onLocalSeek, onLocalPause, onLocalPlay, position }: any) {
    return (
        <View style={styles.centerControls} pointerEvents="box-none">
            <TVPressable
                onPress={() => { skip(false); onLocalSeek((position - 10000) / 1000); }}
                style={styles.skipButton}
                focusedStyle={styles.controlButtonFocused}
                nativeID="tv-player-rewind"
            >
                <MaterialIcons name="replay-10" size={48} color="white" />
            </TVPressable>

            <TVPressable
                onPress={() => {
                    handlePlayPause();
                    if (isPlaying) onLocalPause();
                    else onLocalPlay();
                }}
                style={styles.playButton}
                focusedStyle={{ transform: [{ scale: 1.15 }] }}
                hasTVPreferredFocus={true}
                nativeID="tv-player-play"
            >
                <FontAwesome5
                    name={isPlaying ? "pause" : "play"}
                    size={40}
                    color="white"
                />
            </TVPressable>

            <TVPressable
                onPress={() => { skip(true); onLocalSeek((position + 10000) / 1000); }}
                style={styles.skipButton}
                focusedStyle={styles.controlButtonFocused}
                nativeID="tv-player-forward"
            >
                <MaterialIcons name="forward-10" size={48} color="white" />
            </TVPressable>
        </View>
    );
});

const BottomInfoSection = React.memo(function BottomInfoSection({
    activeChannelLogo,
    isLive,
    activeTitle,
    currentProgram,
    isPremium,
    isInRoom,
    setSpeedModalVisible,
    setSettingsModalVisible,
    cycleResizeMode,
    resizeMode,
    resizeModeLabels,
    setSubtitleModalVisible,
    setEpgSidebarVisible,
    setWatchPartyModalVisible,
    setPremiumModalVisible,
    hasEpg,
    watchPartyActive
}: any) {
    return (
        <View style={styles.channelInfoRow} pointerEvents="box-none">
            {/* Logo */}
            {activeChannelLogo ? (
                <Image source={{ uri: activeChannelLogo }} style={styles.channelLogo} resizeMode="contain" />
            ) : isLive ? (
                <View style={styles.channelLogoPlaceholder}>
                    <MaterialIcons name="tv" size={28} color="#fff" />
                </View>
            ) : null}

            {/* Info */}
            <View style={styles.channelTextContainer}>
                <View style={styles.channelTitleRow}>
                    <Text style={styles.channelTitle} numberOfLines={1}>
                        {activeTitle || 'Live Stream'}
                    </Text>
                    {isLive && (
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveBadgeText}>LIVE</Text>
                        </View>
                    )}
                </View>
                {currentProgram && (
                    <Text style={styles.programName} numberOfLines={1}>
                        {currentProgram.title}
                    </Text>
                )}
                {currentProgram?.description && (
                    <Text style={styles.programDescription} numberOfLines={1}>
                        {currentProgram.description}
                    </Text>
                )}
            </View>

            {/* Buttons */}
            <View style={styles.actionButtonsRow} pointerEvents="box-none">
                <TVPressable onPress={() => setSpeedModalVisible(true)} style={styles.actionButton} focusedStyle={styles.actionButtonFocused}>
                    <MaterialIcons name="speed" size={22} color="white" />
                </TVPressable>
                <TVPressable onPress={() => setSettingsModalVisible(true)} style={styles.actionButton} focusedStyle={styles.actionButtonFocused}>
                    <MaterialIcons name="audiotrack" size={22} color="white" />
                </TVPressable>
                <TVPressable onPress={cycleResizeMode} style={styles.actionButton} focusedStyle={styles.actionButtonFocused}>
                    <Text style={styles.aspectText}>{resizeModeLabels[resizeMode] || '16:9'}</Text>
                </TVPressable>
                <TVPressable onPress={() => setSubtitleModalVisible(true)} style={styles.actionButton} focusedStyle={styles.actionButtonFocused}>
                    <MaterialIcons name="subtitles" size={22} color="white" />
                </TVPressable>
                {hasEpg && (
                    <TVPressable onPress={() => setEpgSidebarVisible(true)} style={[styles.actionButton, styles.epgButton]} focusedStyle={styles.actionButtonFocused}>
                        <Text style={styles.epgButtonText}>EPG</Text>
                    </TVPressable>
                )}
                {isPremium ? (
                    <TVPressable onPress={() => setWatchPartyModalVisible(true)} style={[styles.actionButton, watchPartyActive && styles.wpActiveButton]} focusedStyle={styles.actionButtonFocused}>
                        <MaterialCommunityIcons name="party-popper" size={22} color={watchPartyActive ? '#a78bfa' : 'white'} />
                    </TVPressable>
                ) : (
                    <TVPressable onPress={() => setPremiumModalVisible(true)} style={[styles.actionButton, styles.wpLockedButton]} focusedStyle={styles.actionButtonFocused}>
                        <MaterialCommunityIcons name="party-popper" size={22} color="#6b7280" />
                        <View style={styles.lockBadge}>
                            <MaterialIcons name="lock" size={10} color="#fbbf24" />
                        </View>
                    </TVPressable>
                )}
            </View>
        </View>
    );
});

const PlaybackProgress = React.memo(function PlaybackProgress({
    progressBarFocused,
    setProgressBarFocused,
    duration,
    position,
    currentColors,
    formatDuration,
    currentProgram
}: any) {
    return (
        <TVPressable
            style={[styles.progressContainer, progressBarFocused && styles.progressContainerFocused]}
            focusedStyle={styles.progressContainerFocused}
            onFocus={() => setProgressBarFocused(true)}
            onBlur={() => setProgressBarFocused(false)}
            nativeID="tv-player-progress"
        >
            <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${duration > 0 ? (position / duration) * 100 : 0}%`, backgroundColor: currentColors.primary }]} />
                    {duration > 0 && (
                        <View style={[styles.progressDot, { left: `${(position / duration) * 100}%`, backgroundColor: currentColors.primary, shadowColor: currentColors.primary }]} />
                    )}
                </View>
            </View>
            <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatDuration(position)}</Text>
                {currentProgram ? (
                    <Text style={styles.timeText}>
                        {formatEpgTime(currentProgram.start)} - {formatEpgTime(currentProgram.end)}
                    </Text>
                ) : (
                    <Text style={styles.timeText}>{formatDuration(duration)}</Text>
                )}
            </View>
        </TVPressable>
    );
});

export default function TVPlayer(props: UsePlayerLogicProps) {
    const router = useRouter();
    const playerLogic = usePlayerLogic(props);
    const {
        videoRef,
        isPremium,
        premiumModalVisible, setPremiumModalVisible,
        isPlaying, setIsPlaying,
        isMute, setIsMute,
        resizeMode, setResizeMode,
        isBuffering, setIsBuffering,
        controlsVisible, setControlsVisible,
        duration, position,
        selectedAudioTrack, setSelectedAudioTrack,
        selectedVideoTrack, setSelectedVideoTrack,
        selectedTextTrack, setSelectedTextTrack,
        allAudioTracks, allVideoTracks, allTextTracks,
        settingsModalVisible, setSettingsModalVisible,
        speedModalVisible, setSpeedModalVisible,
        subtitleModalVisible, setSubtitleModalVisible,
        epgSidebarVisible, setEpgSidebarVisible,
        playbackSpeed, setPlaybackSpeed,
        subtitleDelay, setSubtitleDelay,
        bgPlay, setBgPlay,
        epgPrograms,
        activeTitle, activeChannelId, activeChannelLogo,
        drmData, headersData, newDrmType,
        streamUrl, isReady, setIsReady,
        importedSubtitles, setImportedSubtitles,
        playbackError, setPlaybackError,
        watchPartyModalVisible, setWatchPartyModalVisible,
        handleChannelSelect,
        handlePlayPause, skip, handleSeek, formatDuration,
        onProgress, onBuffer, onLoad,
        handleImportSubtitle,
        resetHideTimeout,
        currentProgram,
        controlsVisibleRef
    } = playerLogic;

    // Use refs for duration and position to handle seek intervals accurately
    const durationRef = useRef(duration);
    const positionRef = useRef(position);

    useEffect(() => {
        durationRef.current = duration;
    }, [duration]);

    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    const watchParty = useWatchParty({
        videoRef,
        position,
        duration,
        isPlaying,
        setIsPlaying,
        url: props.url || '',
        title: props.title || 'Untitled',
    });

    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;

    const [progressBarFocused, setProgressBarFocused] = useState(false);

    const resizeModes = ['contain', 'cover', 'stretch'];
    const resizeModeLabels: Record<string, string> = {
        'contain': '16:9',
        'cover': 'Fill',
        'stretch': 'Stretch',
    };

    const cycleResizeMode = useCallback(() => {
        const currentIndex = resizeModes.indexOf(resizeMode);
        const nextIndex = (currentIndex + 1) % resizeModes.length;
        setResizeMode(resizeModes[nextIndex]);
        resetHideTimeout();
    }, [resizeMode, setResizeMode, resetHideTimeout]);

    const showControls = useCallback(() => {
        setControlsVisible(true);
        resetHideTimeout();
    }, [resetHideTimeout, setControlsVisible]);

    const seekBy = useCallback((ms: number) => {
        const target = Math.max(0, Math.min(durationRef.current, positionRef.current + ms));
        handleSeek(target);
        watchParty.onLocalSeek(target / 1000);
    }, [handleSeek, watchParty]);

    // Continuous seeking logic
    const seekIntervalRef = useRef<any>(null);

    const stopSeeking = useCallback(() => {
        if (seekIntervalRef.current) {
            clearInterval(seekIntervalRef.current);
            seekIntervalRef.current = null;
        }
    }, []);

    const startSeeking = useCallback((isForward: boolean) => {
        stopSeeking();
        // 300ms threshold for long press
        seekIntervalRef.current = setTimeout(() => {
            const doSeek = () => {
                const amount = isForward ? (durationRef.current * 0.10 || 5000) : -(durationRef.current * 0.05 || 5000);
                const target = Math.max(0, Math.min(durationRef.current, positionRef.current + amount));
                handleSeek(target);
                watchParty.onLocalSeek(target / 1000);
            };
            doSeek(); // Initial seek on long press
            seekIntervalRef.current = setInterval(doSeek, 500); // Continuous seek
        }, 300);
    }, [handleSeek, watchParty, stopSeeking]);

    // Ensure seeking stops if component unmounts or focus changes
    useEffect(() => {
        return () => stopSeeking();
    }, [stopSeeking]);

    // --- TV Remote Handling via useTVRemote hook ---
    useTVRemote({
        onSelect: () => {
            showControls();
            if (!epgSidebarVisible && !settingsModalVisible && !speedModalVisible && !subtitleModalVisible) {
                handlePlayPause();
            }
        },
        onPlayPause: () => {
            showControls();
            handlePlayPause();
        },
        onLeft: (action?: number) => {
            showControls();
            if (!settingsModalVisible && !speedModalVisible && !epgSidebarVisible && !subtitleModalVisible) {
                if (progressBarFocused) {
                    if (action === 0) startSeeking(false); // KeyDown
                    else if (action === 1) stopSeeking(); // KeyUp
                } else if (action === 0 || action === undefined) { // Not focused, or single press
                    skip(false);
                    watchParty.onLocalSeek((positionRef.current - 10000) / 1000);
                }
            }
        },
        onRight: (action?: number) => {
            showControls();
            if (!settingsModalVisible && !speedModalVisible && !epgSidebarVisible && !subtitleModalVisible) {
                if (progressBarFocused) {
                    if (action === 0) startSeeking(true); // KeyDown
                    else if (action === 1) stopSeeking(); // KeyUp
                } else if (action === 0 || action === undefined) { // Not focused, or single press
                    skip(true);
                    watchParty.onLocalSeek((positionRef.current + 10000) / 1000);
                }
            }
        },
        onUp: () => {
            if (!controlsVisibleRef.current) {
                showControls();
                return;
            }
            if (!settingsModalVisible && !speedModalVisible && !epgSidebarVisible && !subtitleModalVisible) {
                setSettingsModalVisible(true);
            }
            resetHideTimeout();
        },
        onDown: () => {
            if (!controlsVisibleRef.current) {
                showControls();
                return;
            }
            if (!settingsModalVisible && !speedModalVisible && !epgSidebarVisible && !subtitleModalVisible) {
                setSpeedModalVisible(true);
            }
            resetHideTimeout();
        },
        onBack: () => {
            if (epgSidebarVisible) {
                setEpgSidebarVisible(false);
            } else if (settingsModalVisible) {
                setSettingsModalVisible(false);
            } else if (subtitleModalVisible) {
                setSubtitleModalVisible(false);
            } else if (!controlsVisibleRef.current) {
                showControls();
            } else {
                props.onBack();
            }
        },
        onRewind: () => {
            showControls();
            if (!settingsModalVisible && !speedModalVisible && !epgSidebarVisible && !subtitleModalVisible) {
                skip(false);
                watchParty.onLocalSeek((positionRef.current - 10000) / 1000);
            }
        },
        onFastForward: () => {
            showControls();
            if (!settingsModalVisible && !speedModalVisible && !epgSidebarVisible && !subtitleModalVisible) {
                skip(true);
                watchParty.onLocalSeek((positionRef.current + 10000) / 1000);
            }
        },
        onStop: () => {
            showControls();
            if (isPlaying) {
                handlePlayPause();
                watchParty.onLocalPause();
            }
        },
        enabled: Platform.isTV,
    });

    const isLive = !!(activeChannelId || activeChannelLogo);

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            <PlayerModal
                visible={settingsModalVisible}
                audioTracks={allAudioTracks}
                videoTracks={allVideoTracks}
                selectedAudioTrack={selectedAudioTrack}
                selectedVideoTrack={selectedVideoTrack}
                onSelectAudio={(index) => setSelectedAudioTrack(index)}
                onSelectVideo={(index) => setSelectedVideoTrack(index)}
                onApply={() => setSettingsModalVisible(false)}
                onCancel={() => setSettingsModalVisible(false)}
            />

            <SubtitleModal
                visible={subtitleModalVisible}
                textTracks={allTextTracks}
                selectedTextTrack={selectedTextTrack}
                subtitleDelay={subtitleDelay}
                onSelectText={(index) => setSelectedTextTrack(index)}
                onImportSubtitle={handleImportSubtitle}
                onAdjustDelay={(delay) => setSubtitleDelay(delay)}
                onApply={() => setSubtitleModalVisible(false)}
                onCancel={() => setSubtitleModalVisible(false)}
            />

            <SpeedModal
                visible={speedModalVisible}
                onClose={() => setSpeedModalVisible(false)}
                onSelectSpeed={(speed) => {
                    setPlaybackSpeed(speed);
                    setSpeedModalVisible(false);
                }}
                selectedSpeed={playbackSpeed}
            />

            <View style={styles.playerArea}>
                {isReady && streamUrl && (
                    <VideoWrapper
                        ref={videoRef}
                        streamUrl={streamUrl}
                        headersData={headersData}
                        drmData={drmData}
                        newDrmType={newDrmType as any}
                        isPlaying={isPlaying}
                        playbackSpeed={playbackSpeed}
                        volume={1.0}
                        isMute={isMute}
                        resizeMode={resizeMode}
                        bgPlay={bgPlay}
                        duration={duration}
                        importedSubtitles={importedSubtitles}
                        selectedAudioTrack={selectedAudioTrack}
                        selectedVideoTrack={selectedVideoTrack}
                        selectedTextTrack={selectedTextTrack}
                        onProgress={onProgress}
                        onBuffer={onBuffer}
                        onLoad={onLoad}
                        onError={(msg) => setPlaybackError(msg)}
                        onTextTracks={(data: any) => {
                            playerLogic.setAllTextTracks(data.textTracks || []);
                        }}
                    />
                )}

                {/* Playback Error Overlay */}
                {playbackError && (
                    <View style={styles.errorOverlay}>
                        <MaterialIcons name="error-outline" size={48} color="#ff5555" />
                        <Text style={styles.errorText}>{playbackError}</Text>
                        <Pressable
                            style={styles.errorRetryButton}
                            onPress={() => {
                                setPlaybackError(null);
                                setIsReady(false);
                                setTimeout(() => setIsReady(true), 300);
                            }}
                        >
                            <Text style={styles.errorRetryText}>Retry</Text>
                        </Pressable>
                    </View>
                )}

                {!controlsVisible && (
                    <Pressable
                        style={StyleSheet.absoluteFillObject}
                        onPress={showControls}
                        nativeID="tv-player-interceptor"
                        hasTVPreferredFocus={!controlsVisible}
                        accessible={true}
                    />
                )}

                {/* TV Controls Overlay */}
                <View
                    style={[styles.controlsOverlay, { opacity: controlsVisible ? 1 : 0 }]}
                    pointerEvents={controlsVisible ? 'box-none' : 'none'}
                >
                    <PlayerHeader
                        onBack={props.onBack}
                        isMute={isMute}
                        setIsMute={setIsMute}
                    />

                    <CenterControls
                        isPlaying={isPlaying}
                        handlePlayPause={handlePlayPause}
                        skip={skip}
                        position={position}
                        onLocalSeek={watchParty.onLocalSeek}
                        onLocalPause={watchParty.onLocalPause}
                        onLocalPlay={watchParty.onLocalPlay}
                    />

                    {/* Bottom Section */}
                    <View style={styles.bottomSection} pointerEvents="box-none">
                        <BottomInfoSection
                            activeChannelLogo={activeChannelLogo}
                            isLive={isLive}
                            activeTitle={activeTitle}
                            currentProgram={currentProgram}
                            isPremium={isPremium}
                            watchPartyActive={watchParty.isInRoom}
                            setSpeedModalVisible={setSpeedModalVisible}
                            setSettingsModalVisible={setSettingsModalVisible}
                            cycleResizeMode={cycleResizeMode}
                            resizeMode={resizeMode}
                            resizeModeLabels={resizeModeLabels}
                            setSubtitleModalVisible={setSubtitleModalVisible}
                            setEpgSidebarVisible={setEpgSidebarVisible}
                            setWatchPartyModalVisible={setWatchPartyModalVisible}
                            setPremiumModalVisible={setPremiumModalVisible}
                            hasEpg={!!(props.epgUrl || epgPrograms.length > 0)}
                        />

                        <PlaybackProgress
                            progressBarFocused={progressBarFocused}
                            setProgressBarFocused={setProgressBarFocused}
                            duration={duration}
                            position={position}
                            currentColors={currentColors}
                            formatDuration={formatDuration}
                            currentProgram={currentProgram}
                        />
                    </View>
                </View>

                {/* Overlays */}
                <EpgSidebar
                    visible={epgSidebarVisible}
                    onClose={() => setEpgSidebarVisible(false)}
                    channels={props.channels || []}
                    playlistUrl={props.playlistUrl}
                    epgUrl={props.epgUrl}
                    currentChannelId={activeChannelId}
                    onChannelSelect={handleChannelSelect}
                />

                {isBuffering && (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size={60} color={currentColors.primary} style={styles.loaderIndicator} />
                    </View>
                )}

                {watchParty.isInRoom && watchParty.bufferingUser && (
                    <View style={styles.wpBufferingBanner}>
                        <MaterialIcons name="hourglass-top" size={20} color="#fbbf24" />
                        <Text style={styles.wpBufferingText}> Waiting for {watchParty.bufferingUser}... </Text>
                    </View>
                )}

                {watchParty.isInRoom && (
                    <View style={styles.wpRoomIndicator}>
                        <MaterialCommunityIcons name="party-popper" size={16} color="#a78bfa" />
                        <Text style={styles.wpRoomText}>
                            Party: {watchParty.roomCode} · {watchParty.users.length} viewers
                        </Text>
                    </View>
                )}

                {isPremium && (
                    <WatchPartyModal
                        visible={watchPartyModalVisible}
                        onClose={() => setWatchPartyModalVisible(false)}
                        isInRoom={watchParty.isInRoom}
                        isHost={watchParty.isHost}
                        roomCode={watchParty.roomCode}
                        users={watchParty.users}
                        error={watchParty.error}
                        bufferingUser={watchParty.bufferingUser}
                        onCreateRoom={(username) => watchParty.createRoom(username)}
                        onJoinRoom={(code, username) => watchParty.joinRoom(code, username)}
                        onLeaveRoom={() => watchParty.leaveRoom()}
                    />
                )}

                <JoinPremiumModal
                    visible={premiumModalVisible}
                    onClose={() => setPremiumModalVisible(false)}
                    onUpgrade={() => {
                        props.onBack();
                    }}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    playerArea: { flex: 1 },
    video: { ...StyleSheet.absoluteFillObject },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 30, paddingTop: 25 },
    topIconButton: { padding: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 24, borderWidth: 2, borderColor: 'transparent' },
    controlButtonFocused: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.25)', transform: [{ scale: 1.1 }] },
    centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 60 },
    skipButton: { alignItems: 'center', opacity: 0.85, borderWidth: 2, borderColor: 'transparent', borderRadius: 12, padding: 8 },
    playButton: { opacity: 0.95, borderWidth: 2, borderColor: 'transparent', borderRadius: 50 },
    bottomSection: { paddingHorizontal: 30, paddingBottom: 25, backgroundColor: 'rgba(0,0,0,0.0)' },
    channelInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    channelLogo: { width: 60, height: 60, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
    channelLogoPlaceholder: { width: 60, height: 60, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
    channelTextContainer: { flex: 1, marginLeft: 16 },
    channelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    channelTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
    liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E53935', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, gap: 5 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
    liveBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    programName: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '500', marginTop: 3 },
    programDescription: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 2 },
    actionButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    actionButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    actionButtonFocused: { borderColor: '#388EFF', backgroundColor: 'rgba(56,142,255,0.3)', transform: [{ scale: 1.15 }] },
    aspectText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    epgButton: { backgroundColor: 'rgba(56,142,255,0.25)', borderColor: 'rgba(56,142,255,0.4)', borderWidth: 1 },
    epgButtonText: { color: '#388EFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    progressContainer: { width: '100%' },
    progressContainerFocused: { borderWidth: 2, borderColor: '#fff', borderRadius: 6, padding: 4 },
    progressBarContainer: { position: 'relative', marginBottom: 8 },
    progressBarBackground: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'visible' },
    progressBarFill: { height: '100%', backgroundColor: '#388EFF', borderRadius: 2 },
    progressDot: { position: 'absolute', top: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: '#388EFF', marginLeft: -6, shadowColor: '#388EFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 3 },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    timeText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' },
    loaderContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
    loaderIndicator: { transform: [{ scale: 1.4 }], shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 5 },
    bufferingText: { color: 'white', fontSize: 18, fontWeight: '600', marginTop: 14 },
    wpActiveButton: { backgroundColor: 'rgba(167,139,250,0.2)', borderColor: 'rgba(167,139,250,0.4)' },
    wpLockedButton: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(251,191,36,0.15)', position: 'relative' as const },
    lockBadge: { position: 'absolute' as const, top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center' as const, alignItems: 'center' as const, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
    wpBufferingBanner: { position: 'absolute', top: 80, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, gap: 10, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
    wpBufferingText: { color: '#fbbf24', fontSize: 18, fontWeight: '600' },
    wpRoomIndicator: { position: 'absolute', top: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(167,139,250,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 8 },
    wpRoomText: { color: '#a78bfa', fontSize: 14, fontWeight: '600' },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        zIndex: 500,
    },
    errorText: {
        color: '#ff5555',
        fontSize: 18,
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 24,
        lineHeight: 26,
        fontWeight: '600',
        paddingHorizontal: 40,
    },
    errorRetryButton: {
        backgroundColor: '#333',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#444',
    },
    errorRetryText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '700',
    }
});
