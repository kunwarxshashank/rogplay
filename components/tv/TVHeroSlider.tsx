import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    FlatList,
    useWindowDimensions,
} from 'react-native';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { getTrending } from '@/services/tmdb';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TVFocusable } from '@/components/TVFocusable';
import { useThemeStore, computeThemeColors } from '@/store/themeStore';

const SIDEBAR_WIDTH = 86;
const AUTO_SCROLL_INTERVAL = 8000;

export default function TVHeroSlider({ variant = 'traditional' }: { variant?: 'traditional' | 'fullscreen' }) {
    const [trending, setTrending] = useState<any[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);
    const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const router = useRouter();
    const ts = useThemeStore();
    const c = React.useMemo(() => computeThemeColors(ts.themePalette, ts.accentColorId, ts.customHexAccent, ts.borderRadius, ts.cardElevation, ts.animationIntensity), [ts.themePalette, ts.accentColorId, ts.customHexAccent, ts.borderRadius, ts.cardElevation, ts.animationIntensity]);

    const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
    const SLIDE_W = SCREEN_W - SIDEBAR_WIDTH;
    const HERO_H = SCREEN_H;

    useEffect(() => {
        loadData();
    }, []);

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

    // Auto-scroll
    useEffect(() => {
        if (trending.length <= 1) return;
        startAutoScroll();
        return () => stopAutoScroll();
    }, [trending.length, startAutoScroll, stopAutoScroll]);

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
            const isFullscreen = variant === 'fullscreen';

            return (
                <View style={[styles.slide, { width: SLIDE_W, height: HERO_H }]}>
                    <OptimizedImage
                        source={{ uri: backdropUrl }}
                        style={styles.backdrop}
                        resizeMode="cover"
                    />

                    {isFullscreen ? (
                        <>
                            {c.isAmoled ? (
                                <View style={StyleSheet.absoluteFill} />
                            ) : (
                                <LinearGradient
                                    colors={['transparent', c.background]}
                                    start={{ x: 0, y: 0.3 }}
                                    end={{ x: 0, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                            )}
                            <LinearGradient
                                colors={[c.primary + '30', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={[StyleSheet.absoluteFill, { height: HERO_H * 0.6 }]}
                            />
                            <View style={[styles.contentWrap, { maxWidth: SLIDE_W * 0.6, justifyContent: 'flex-end', paddingBottom: 60 }]}>
                                <Text style={styles.rankNumber}>#{index + 1}</Text>
                                <Text style={[styles.title, { fontSize: 56 }]} numberOfLines={2}>
                                    {item.title || item.name}
                                </Text>
                                <View style={styles.metaRow}>
                                    <View style={styles.metaChip}>
                                        <MaterialIcons name="star" size={15} color="#fbbf24" />
                                        <Text style={styles.metaChipText}>{getRatingStars(rating)}</Text>
                                    </View>
                                    {year ? (
                                        <View style={styles.metaChip}>
                                            <MaterialIcons name="calendar-today" size={13} color="rgba(255,255,255,0.7)" />
                                            <Text style={styles.metaChipText}>{year}</Text>
                                        </View>
                                    ) : null}
                                    <View style={[styles.metaChip, { backgroundColor: 'rgba(99,102,241,0.2)' }]}>
                                        <MaterialIcons name={item.media_type === 'tv' ? 'live-tv' : 'movie'} size={13} color="rgba(165,180,252,0.9)" />
                                        <Text style={[styles.metaChipText, { color: 'rgba(165,180,252,0.9)' }]}>{mediaType}</Text>
                                    </View>
                                </View>
                                {overview ? (
                                    <Text style={styles.overview} numberOfLines={2}>{overview}</Text>
                                ) : null}
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
                                            <View style={[styles.watchBtn, { backgroundColor: focused ? '#fff' : c.primary }]}>
                                                <Ionicons name="play" size={22} color={focused ? '#000' : '#fff'} />
                                                <Text style={[styles.watchBtnText, { color: focused ? '#000' : '#fff' }]}>Watch Now</Text>
                                            </View>
                                        )}
                                    </TVFocusable>
                                </View>
                            </View>
                        </>
                    ) : (
                        <>
                            {c.isAmoled ? (
                                <View style={styles.gradientOverlay} />
                            ) : (
                                <LinearGradient
                                    colors={[c.background + 'F2', c.background + 'BF', c.background + '4D', 'transparent']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 0.7, y: 0 }}
                                    style={styles.gradientOverlay}
                                />
                            )}
                            <LinearGradient
                                colors={['transparent', c.background + '66', c.background + 'F2', c.background]}
                                start={{ x: 0, y: 0.3 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.gradientOverlay}
                            />
                            <LinearGradient
                                colors={[c.background + '66', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 0.15 }}
                                style={styles.gradientOverlay}
                            />
                            <View style={[styles.contentWrap, { maxWidth: SLIDE_W * 0.55 }]}>
                                <View style={styles.rankRow}>
                                    <View style={[styles.rankBadge, { backgroundColor: c.primary }]}>
                                        <Text style={styles.rankNumber}>#{index + 1}</Text>
                                    </View>
                                    <Text style={styles.trendingLabel}>TRENDING THIS WEEK</Text>
                                </View>
                                <Text style={styles.title} numberOfLines={2}>
                                    {item.title || item.name}
                                </Text>
                                <View style={styles.metaRow}>
                                    <View style={styles.metaChip}>
                                        <MaterialIcons name="star" size={15} color="#fbbf24" />
                                        <Text style={styles.metaChipText}>{getRatingStars(rating)}</Text>
                                    </View>
                                    {year ? (
                                        <View style={styles.metaChip}>
                                            <MaterialIcons name="calendar-today" size={13} color="rgba(255,255,255,0.7)" />
                                            <Text style={styles.metaChipText}>{year}</Text>
                                        </View>
                                    ) : null}
                                    <View style={[styles.metaChip, { backgroundColor: 'rgba(99,102,241,0.2)' }]}>
                                        <MaterialIcons name={item.media_type === 'tv' ? 'live-tv' : 'movie'} size={13} color="rgba(165,180,252,0.9)" />
                                        <Text style={[styles.metaChipText, { color: 'rgba(165,180,252,0.9)' }]}>{mediaType}</Text>
                                    </View>
                                </View>
                                {overview ? (
                                    <Text style={styles.overview} numberOfLines={3}>{overview}</Text>
                                ) : null}
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
                                            <View style={[styles.watchBtn, { backgroundColor: focused ? '#fff' : c.primary }]}>
                                                <Ionicons name="play" size={22} color={focused ? '#000' : '#fff'} />
                                                <Text style={[styles.watchBtnText, { color: focused ? '#000' : '#fff' }]}>Watch Now</Text>
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
                                            <View style={[styles.infoBtn, { backgroundColor: focused ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', borderColor: focused ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)' }]}>
                                                <MaterialIcons name="info-outline" size={20} color="#fff" />
                                                <Text style={styles.infoBtnText}>More Info</Text>
                                            </View>
                                        )}
                                    </TVFocusable>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            );
        },
        [SLIDE_W, HERO_H, c, handlePress, stopAutoScroll, startAutoScroll, variant]
    );

    if (trending.length === 0) return null;

    return (
        <View style={[styles.container, { backgroundColor: c.background, width: SLIDE_W, height: HERO_H }]}>
            <FlatList
                ref={flatListRef}
                data={trending}
                renderItem={renderSlide}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id.toString()}
                initialNumToRender={Math.min(6, trending.length)}
                maxToRenderPerBatch={6}
                windowSize={3}
                removeClippedSubviews={true}
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
        fontSize: 64,
        color: '#fff',
        fontFamily: 'PlayfairDisplay_700Bold',
        lineHeight: 72,
        marginBottom: 18,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 16,
        letterSpacing: 0,
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
        borderRadius: 4,
        overflow: 'hidden',
    },
    watchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 4,
    },
    watchBtnText: {
        fontSize: 17,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.3,
    },
    infoBtnWrap: {
        borderRadius: 4,
        overflow: 'hidden',
    },
    infoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 4,
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
