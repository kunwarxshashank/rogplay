import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMusicPlayerStore } from '@/store/musicPlayerStore';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

const MINI_HEIGHT = 64;
const BOTTOM_OFFSET = 85;

export default function MiniPlayer() {
    const { colors: activeColors } = useTheme();
    const router = useRouter();

    const tracks = useMusicPlayerStore(s => s.tracks);
    const currentIndex = useMusicPlayerStore(s => s.currentIndex);
    const isPlaying = useMusicPlayerStore(s => s.isPlaying);
    const togglePlaying = useMusicPlayerStore(s => s.togglePlaying);
    const reset = useMusicPlayerStore(s => s.reset);

    const slideAnim = useRef(new Animated.Value(MINI_HEIGHT)).current;
    const hasTracks = tracks.length > 0;
    const currentTrack = tracks[currentIndex];

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: hasTracks ? 0 : MINI_HEIGHT,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
        }).start();
    }, [hasTracks]);

    const handlePress = () => {
        // Navigate to full music-player screen
        // Pass tracks as param so the screen can rehydrate
        const encoded = encodeURIComponent(JSON.stringify(tracks));
        router.push(`/(mobile)/music-player?tracks=${encoded}&index=${currentIndex}`);
    };

    if (!hasTracks) return null;

    const formatTime = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: activeColors.surface,
                    borderTopColor: activeColors.border,
                    bottom: BOTTOM_OFFSET,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <TouchableOpacity
                style={styles.inner}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                {/* Album art */}
                <View style={styles.artWrap}>
                    {currentTrack?.poster ? (
                        <Image source={{ uri: currentTrack.poster }} style={styles.art} />
                    ) : (
                        <View style={[styles.artFallback, { backgroundColor: activeColors.card }]}>
                            <MaterialIcons name="music-note" size={20} color={activeColors.primary} />
                        </View>
                    )}
                </View>

                {/* Info */}
                <View style={styles.info}>
                    <Text style={[styles.title, { color: activeColors.text }]} numberOfLines={1}>
                        {currentTrack?.title || 'Unknown Track'}
                    </Text>
                    <Text style={[styles.artist, { color: activeColors.textSecondary }]} numberOfLines={1}>
                        {currentTrack?.artist || 'Unknown Artist'}
                    </Text>
                </View>

                {/* Controls */}
                <TouchableOpacity
                    onPress={(e) => {
                        e.stopPropagation();
                        togglePlaying();
                    }}
                    style={[styles.controlBtn, { backgroundColor: activeColors.primary + '20' }]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialIcons
                        name={isPlaying ? 'pause' : 'play-arrow'}
                        size={24}
                        color={activeColors.primary}
                    />
                </TouchableOpacity>

                {/* Close */}
                <TouchableOpacity
                    onPress={(e) => {
                        e.stopPropagation();
                        reset();
                    }}
                    style={styles.closeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialIcons name="close" size={20} color={activeColors.textSecondary} />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: MINI_HEIGHT,
        borderTopWidth: 1,
        zIndex: 100,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    inner: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    artWrap: {
        width: 44,
        height: 44,
        borderRadius: 8,
        overflow: 'hidden',
    },
    art: {
        width: 44,
        height: 44,
        resizeMode: 'cover',
    },
    artFallback: {
        width: 44,
        height: 44,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
    },
    artist: {
        fontSize: 12,
        marginTop: 2,
    },
    controlBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
});
