import React, { useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Animated,
    Image,
    ActivityIndicator,
    Dimensions,
    Platform
} from 'react-native';
import * as Brightness from 'expo-brightness';
import { MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';

import { usePlayerLogic, UsePlayerLogicProps } from './usePlayerLogic';
import { VideoWrapper } from './VideoWrapper';
import PlayerModal, { SpeedModal } from './PlayerModal';
import SubtitleModal from './SubtitleModal';
import EpgSidebar from './EpgSidebar';
import WatchPartyModal from './WatchPartyModal';
import JoinPremiumModal from './JoinPremiumModal';

import { useSettingsStore } from '@/store/settingsStore';
import { Colors } from '@/constants/Colors';
import { useWatchParty } from '@/hooks/useWatchParty';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- Memoized Sub-components for Performance ---

const MobilePlayerTopBar = React.memo(function MobilePlayerTopBar({ onBack, activeChannelLogo, activeChannelId, hasEpg, activeTitle, bgPlay, setBgPlay, pipSetting, handlePip }: any) {
    return (
        <View style={styles.topBar}>
            <TouchableOpacity onPress={onBack} style={styles.iconButton}>
                <MaterialIcons name="arrow-back" size={28} color="white" />
            </TouchableOpacity>

            {activeChannelLogo ? (
                <Image source={{ uri: activeChannelLogo }} style={styles.headerLogo} resizeMode="contain" />
            ) : (activeChannelId || hasEpg) ? (
                <View style={[styles.iconButton, { marginRight: -10, backgroundColor: 'transparent' }]}>
                    <MaterialIcons name="tv" size={24} color="white" />
                </View>
            ) : null}

            <Text style={styles.titleText} numberOfLines={1}>
                {activeTitle || 'Live Stream'}
            </Text>
            <View style={styles.topRight}>
                <TouchableOpacity onPress={() => setBgPlay(!bgPlay)} style={styles.iconButton}>
                    <MaterialCommunityIcons
                        name={bgPlay ? "headphones-off" : "headphones"}
                        size={24}
                        color="white"
                    />
                </TouchableOpacity>
                {Platform.OS === 'android' && pipSetting && (
                    <TouchableOpacity onPress={handlePip} style={styles.iconButton}>
                        <MaterialIcons name="picture-in-picture-alt" size={24} color="white" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
});

const MobilePlayerCenterControls = React.memo(function MobilePlayerCenterControls({ skip, onLocalSeek, onLocalPause, onLocalPlay, handlePlayPause, isPlaying, position }: any) {
    return (
        <View style={styles.centerControls}>
            <TouchableOpacity onPress={(() => { skip(false); onLocalSeek((position - 10000) / 1000); })} style={styles.skipButton}>
                <MaterialIcons name="replay-10" size={50} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => {
                    handlePlayPause();
                    if (isPlaying) onLocalPause();
                    else onLocalPlay();
                }}
                style={styles.playButton}
            >
                <FontAwesome5
                    name={isPlaying ? "pause" : "play"}
                    size={40}
                    color="white"
                />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { skip(true); onLocalSeek((position + 10000) / 1000); }} style={styles.skipButton}>
                <MaterialIcons name="forward-10" size={50} color="white" />
            </TouchableOpacity>
        </View>
    );
});

const MobilePlayerBottomBar = React.memo(function MobilePlayerBottomBar({
    position, duration, formatDuration, currentColors, handleSeek, onLocalSeek,
    isMute, setIsMute, setSettingsModalVisible, setSubtitleModalVisible,
    isPremium, watchPartyActive, setWatchPartyModalVisible,
    playbackSpeed, setSpeedModalVisible, hasEpg, setEpgSidebarVisible,
    handleRotate, resizeButtonEnabled, resizeMode, setResizeMode, setWatchPartyModalVisibleLocked
}: any) {
    return (
        <View style={styles.bottomBar}>
            <View style={styles.progressContainer}>
                <Text style={styles.timeText}>{formatDuration(position)}</Text>
                <Slider
                    style={styles.slider}
                    value={position}
                    minimumValue={0}
                    maximumValue={duration}
                    minimumTrackTintColor={currentColors.primary}
                    maximumTrackTintColor="rgba(255,255,255,0.3)"
                    thumbTintColor={currentColors.primary}
                    onSlidingComplete={(val) => {
                        handleSeek(val);
                        onLocalSeek(val / 1000);
                    }}
                />
                <Text style={styles.timeText}>{formatDuration(duration)}</Text>
            </View>

            <View style={styles.actionsBar}>
                <View style={styles.leftActions}>
                    <TouchableOpacity onPress={() => setIsMute(!isMute)} style={styles.iconButton}>
                        <MaterialIcons name={isMute ? "volume-off" : "volume-up"} size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={styles.badge}>
                        <MaterialIcons name="video-settings" size={20} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setSubtitleModalVisible(true)} style={styles.badge}>
                        <MaterialIcons name="subtitles" size={20} color="white" />
                    </TouchableOpacity>

                    {isPremium ? (
                        <TouchableOpacity
                            onPress={() => setWatchPartyModalVisible(true)}
                            style={[styles.badge, watchPartyActive && styles.watchPartyActiveBadge]}
                        >
                            <MaterialCommunityIcons name="party-popper" size={18} color={watchPartyActive ? '#a78bfa' : 'white'} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => setWatchPartyModalVisibleLocked(true)} style={[styles.badge, styles.wpLockedBadge]}>
                            <MaterialCommunityIcons name="party-popper" size={18} color="#6b7280" />
                            <View style={styles.lockBadge}>
                                <MaterialIcons name="lock" size={10} color="#fbbf24" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.rightActions}>
                    <TouchableOpacity onPress={() => setSpeedModalVisible(true)} style={styles.badge}>
                        <Text style={styles.badgeText}>{playbackSpeed}x</Text>
                    </TouchableOpacity>
                    {hasEpg && (
                        <TouchableOpacity onPress={() => setEpgSidebarVisible(true)} style={[styles.badge, styles.epgBadge]}>
                            <Text style={[styles.badgeText, styles.epgBadgeText]}>EPG</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleRotate} style={styles.iconButton}>
                        <MaterialIcons name="screen-rotation" size={24} color="white" />
                    </TouchableOpacity>
                    {resizeButtonEnabled && (
                        <TouchableOpacity
                            onPress={() => setResizeMode(
                                resizeMode === 'contain' ? 'cover' :
                                    resizeMode === 'cover' ? 'stretch' :
                                        'contain'
                            )}
                            style={styles.iconButton}
                        >
                            <MaterialIcons name="aspect-ratio" size={24} color="white" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
});

const MobilePlayerGestureIndicators = React.memo(function MobilePlayerGestureIndicators({
    showBrightnessIndicator, brightnessOpacity, brightness,
    showVolumeIndicator, volumeOpacity, volume
}: any) {
    return (
        <>
            {showBrightnessIndicator && (
                <Animated.View style={[styles.gestureIndicator, { left: 40, opacity: brightnessOpacity }]}>
                    <MaterialIcons
                        name={brightness > 0.7 ? "brightness-high" : brightness > 0.3 ? "brightness-medium" : "brightness-low"}
                        size={40} color="white"
                    />
                    <View style={styles.indicatorBarContainer}>
                        <View style={[styles.indicatorBarFill, { height: `${brightness * 100}%` }]} />
                    </View>
                </Animated.View>
            )}

            {showVolumeIndicator && (
                <Animated.View style={[styles.gestureIndicator, { right: 40, opacity: volumeOpacity }]}>
                    <MaterialIcons
                        name={volume > 0.7 ? "volume-up" : volume > 0.3 ? "volume-down" : volume > 0 ? "volume-mute" : "volume-off"}
                        size={40} color="white"
                    />
                    <View style={styles.indicatorBarContainer}>
                        <View style={[styles.indicatorBarFill, { height: `${volume * 100}%` }]} />
                    </View>
                </Animated.View>
            )}
        </>
    );
});

export default function MobilePlayer(props: UsePlayerLogicProps) {
    const router = useRouter();
    const playerLogic = usePlayerLogic(props);
    const {
        videoRef,
        isPremium,
        premiumModalVisible, setPremiumModalVisible,
        volume, setVolume,
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
        importedSubtitles,
        playbackError, setPlaybackError,
        watchPartyModalVisible, setWatchPartyModalVisible,
        handleChannelSelect,
        handlePlayPause, skip, handleSeek, formatDuration,
        onProgress, onBuffer, onLoad,
        handleRotate, handlePip, handleImportSubtitle,
        resetHideTimeout, brightness, setBrightness
    } = playerLogic;

    const watchParty = useWatchParty({
        videoRef,
        position,
        duration,
        isPlaying,
        setIsPlaying,
        url: props.url || '',
        title: props.title || 'Untitled',
    });

    const {
        doubleTapSeekEnabled,
        playbackGesturesEnabled,
        pipEnabled: pipSetting,
        longPressSpeedEnabled,
        resizeButtonEnabled,
        theme
    } = useSettingsStore();

    const currentColors = Colors[theme] || Colors.dark;

    const [isSpeedingUp, setIsSpeedingUp] = useState(false);
    const speedBeforeBoost = useRef(1.0);
    const longPressTimeout = useRef<any>(null);

    const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
    const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);

    const brightnessOpacity = useRef(new Animated.Value(0)).current;
    const volumeOpacity = useRef(new Animated.Value(0)).current;

    const gestureStartY = useRef(0);
    const gestureStartValue = useRef(0);
    const isGesturing = useRef(false);
    const lastPressTime = useRef(0);
    const lastPressX = useRef(0);
    const DOUBLE_TAP_DELAY = 300;

    const handleTouchStart = (event: any) => {
        const { pageY, pageX } = event.nativeEvent;
        gestureStartY.current = pageY;
        const { width } = Dimensions.get('window');

        if (pageX < width / 2) {
            gestureStartValue.current = brightness;
        } else {
            gestureStartValue.current = volume;
        }

        if (longPressSpeedEnabled && isPlaying) {
            longPressTimeout.current = setTimeout(() => {
                speedBeforeBoost.current = playbackSpeed;
                setPlaybackSpeed(2.0);
                setIsSpeedingUp(true);
            }, 500);
        }
    };

    const handleTouchMove = (event: any) => {
        if (!playbackGesturesEnabled) return;

        const { pageX, pageY } = event.nativeEvent;
        const { width } = Dimensions.get('window');
        const deltaY = gestureStartY.current - pageY;

        if (Math.abs(deltaY) > 20) {
            if (longPressTimeout.current) {
                clearTimeout(longPressTimeout.current);
            }

            isGesturing.current = true;
            const sensitivity = 0.002;
            const newValue = Math.max(0, Math.min(1, gestureStartValue.current + (deltaY * sensitivity)));

            if (pageX < width / 2) {
                setBrightness(newValue);
                Brightness.setBrightnessAsync(newValue);
                if (!showBrightnessIndicator) {
                    setShowBrightnessIndicator(true);
                    Animated.timing(brightnessOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
                }
            } else {
                setVolume(newValue);
                setIsMute(newValue === 0);
                if (!showVolumeIndicator) {
                    setShowVolumeIndicator(true);
                    Animated.timing(volumeOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
                }
            }
        }
    };

    const handleTouchEnd = (event: any) => {
        const { pageX } = event.nativeEvent;
        const now = Date.now();

        if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
        }

        if (isSpeedingUp) {
            setPlaybackSpeed(speedBeforeBoost.current);
            setIsSpeedingUp(false);
            return;
        }

        if (isGesturing.current) {
            isGesturing.current = false;
            setTimeout(() => {
                Animated.timing(brightnessOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => setShowBrightnessIndicator(false));
                Animated.timing(volumeOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => setShowVolumeIndicator(false));
            }, 1000);
            return;
        }

        if (doubleTapSeekEnabled && now - lastPressTime.current < DOUBLE_TAP_DELAY && Math.abs(pageX - lastPressX.current) < 50) {
            const { width } = Dimensions.get('window');
            if (pageX > width / 2) {
                skip(true);
                watchParty.onLocalSeek((position + 10000) / 1000);
            } else {
                skip(false);
                watchParty.onLocalSeek((position - 10000) / 1000);
            }
            lastPressTime.current = 0;
        } else {
            if (controlsVisible) {
                setControlsVisible(false);
            } else {
                resetHideTimeout();
            }
            lastPressTime.current = now;
            lastPressX.current = pageX;
        }
    };

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
                onApply={() => {
                    setSettingsModalVisible(false);
                    resetHideTimeout();
                }}
                onCancel={() => {
                    setSettingsModalVisible(false);
                    resetHideTimeout();
                }}
            />

            <SubtitleModal
                visible={subtitleModalVisible}
                textTracks={allTextTracks}
                selectedTextTrack={selectedTextTrack}
                subtitleDelay={subtitleDelay}
                onSelectText={(index) => {
                    setSelectedTextTrack(index);
                    resetHideTimeout();
                }}
                onImportSubtitle={handleImportSubtitle}
                onAdjustDelay={(delay) => setSubtitleDelay(delay)}
                onApply={() => {
                    setSubtitleModalVisible(false);
                    resetHideTimeout();
                }}
                onCancel={() => {
                    setSubtitleModalVisible(false);
                    resetHideTimeout();
                }}
            />

            <SpeedModal
                visible={speedModalVisible}
                onClose={() => {
                    setSpeedModalVisible(false);
                    resetHideTimeout();
                }}
                onSelectSpeed={(speed) => {
                    setPlaybackSpeed(speed);
                    setSpeedModalVisible(false);
                    resetHideTimeout();
                }}
                selectedSpeed={playbackSpeed}
            />

            <View
                onStartShouldSetResponder={() => true}
                onResponderStart={handleTouchStart}
                onResponderMove={handleTouchMove}
                onResponderRelease={handleTouchEnd}
                style={styles.playerArea}
            >
                {isReady && streamUrl && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                        <VideoWrapper
                            ref={videoRef}
                            streamUrl={streamUrl}
                            headersData={headersData}
                            drmData={drmData}
                            newDrmType={newDrmType}
                            isPlaying={isPlaying}
                            playbackSpeed={playbackSpeed}
                            volume={volume}
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
                    </View>
                )}

                <View style={[styles.controlsOverlay, { opacity: controlsVisible ? 1 : 0 }]} pointerEvents={controlsVisible ? 'auto' : 'none'}>
                    <MobilePlayerTopBar
                        onBack={props.onBack}
                        activeChannelLogo={activeChannelLogo}
                        activeChannelId={activeChannelId}
                        hasEpg={props.epgUrl || epgPrograms.length > 0}
                        activeTitle={activeTitle}
                        bgPlay={bgPlay}
                        setBgPlay={setBgPlay}
                        pipSetting={pipSetting}
                        handlePip={handlePip}
                    />

                    <MobilePlayerCenterControls
                        skip={skip}
                        onLocalSeek={watchParty.onLocalSeek}
                        onLocalPause={watchParty.onLocalPause}
                        onLocalPlay={watchParty.onLocalPlay}
                        handlePlayPause={handlePlayPause}
                        isPlaying={isPlaying}
                        position={position}
                    />

                    <MobilePlayerBottomBar
                        position={position}
                        duration={duration}
                        formatDuration={formatDuration}
                        currentColors={currentColors}
                        handleSeek={handleSeek}
                        onLocalSeek={watchParty.onLocalSeek}
                        isMute={isMute}
                        setIsMute={setIsMute}
                        setSettingsModalVisible={setSettingsModalVisible}
                        setSubtitleModalVisible={setSubtitleModalVisible}
                        isPremium={isPremium}
                        watchPartyActive={watchParty.isInRoom}
                        setWatchPartyModalVisible={setWatchPartyModalVisible}
                        playbackSpeed={playbackSpeed}
                        setSpeedModalVisible={setSpeedModalVisible}
                        hasEpg={props.epgUrl || epgPrograms.length > 0}
                        setEpgSidebarVisible={setEpgSidebarVisible}
                        handleRotate={handleRotate}
                        resizeButtonEnabled={resizeButtonEnabled}
                        resizeMode={resizeMode}
                        setResizeMode={setResizeMode}
                    />
                </View>

                <MobilePlayerGestureIndicators
                    showBrightnessIndicator={showBrightnessIndicator}
                    brightnessOpacity={brightnessOpacity}
                    brightness={brightness}
                    showVolumeIndicator={showVolumeIndicator}
                    volumeOpacity={volumeOpacity}
                    volume={volume}
                />

                {isBuffering && (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size={60} color={currentColors.primary} style={styles.loaderIndicator} />
                    </View>
                )}

                {isSpeedingUp && (
                    <View style={styles.speedBoostIndicator}>
                        <MaterialIcons name="fast-forward" size={32} color="white" />
                        <Text style={styles.speedBoostText}>2.0x Speed</Text>
                    </View>
                )}

                <EpgSidebar
                    visible={epgSidebarVisible}
                    onClose={() => setEpgSidebarVisible(false)}
                    channels={props.channels || []}
                    playlistUrl={props.playlistUrl}
                    epgUrl={props.epgUrl}
                    currentChannelId={activeChannelId}
                    onChannelSelect={handleChannelSelect}
                />

                {watchParty.isInRoom && watchParty.bufferingUser && (
                    <View style={styles.wpBufferingBanner}>
                        <MaterialIcons name="hourglass-top" size={18} color="#fbbf24" />
                        <Text style={styles.wpBufferingText}> Waiting for {watchParty.bufferingUser}... </Text>
                    </View>
                )}

                {watchParty.isInRoom && (
                    <View style={styles.wpRoomIndicator}>
                        <MaterialCommunityIcons name="party-popper" size={14} color="#a78bfa" />
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
                        router.push('/settings/account');
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'space-between',
        padding: 20,
    },
    topBar: { flexDirection: 'row', alignItems: 'center', marginTop: Platform.OS === 'android' ? 10 : 30 },
    iconButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
    titleText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 12, flex: 1 },
    headerLogo: { width: 32, height: 32, marginLeft: 12, borderRadius: 4 },
    topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 },
    skipButton: { opacity: 0.9 },
    playButton: { opacity: 0.95 },
    bottomBar: { width: '100%' },
    progressContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 10 },
    slider: { flex: 1, height: 40, marginHorizontal: 10 },
    timeText: { color: 'white', fontSize: 12, minWidth: 45, textAlign: 'center' },
    actionsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    leftActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rightActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 5 },
    badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    loaderContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    bufferingText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 10 },
    gestureIndicator: { position: 'absolute', top: '50%', marginTop: -60, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 12, width: 60 },
    indicatorBarContainer: { width: 4, height: 80, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: 10, justifyContent: 'flex-end' },
    indicatorBarFill: { width: '100%', backgroundColor: 'white', borderRadius: 2 },
    speedBoostIndicator: { position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 8 },
    speedBoostText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    loaderIndicator: { transform: [{ scale: 1.4 }], shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 5 },
    epgBadge: { backgroundColor: 'rgba(56,142,255,0.25)', borderWidth: 1, borderColor: 'rgba(56,142,255,0.4)' },
    epgBadgeText: { color: '#388EFF' },
    watchPartyActiveBadge: { backgroundColor: 'rgba(167,139,250,0.25)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)' },
    watchPartyActiveText: { color: '#a78bfa' },
    wpBufferingBanner: { position: 'absolute', top: 80, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 8, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
    wpBufferingText: { color: '#fbbf24', fontSize: 14, fontWeight: '600' },
    wpRoomIndicator: { position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(167,139,250,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
    wpRoomText: { color: '#a78bfa', fontSize: 12, fontWeight: '600' },
    errorOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 32, zIndex: 100 },
    errorText: { color: '#ffffff', fontSize: 15, textAlign: 'center', marginTop: 16, marginBottom: 20, lineHeight: 22 },
    errorRetryButton: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
    errorRetryText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
    wpLockedBadge: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(251,191,36,0.15)', position: 'relative' },
    lockBadge: { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
});
