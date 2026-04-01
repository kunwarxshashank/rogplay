import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Animated,
    FlatList,
    useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getTrending } from '@/services/tmdb';
import { Colors } from '@/constants/Colors';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TVFocusable } from '@/components/TVFocusable';
import { useSettingsStore } from '@/store/settingsStore';

const SIDEBAR_WIDTH = 86;
const AUTO_SCROLL_INTERVAL = 8000;

export default function TVHeroSlider() {
    const [trending, setTrending] = useState<any[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);
    const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const router = useRouter();
    const theme = useSettingsStore((state) => state.theme);
    const c = React.useMemo(() => Colors[theme] || Colors.dark, [theme]);

    const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
    const SLIDE_W = SCREEN_W - SIDEBAR_WIDTH;
    const HERO_H = SCREEN_H;

    useEffect(() => {
        loadData();
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (trending.length <= 1) return;
        startAutoScroll();
        return () => stopAutoScroll();
    }, [trending.length, startAutoScroll, stopAutoScroll]);

    const stopAutoScroll = React.useCallback(() => {
        if (autoScrollTimer.current) {
            clearInterval(autoScrollTimer.current);
            autoScrollTimer.current = null;
        }
    }, []);

    const startAutoScroll = React.useCallback(() => {
        stopAutoScroll();
        autoScrollTimer.current = setInterval(() => {
            const nextIndex = (activeIndex + 1) % trending.length;
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
            setActiveIndex(nextIndex);
        }, AUTO_SCROLL_INTERVAL);
    }, [activeIndex, trending.length, stopAutoScroll]);

    const loadData = React.useCallback(async () => {
        try {
            const response = await getTrending('week');
            const data = response.results || [];
            setTrending(data.slice(0, 6));
        } catch (error) {
            console.error('Error loading trending for TV Hero:', error);
        }
    }, []);

    const handlePress = React.useCallback((item: any) => {
        router.push({
            pathname: '/(tv)/details/[type]/[id]',
            params: { id: item.id, type: item.media_type || 'movie' }
        });
    }, [router]);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index || 0);
        }
    }).current;

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const getYearFromDate = (dateStr?: string) => {
        if (!dateStr) return '';
        return dateStr.split('-')[0];
    };

    const getRatingStars = (rating: number) => {
        return (rating / 2).toFixed(1);
    };

    const renderSlide = React.useCallback(
        ({ item, index }: { item: any; index: number }) => {
            const backdropUrl = `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${item.backdrop_path}`;
            const year = getYearFromDate(item.release_date || item.first_air_date);
            const rating = item.vote_average || 0;
            const mediaType = item.media_type === 'tv' ? 'Series' : 'Movie';
            const overview = item.overview || '';

            return (
                <View style={[styles.slide, { width: SLIDE_W, height: HERO_H }]}>
                    {/* Background image */}
                    <Image
                        source={{ uri: backdropUrl }}
                        style={styles.backdrop}
                        resizeMode="cover"
                    />

                    {/* Gradient overlays for cinematic depth */}
                    {/* Left edge fade — deep for text readability */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.3)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0.7, y: 0 }}
                        style={styles.gradientOverlay}
                    />

                    {/* Bottom fade — anchors content */}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.95)', '#000']}
                        start={{ x: 0, y: 0.3 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.gradientOverlay}
                    />

                    {/* Top subtle vignette */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.4)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.15 }}
                        style={styles.gradientOverlay}
                    />

                    {/* Content overlay */}
                    <View style={[styles.contentWrap, { maxWidth: SLIDE_W * 0.55 }]}>
                        {/* Rank indicator */}
                        <View style={styles.rankRow}>
                            <View style={[styles.rankBadge, { backgroundColor: c.primary }]}>
                                <Text style={styles.rankNumber}>#{index + 1}</Text>
                            </View>
                            <Text style={styles.trendingLabel}>TRENDING THIS WEEK</Text>
                        </View>

                        {/* Title */}
                        <Text style={styles.title} numberOfLines={2}>
                            {item.title || item.name}
                        </Text>

                        {/* Meta info row */}
                        <View style={styles.metaRow}>
                            {/* Rating */}
                            <View style={styles.metaChip}>
                                <MaterialIcons name="star" size={15} color="#fbbf24" />
                                <Text style={styles.metaChipText}>{getRatingStars(rating)}</Text>
                            </View>

                            {/* Year */}
                            {year ? (
                                <View style={styles.metaChip}>
                                    <MaterialIcons name="calendar-today" size={13} color="rgba(255,255,255,0.7)" />
                                    <Text style={styles.metaChipText}>{year}</Text>
                                </View>
                            ) : null}

                            {/* Media type */}
                            <View style={[styles.metaChip, { backgroundColor: 'rgba(99,102,241,0.2)' }]}>
                                <MaterialIcons
                                    name={item.media_type === 'tv' ? 'live-tv' : 'movie'}
                                    size={13}
                                    color="rgba(165,180,252,0.9)"
                                />
                                <Text style={[styles.metaChipText, { color: 'rgba(165,180,252,0.9)' }]}>{mediaType}</Text>
                            </View>
                        </View>

                        {/* Overview */}
                        {overview ? (
                            <Text style={styles.overview} numberOfLines={3}>
                                {overview}
                            </Text>
                        ) : null}

                        {/* Action buttons */}
                        <View style={styles.actionRow}>
                            <TVFocusable
                                onPress={() => handlePress(item)}
                                onFocus={() => stopAutoScroll()}
                                onBlur={() => startAutoScroll()}
                                style={styles.watchBtnWrap}
                                nativeID={`tv-hero-play-${index}`}
                                focusedScale={1.06}
                                autoFlex={false}
                            >
                                {({ focused }) => (
                                    <View style={[styles.watchBtn, {
                                        backgroundColor: focused ? '#fff' : c.primary,
                                    }]}>
                                        <Ionicons
                                            name="play"
                                            size={22}
                                            color={focused ? '#000' : '#fff'}
                                        />
                                        <Text style={[styles.watchBtnText, {
                                            color: focused ? '#000' : '#fff',
                                        }]}>Watch Now</Text>
                                    </View>
                                )}
                            </TVFocusable>

                            <TVFocusable
                                onPress={() => handlePress(item)}
                                onFocus={() => stopAutoScroll()}
                                onBlur={() => startAutoScroll()}
                                style={styles.infoBtnWrap}
                                nativeID={`tv-hero-info-${index}`}
                                focusedScale={1.06}
                                autoFlex={false}
                            >
                                {({ focused }) => (
                                    <View style={[styles.infoBtn, {
                                        backgroundColor: focused ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                                        borderColor: focused ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                                    }]}>
                                        <MaterialIcons name="info-outline" size={20} color="#fff" />
                                        <Text style={styles.infoBtnText}>More Info</Text>
                                    </View>
                                )}
                            </TVFocusable>
                        </View>
                    </View>
                </View>
            );
        },
        [SLIDE_W, HERO_H, c, handlePress, stopAutoScroll, startAutoScroll]
    );

    if (trending.length === 0) return null;

    return (
        <View style={[styles.container, { width: SLIDE_W, height: HERO_H }]}>
            <FlatList
                ref={flatListRef}
                data={trending}
                renderItem={renderSlide}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id.toString()}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={(_, index) => ({
                    length: SLIDE_W,
                    offset: SLIDE_W * index,
                    index,
                })}
            />

            {/* Pagination bar — bottom center */}
            <View style={styles.paginationWrap}>
                <View style={styles.paginationContainer}>
                    {trending.map((_, i) => {
                        const isActive = i === activeIndex;
                        return (
                            <View
                                key={i}
                                style={[
                                    styles.pagBar,
                                    {
                                        width: isActive ? 32 : 10,
                                        backgroundColor: isActive ? c.primary : 'rgba(255,255,255,0.3)',
                                        opacity: isActive ? 1 : 0.6,
                                    },
                                ]}
                            />
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    slide: {
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
    },

    /* ── Content ──────────────────────────── */
    contentWrap: {
        paddingLeft: 72,
        paddingBottom: 80,
        zIndex: 10,
    },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 18,
    },
    rankBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
    },
    rankNumber: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Outfit_800ExtraBold',
        letterSpacing: 0.5,
    },
    trendingLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 3,
    },
    title: {
        fontSize: 56,
        color: '#fff',
        fontFamily: 'Outfit_800ExtraBold',
        lineHeight: 64,
        marginBottom: 18,
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 3 },
        textShadowRadius: 12,
        letterSpacing: -0.5,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    metaChipText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontFamily: 'Outfit_600SemiBold',
    },
    overview: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Outfit_500Medium',
        lineHeight: 22,
        marginBottom: 28,
        letterSpacing: 0.2,
    },

    /* ── Buttons ──────────────────────────── */
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    watchBtnWrap: {
        borderRadius: 14,
    },
    watchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 14,
    },
    watchBtnText: {
        fontSize: 17,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.3,
    },
    infoBtnWrap: {
        borderRadius: 14,
    },
    infoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    infoBtnText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Outfit_600SemiBold',
    },

    /* ── Pagination ───────────────────────── */
    paginationWrap: {
        position: 'absolute',
        bottom: 28,
        left: 72,
        zIndex: 20,
    },
    paginationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pagBar: {
        height: 4,
        borderRadius: 2,
    },
});
