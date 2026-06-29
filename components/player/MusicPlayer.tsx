import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, Animated, Easing,
    Dimensions, Platform, ScrollView, ActivityIndicator, StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useMusicPlayerStore, RepeatMode } from '@/store/musicPlayerStore';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_TV = Platform.isTV;
const IS_WEB = Platform.OS === 'web';

export interface MusicTrack {
    id: string;
    title: string;
    artist?: string;
    poster?: string;
    url: string;
    duration?: number;
    lyrics?: string;
    headers?: Record<string, string>;
}

interface MusicPlayerProps {
    tracks: MusicTrack[];
    initialIndex?: number;
    onBack: () => void;
    addonUrl?: string;
    addonManifest?: string;
}

export default function MusicPlayer({ tracks: propTracks, initialIndex = 0, onBack, addonUrl, addonManifest }: MusicPlayerProps) {
    const { colors: activeColors } = useTheme();
    const router = useRouter();
    const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();

    const storeTracks = useMusicPlayerStore(s => s.tracks);
    const storeCurrentIndex = useMusicPlayerStore(s => s.currentIndex);
    const storeIsPlaying = useMusicPlayerStore(s => s.isPlaying);
    const storePosition = useMusicPlayerStore(s => s.position);
    const storeDuration = useMusicPlayerStore(s => s.duration);
    const storeRepeatMode = useMusicPlayerStore(s => s.repeatMode);
    const storeIsShuffled = useMusicPlayerStore(s => s.isShuffled);
    const storeShuffleOrder = useMusicPlayerStore(s => s.shuffleOrder);
    const storeIsBuffering = useMusicPlayerStore(s => s.isBuffering);

    const setTracks = useMusicPlayerStore(s => s.setTracks);
    const togglePlaying = useMusicPlayerStore(s => s.togglePlaying);
    const nextTrack = useMusicPlayerStore(s => s.nextTrack);
    const prevTrack = useMusicPlayerStore(s => s.prevTrack);
    const seek = useMusicPlayerStore(s => s.seek);
    const cycleRepeat = useMusicPlayerStore(s => s.cycleRepeat);
    const toggleShuffle = useMusicPlayerStore(s => s.toggleShuffle);
    const setCurrentIndex = useMusicPlayerStore(s => s.setCurrentIndex);

    const [showLyrics, setShowLyrics] = useState(false);
    const [queueExpanded, setQueueExpanded] = useState(true);

    const rotationAnim = useRef(new Animated.Value(0)).current;

    // Sync incoming props to store on mount, only if tracks differ
    useEffect(() => {
        if (propTracks.length > 0) {
            const storeTracks = useMusicPlayerStore.getState().tracks;
            const sameTracks = storeTracks.length === propTracks.length &&
                storeTracks.every((t, i) => t.url === propTracks[i]?.url);
            if (!sameTracks) {
                setTracks(propTracks, initialIndex, addonUrl, addonManifest);
            }
        }
    }, []);

    // Use store state
    const tracks = storeTracks.length > 0 ? storeTracks : propTracks;
    const currentIndex = storeCurrentIndex;
    const isPlaying = storeIsPlaying;
    const position = storePosition;
    const duration = storeDuration;
    const repeatMode = storeRepeatMode;
    const isShuffled = storeIsShuffled;
    const shuffleOrder = storeShuffleOrder;
    const isBuffering = storeIsBuffering;

    const currentTrack = tracks[currentIndex];
    const trackId = `music:${currentTrack?.id || currentIndex}`;
    const isFav = isFavorite(trackId);

    // Rotation animation for album art
    useEffect(() => {
        if (isPlaying) {
            const anim = Animated.loop(
                Animated.timing(rotationAnim, {
                    toValue: 1,
                    duration: 8000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            anim.start();
            return () => anim.stop();
        } else {
            rotationAnim.stopAnimation();
        }
    }, [isPlaying]);

    const rotateInterpolation = rotationAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const handlePlayPause = useCallback(() => togglePlaying(), [togglePlaying]);

    const handleSeek = useCallback((value: number) => {
        seek(value);
    }, [seek]);

    const toggleLyrics = useCallback(() => setShowLyrics(l => !l), []);

    const toggleFavorite = useCallback(() => {
        if (isFav) {
            removeFavorite(trackId);
        } else {
            addFavorite({
                id: trackId,
                kind: 'music',
                title: currentTrack?.title || 'Unknown',
                subtitle: currentTrack?.artist,
                imageUrl: currentTrack?.poster,
                streamUrl: currentTrack?.url,
                browserUrl: addonUrl,
                browserManifest: addonManifest,
            });
        }
    }, [isFav, trackId, currentTrack, addonUrl, addonManifest, addFavorite, removeFavorite]);

    const formatTime = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const trackPosition = isShuffled
        ? (shuffleOrder.indexOf(currentIndex) + 1)
        : (currentIndex + 1);

    const repeatIcon = repeatMode === RepeatMode.ONE ? 'repeat-one' : 'repeat';
    const repeatColor = repeatMode !== RepeatMode.OFF ? activeColors.primary : activeColors.textSecondary;

    if (tracks.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: activeColors.background }]}>
                <ActivityIndicator size="large" color={activeColors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: activeColors.background }]}>
            <StatusBar barStyle="light-content" />

            {/* Dark Luxury Glass Background */}
            {currentTrack?.poster && (
                <Image source={{ uri: currentTrack.poster }} style={StyleSheet.absoluteFill} blurRadius={40} />
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: activeColors.background + 'B3' }]} />
            {activeColors.isAmoled ? (
                <View style={StyleSheet.absoluteFill} />
            ) : (
                <LinearGradient
                    colors={['transparent', activeColors.background + '99', activeColors.background]}
                    locations={[0, 0.5, 1]}
                    style={StyleSheet.absoluteFill}
                />
            )}

            {/* Top bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={IS_TV ? 32 : 24} color={activeColors.text} />
                </TouchableOpacity>
                <Text style={[styles.topBarTitle, { color: activeColors.textSecondary }]}>
                    Now Playing
                </Text>
                <View style={styles.topRight}>
                    <TouchableOpacity onPress={toggleFavorite} style={styles.topFavBtn}>
                        <MaterialIcons
                            name={isFav ? 'favorite' : 'favorite-border'}
                            size={IS_TV ? 28 : 22}
                            color={isFav ? '#ff4444' : activeColors.text}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onBack} style={styles.minimizeBtn}>
                        <MaterialIcons name="expand-more" size={IS_TV ? 32 : 26} color={activeColors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Album Art Premium Glass */}
                <View style={[styles.artContainer, styles.shadowGlow]}>
                    <Animated.View style={[styles.artWrap, { transform: [{ rotate: rotateInterpolation }] }]}>
                        {currentTrack?.poster ? (
                            <Image source={{ uri: currentTrack.poster }} style={styles.albumArt} />
                        ) : (
                            <View style={[styles.albumArtFallback, { backgroundColor: activeColors.surface }]}>
                                <MaterialIcons name="library-music" size={IS_TV ? 80 : 56} color={activeColors.primary + '80'} />
                            </View>
                        )}
                    </Animated.View>
                    <View style={[styles.artRing, { borderColor: activeColors.primary + '60' }]} />
                </View>

                {/* Track Info */}
                <View style={styles.infoSection}>
                    <Text style={[styles.trackTitle, { color: activeColors.text }]} numberOfLines={2}>
                        {currentTrack?.title || 'Unknown Track'}
                    </Text>
                    <Text style={[styles.trackArtist, { color: activeColors.textSecondary }]} numberOfLines={1}>
                        {currentTrack?.artist || 'Unknown Artist'}
                    </Text>
                </View>

                {/* Progress */}
                <View style={styles.progressSection}>
                    <Slider
                        style={styles.progressBar}
                        minimumValue={0}
                        maximumValue={Math.max(duration / 1000, 1)}
                        value={position / 1000}
                        onSlidingComplete={handleSeek}
                        minimumTrackTintColor={activeColors.primary}
                        maximumTrackTintColor={activeColors.border}
                        thumbTintColor={activeColors.primary}
                    />
                    <View style={styles.timeRow}>
                        <Text style={[styles.timeText, { color: activeColors.textSecondary }]}>
                            {formatTime(position)}
                        </Text>
                        <Text style={[styles.timeText, { color: activeColors.textSecondary }]}>
                            {formatTime(duration)}
                        </Text>
                    </View>
                </View>

                {/* Controls */}
                <View style={styles.controlsRow}>
                    <TouchableOpacity onPress={toggleShuffle} style={styles.controlBtn}>
                        <MaterialIcons
                            name="shuffle"
                            size={IS_TV ? 32 : 24}
                            color={isShuffled ? activeColors.primary : activeColors.textSecondary}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={prevTrack} style={styles.controlBtnMain}>
                        <MaterialIcons name="skip-previous" size={IS_TV ? 40 : 32} color={activeColors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handlePlayPause} style={[styles.playBtn, { backgroundColor: activeColors.primary, shadowColor: activeColors.primary }]}>
                        {isBuffering ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <MaterialIcons
                                name={isPlaying ? 'pause' : 'play-arrow'}
                                size={IS_TV ? 48 : 36}
                                color="#fff"
                            />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={nextTrack} style={styles.controlBtnMain}>
                        <MaterialIcons name="skip-next" size={IS_TV ? 40 : 32} color={activeColors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={cycleRepeat} style={styles.controlBtn}>
                        <MaterialIcons
                            name={repeatIcon as any}
                            size={IS_TV ? 32 : 24}
                            color={repeatColor}
                        />
                    </TouchableOpacity>
                </View>

                {/* Secondary controls row */}
                <View style={styles.secondaryRow}>
                    <Text style={[styles.trackCounter, { color: activeColors.textSecondary }]}>
                        {trackPosition} / {tracks.length}
                    </Text>

                    {currentTrack?.lyrics && (
                        <TouchableOpacity onPress={toggleLyrics} style={styles.secBtn}>
                            <MaterialIcons
                                name="lyrics"
                                size={IS_TV ? 28 : 22}
                                color={showLyrics ? activeColors.primary : activeColors.textSecondary}
                            />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Lyrics */}
                {showLyrics && currentTrack?.lyrics && (
                    <View style={[styles.lyricsContainer, { borderTopColor: activeColors.border }]}>
                        <Text style={[styles.lyricsTitle, { color: activeColors.primary }]}>Lyrics</Text>
                        <Text style={[styles.lyricsText, { color: activeColors.textSecondary }]}>
                            {currentTrack.lyrics}
                        </Text>
                    </View>
                )}

                {/* Playlist queue - dropdown */}
                {tracks.length > 1 && (
                    <View style={[styles.queueSection]}>
                        <TouchableOpacity
                            style={styles.queueHeader}
                            onPress={() => setQueueExpanded(e => !e)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.queueTitle, { color: activeColors.text }]}>Up Next</Text>
                            <MaterialIcons
                                name={queueExpanded ? 'expand-less' : 'expand-more'}
                                size={IS_TV ? 28 : 22}
                                color={activeColors.textSecondary}
                            />
                        </TouchableOpacity>
                        {queueExpanded && tracks.slice(currentIndex + 1, currentIndex + 4).map((track, i) => (
                            <TouchableOpacity
                                key={track.id}
                                style={[styles.queueItem, { borderBottomColor: activeColors.border }]}
                                onPress={() => {
                                    const idx = tracks.indexOf(track);
                                    if (idx >= 0) setCurrentIndex(idx);
                                }}
                            >
                                <View style={styles.queueItemLeft}>
                                    {track.poster ? (
                                        <Image source={{ uri: track.poster }} style={styles.queueThumb} />
                                    ) : (
                                        <View style={[styles.queueThumbFallback, { backgroundColor: activeColors.surface }]}>
                                            <MaterialIcons name="music-note" size={16} color={activeColors.textSecondary} />
                                        </View>
                                    )}
                                    <View style={styles.queueInfo}>
                                        <Text style={[styles.queueTrackTitle, { color: activeColors.text }]} numberOfLines={1}>
                                            {track.title}
                                        </Text>
                                        <Text style={[styles.queueTrackArtist, { color: activeColors.textSecondary }]} numberOfLines={1}>
                                            {track.artist || 'Unknown Artist'}
                                        </Text>
                                    </View>
                                </View>
                                <MaterialIcons name="play-arrow" size={20} color={activeColors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: IS_TV ? 32 : 16,
        paddingTop: IS_TV ? 24 : 48,
        paddingBottom: 8,
        zIndex: 10,
    },
    backBtn: {
        width: IS_TV ? 52 : 44,
        height: IS_TV ? 52 : 44,
        borderRadius: IS_TV ? 26 : 22,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    topFavBtn: {
        width: IS_TV ? 52 : 44,
        height: IS_TV ? 52 : 44,
        borderRadius: IS_TV ? 26 : 22,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    minimizeBtn: {
        width: IS_TV ? 52 : 44,
        height: IS_TV ? 52 : 44,
        borderRadius: IS_TV ? 26 : 22,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topBarTitle: {
        fontSize: IS_TV ? 18 : 14,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    scrollContent: {
        paddingBottom: 40,
        alignItems: 'center',
    },
    artContainer: {
        marginTop: IS_TV ? 32 : 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    artWrap: {
        width: IS_TV ? 320 : Math.min(SCREEN_WIDTH - 80, 280),
        height: IS_TV ? 320 : Math.min(SCREEN_WIDTH - 80, 280),
        borderRadius: IS_TV ? 160 : Math.min(SCREEN_WIDTH - 80, 280) / 2,
        overflow: 'hidden',
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
    },
    albumArt: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    albumArtFallback: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    artRing: {
        position: 'absolute',
        width: (IS_TV ? 320 : Math.min(SCREEN_WIDTH - 80, 280)) + 16,
        height: (IS_TV ? 320 : Math.min(SCREEN_WIDTH - 80, 280)) + 16,
        borderRadius: (IS_TV ? 320 : Math.min(SCREEN_WIDTH - 80, 280) + 16) / 2,
        borderWidth: 1.5,
        opacity: 0.8,
    },
    shadowGlow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.6,
        shadowRadius: 30,
        elevation: 20,
    },
    infoSection: {
        alignItems: 'center',
        marginTop: IS_TV ? 32 : 24,
        paddingHorizontal: 32,
    },
    trackTitle: {
        fontSize: IS_TV ? 28 : 22,
        fontWeight: '700',
        textAlign: 'center',
    },
    trackArtist: {
        fontSize: IS_TV ? 20 : 16,
        marginTop: 6,
        fontWeight: '500',
    },
    progressSection: {
        width: '100%',
        paddingHorizontal: IS_TV ? 48 : 32,
        marginTop: IS_TV ? 24 : 16,
    },
    progressBar: {
        width: '100%',
        height: IS_TV ? 48 : 40,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -8,
    },
    timeText: {
        fontSize: IS_TV ? 14 : 12,
        fontWeight: '500',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: IS_TV ? 20 : 12,
        gap: IS_TV ? 32 : 20,
    },
    controlBtn: {
        width: IS_TV ? 56 : 44,
        height: IS_TV ? 56 : 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlBtnMain: {
        width: IS_TV ? 64 : 48,
        height: IS_TV ? 64 : 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playBtn: {
        width: IS_TV ? 88 : 72,
        height: IS_TV ? 88 : 72,
        borderRadius: IS_TV ? 44 : 36,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 12,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
    },
    secondaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: IS_TV ? 20 : 16,
        gap: IS_TV ? 40 : 32,
    },
    secBtn: {
        padding: 8,
    },
    trackCounter: {
        fontSize: IS_TV ? 16 : 13,
        fontWeight: '600',
    },
    lyricsContainer: {
        width: '100%',
        paddingHorizontal: IS_TV ? 48 : 24,
        paddingTop: 20,
        marginTop: 12,
        borderTopWidth: 1,
    },
    lyricsTitle: {
        fontSize: IS_TV ? 18 : 15,
        fontWeight: '700',
        marginBottom: 12,
    },
    lyricsText: {
        fontSize: IS_TV ? 16 : 14,
        lineHeight: IS_TV ? 28 : 24,
        letterSpacing: 0.3,
    },
    queueSection: {
        width: '100%',
        paddingHorizontal: IS_TV ? 48 : 24,
        paddingTop: 20,
        marginTop: 40,
    },
    queueHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    queueTitle: {
        fontSize: IS_TV ? 18 : 15,
        fontWeight: '700',
    },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 0.5,
    },
    queueItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    queueThumb: {
        width: 40,
        height: 40,
        borderRadius: 6,
    },
    queueThumbFallback: {
        width: 40,
        height: 40,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    queueInfo: {
        marginLeft: 12,
        flex: 1,
    },
    queueTrackTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    queueTrackArtist: {
        fontSize: 12,
        marginTop: 2,
    },
});
