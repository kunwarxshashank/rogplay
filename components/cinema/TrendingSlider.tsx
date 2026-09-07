import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Animated, Platform } from 'react-native';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { getTrending } from '@/services/tmdb';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useToastStore } from '@/store/toastStore';
import { TVFocusable } from '@/components/TVFocusable';
import { TrendingSliderSkeleton } from '@/components/Skeleton';
import { useTheme } from '@/hooks/useTheme';

const { width, height } = Dimensions.get('window');
const isTV = Platform.isTV;

const NUM_PARTICLES = 15;

const BurningAshes = ({ color }: { color: string }) => {
    const particles = useRef([...Array(NUM_PARTICLES)].map(() => ({
        animY: new Animated.Value(0),
        animX: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(Math.random() * 0.6 + 0.4),
        startX: Math.random() * 100,
        delay: Math.random() * 2000,
        duration: Math.random() * 1500 + 2000,
    }))).current;

    useEffect(() => {
        const startAnim = (p: any) => {
            p.animY.setValue(0);
            p.animX.setValue(0);
            p.opacity.setValue(0);

            Animated.sequence([
                Animated.delay(p.delay),
                Animated.parallel([
                    Animated.timing(p.animY, {
                        toValue: -(Math.random() * 100 + 100),
                        duration: p.duration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(p.animX, {
                        toValue: (Math.random() - 0.5) * 60,
                        duration: p.duration,
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.timing(p.opacity, {
                            toValue: Math.random() * 0.6 + 0.4,
                            duration: p.duration * 0.2,
                            useNativeDriver: true,
                        }),
                        Animated.timing(p.opacity, {
                            toValue: 0,
                            duration: p.duration * 0.8,
                            useNativeDriver: true,
                        })
                    ])
                ])
            ]).start(() => startAnim({ ...p, delay: Math.random() * 500 }));
        };

        particles.forEach(startAnim);
    }, []);

    return (
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
            {particles.map((p, i) => (
                <Animated.View
                    key={i}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: `${p.startX}%`,
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: color,
                        shadowColor: color,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 1,
                        shadowRadius: 5,
                        elevation: 5,
                        opacity: p.opacity,
                        transform: [
                            { translateY: p.animY },
                            { translateX: p.animX },
                            { scale: p.scale }
                        ]
                    }}
                />
            ))}
        </View>
    );
};

interface TrendingSliderProps {
    fullScreen?: boolean;
    variant?: 'traditional' | 'fullscreen';
}

const TVExpandedItem = ({ item, isFocused, onPress, onFocus, onBlur }: any) => {
    const { colors: currentColors } = useTheme();
    // We animate the width based on focus
    const animWidth = useRef(new Animated.Value(isFocused ? width * 0.5 : width * 0.22)).current;

    useEffect(() => {
        Animated.spring(animWidth, {
            toValue: isFocused ? width * 0.5 : width * 0.22,
            useNativeDriver: false,
            friction: 8,
            tension: 50
        }).start();
    }, [isFocused]);

    // When focused, prefer wider backdrop. When unfocused, prefer portrait poster or keep backdrop if poster missing.
    const imagePath = isFocused ? (item.backdrop_path || item.poster_path) : (item.poster_path || item.backdrop_path);
    const imageUrl = `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${imagePath}`;

    const renderStars = (rating: number) => {
        const stars = [];
        const score = rating / 2;
        const fullStars = Math.floor(score);
        const hasHalfStar = score - fullStars >= 0.5;
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(<Ionicons key={i} name="star" size={14} color="#f59e0b" />);
            } else if (i === fullStars && hasHalfStar) {
                stars.push(<Ionicons key={i} name="star-half" size={14} color="#f59e0b" />);
            } else {
                stars.push(<Ionicons key={i} name="star-outline" size={14} color="#f59e0b" />);
            }
        }
        return stars;
    };

    return (
        <TVFocusable
            activeOpacity={1}
            style={{ marginHorizontal: 10 }}
            onPress={onPress}
            onFocus={onFocus}
            onBlur={onBlur}
        >
            <Animated.View style={[
                styles.itemContainer,
                {
                    width: animWidth,
                    height: height * 0.45,
                    backgroundColor: currentColors.card
                },
                isFocused && styles.focusMinimal
            ]}>
                <OptimizedImage
                    source={{ uri: imageUrl }}
                    style={styles.poster}
                    transition={0}
                />
                <View style={styles.gradientImageLook}>
                    <LinearGradient
                        colors={currentColors.isAmoled
                            ? ['transparent', 'rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.95)']
                            : ['transparent', 'rgba(6, 9, 18, 0.6)', 'rgba(6, 9, 18, 0.95)']}
                        locations={[0.2, 0.7, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.imageContentWrap}>
                        <Text style={[styles.title, { fontSize: isFocused ? 28 : 20 }]} numberOfLines={isFocused ? 2 : 1}>
                            {item.title || item.name}
                        </Text>
                        <View style={styles.ratingRowImageLook}>
                            <View style={styles.starsContainer}>
                                {renderStars(item.vote_average || 0)}
                            </View>
                            <Text style={styles.ratingTextImageLook}>
                                {item.vote_average?.toFixed(1)}
                            </Text>
                        </View>
                    </View>
                </View>
            </Animated.View>
        </TVFocusable>
    );
};

const FavoriteButton = ({ item, toggleFavorite, showToast }: any) => {
    const favId = `${item.media_type || 'movie'}:${item.id}`;
    const exists = useFavoritesStore((state) => state.isFavorite(favId));
    
    const scaleAnim = useRef(new Animated.Value(1)).current;
    
    // Track previous exists to only animate on change, not on mount
    const prevExists = useRef(exists);

    useEffect(() => {
        if (prevExists.current !== exists) {
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true })
            ]).start();
            prevExists.current = exists;
        }
    }, [exists]);

    return (
        <TouchableOpacity onPress={() => {
            toggleFavorite({
                id: favId,
                kind: item.media_type === 'tv' ? 'tv' : 'movie',
                title: item.title || item.name,
                subtitle: item.release_date || item.first_air_date,
                imageUrl: item.poster_path ? `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${item.poster_path}` : undefined,
                tmdbType: item.media_type as 'movie' | 'tv',
                tmdbId: String(item.id),
            });
            showToast(!exists ? 'Added to favourites' : 'Removed from favourites', 'success');
        }}>
            <BlurView intensity={40} tint="dark" style={styles.infoBtn}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <Ionicons name={exists ? "heart" : "heart-outline"} size={22} color={exists ? "#ff6b8a" : "#fff"} />
                </Animated.View>
            </BlurView>
        </TouchableOpacity>
    );
};

let cachedTrendingData: any[] | null = null;

function TrendingSlider({ fullScreen = false, variant = 'traditional' }: TrendingSliderProps) {
    const { colors: currentColors } = useTheme();
    const [data, setData] = useState<any[]>(cachedTrendingData || []);
    const [loading, setLoading] = useState(!cachedTrendingData);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);
    const router = useRouter();
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    
    const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
    const showToast = useToastStore((state) => state.showToast);

    const ITEM_WIDTH = useMemo(() => {
        if (fullScreen && isTV) return width * 0.82;
        return isTV ? width * 0.6 : width;
    }, [fullScreen]);

    const ITEM_HEIGHT = useMemo(() => {
        if (fullScreen && isTV) return height * 0.45;
        return 550;
    }, [fullScreen]);

    const ITEM_MARGIN = isTV ? (fullScreen ? 20 : 10) : 0;
    const SNAP_INTERVAL = ITEM_WIDTH + ITEM_MARGIN * 2;
    const SPACER_WIDTH = (width - SNAP_INTERVAL) / 2;

    useEffect(() => {
        if (!cachedTrendingData) {
            loadTrending();
        }
    }, []);

    const loadTrending = async () => {
        setLoading(true);
        try {
            const response = await getTrending('week');
            const results = response.results || [];

            if (fullScreen && isTV) {
                setData(results.slice(0, 10));
            } else {
                // Filter potential duplicates and keep order
                const seen = new Set();
                const filtered = results.slice(0, 10).filter((item: any) => {
                    const id = item.id?.toString();
                    if (!id || seen.has(id)) return false;
                    seen.add(id);
                    return true;
                });
                cachedTrendingData = [{ key: 'left-spacer' }, ...filtered, { key: 'right-spacer' }];
                setData(cachedTrendingData);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = useCallback(({ item, index }: { item: any, index: number }) => {
        if (!item.id && !item.backdrop_path) {
            return <View style={{ width: SPACER_WIDTH }} />;
        }

        const isFocused = focusedIndex === index;
        const onPress = () => router.push({
            pathname: Platform.isTV ? '/(tv)/details/[type]/[id]' : '/details/[type]/[id]',
            params: { id: item.id, type: item.media_type || 'movie' }
        });
        const onFocus = () => setFocusedIndex(index);
        const onBlur = () => setFocusedIndex(null);

        // TV Full Screen Animated Layout Custom
        if (fullScreen && isTV) {
            return (
                <TVExpandedItem
                    item={item}
                    isFocused={isFocused}
                    onPress={onPress}
                    onFocus={onFocus}
                    onBlur={onBlur}
                />
            );
        }

        // Standard / Mobile Layout
        const Container = Platform.isTV ? TVFocusable : TouchableOpacity;

        const rank = index; // account for left-spacer at index 0
        const year = (item.release_date || item.first_air_date || '').split('-')[0];
        const rating = item.vote_average ? item.vote_average.toFixed(1) : null;

        return (
            <Container
                activeOpacity={0.92}
                style={{ marginHorizontal: ITEM_MARGIN }}
                onPress={onPress}
                onFocus={onFocus}
                onBlur={onBlur}
            >
                <Animated.View style={[
                    styles.itemContainer,
                    {
                        width: ITEM_WIDTH,
                        height: ITEM_HEIGHT,
                        transform: [{ scale: isFocused ? 1.02 : 1 }],
                        backgroundColor: currentColors.card,
                        shadowColor: currentColors.primary,
                    },
                ]}>
                    <OptimizedImage
                        source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${item.poster_path || item.backdrop_path}` }}
                        style={styles.poster}
                        transition={0}
                    />



                    <View style={styles.gradient}>
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.95)', '#000000']}
                            locations={[0, 0.45, 0.8, 1]}
                            style={StyleSheet.absoluteFill}
                        />
                        <BurningAshes color={currentColors.primary} />
                        <View style={styles.contentWrap}>
                            <View style={{ alignSelf: 'flex-start', marginBottom: 10 }}>
                                <BlurView intensity={40} tint="dark" style={[styles.rankPill, { borderColor: currentColors.primary + '55' }]}>
                                    <Ionicons name="flame" size={12} color={currentColors.primary} />
                                    <Text style={[styles.rankPillText, { color: '#fff' }]}>#{rank} Trending</Text>
                                </BlurView>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                {rating && (
                                    <BlurView intensity={40} tint="dark" style={[styles.imdbPill, { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }]}>
                                        <Text style={[styles.imdbStar, { fontSize: 14 }]}>★</Text>
                                        <Text style={[styles.imdbText, { fontSize: 15, fontFamily: 'Outfit_700Bold' }]}>{rating}</Text>
                                    </BlurView>
                                )}
                                <Text style={[styles.title, { flex: 1, marginBottom: 0 }]} numberOfLines={2}>
                                    {item.title || item.name}
                                </Text>
                            </View>
                            <View style={styles.metaRow}>
                                <View style={[styles.typeChip, { backgroundColor: currentColors.primary }]}>
                                    <Text style={styles.typeChipText}>
                                        {(item.media_type || 'Movie').toUpperCase()}
                                    </Text>
                                </View>
                                {!!year && (
                                    <>
                                        <View style={styles.dot} />
                                        <View style={styles.metaItem}>
                                            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
                                            <Text style={[styles.metaText, { color: "rgba(255,255,255,0.7)" }]}>
                                                {year}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            <View style={styles.actionRow}>
                                <View style={[styles.playBtnWrap, { shadowColor: currentColors.primary }]}>
                                    <LinearGradient
                                        colors={[currentColors.primary, currentColors.primary + 'AA']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <View style={styles.playBtnInner}>
                                        <Ionicons name="play" size={18} color="#fff" style={{ marginLeft: 2 }} />
                                        <Text style={styles.playBtnText}>Play</Text>
                                    </View>
                                </View>
                                <FavoriteButton item={item} toggleFavorite={toggleFavorite} showToast={showToast} />
                            </View>
                        </View>
                    </View>
                </Animated.View>
            </Container>
        );
    }, [focusedIndex, fullScreen, ITEM_WIDTH, ITEM_HEIGHT, ITEM_MARGIN, SNAP_INTERVAL, SPACER_WIDTH, scrollX, variant, currentColors, router]);

    const realCount = Math.max(0, data.length - 2); // exclude two spacers

    if (loading) {
        return <TrendingSliderSkeleton fullScreen={fullScreen} />;
    }

    return (
        <View style={[styles.container, fullScreen && isTV && { marginTop: 40, marginBottom: 20 }]}>
            <Animated.FlatList
                ref={flatListRef}
                data={data}
                renderItem={renderItem}
                keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.flatListContent, fullScreen && isTV && { paddingHorizontal: 40 }]}
                snapToInterval={SNAP_INTERVAL}
                decelerationRate="fast"
                pagingEnabled={!isTV && ITEM_WIDTH === width}
                bounces={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                initialNumToRender={Math.min(6, data.length)}
                maxToRenderPerBatch={6}
                windowSize={5}
                removeClippedSubviews={false}
            />

            {/* Pagination dots (mobile only) */}
            {!isTV && realCount > 0 && (
                <View style={styles.pagination}>
                    {Array.from({ length: realCount }).map((_, i) => {
                        const inputRange = [
                            (i - 1) * SNAP_INTERVAL,
                            i * SNAP_INTERVAL,
                            (i + 1) * SNAP_INTERVAL,
                        ];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [6, 20, 6],
                            extrapolate: 'clamp',
                        });
                        const dotOpacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.paginationDot,
                                    { width: dotWidth, opacity: dotOpacity, backgroundColor: currentColors.primary },
                                ]}
                            />
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // No margin to allow edge-to-edge full-bleed
    },
    flatListContent: {
        alignItems: 'center',
    },
    itemContainer: {
        borderRadius: isTV ? 28 : 0,
        overflow: 'hidden',
        elevation: 16,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
    },
    poster: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    topScrim: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 90,
    },
    topRow: {
        position: 'absolute',
        top: 14,
        left: 14,
        right: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rankPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        overflow: 'hidden',
    },
    rankPillText: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.3,
    },
    imdbPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        overflow: 'hidden',
    },
    imdbStar: {
        color: '#f5c518',
        fontSize: 12,
    },
    imdbText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
        justifyContent: 'flex-end',
        padding: 24,
        paddingBottom: 24,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 16,
    },
    playBtnWrap: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    playBtnInner: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    playBtnText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.5,
    },
    infoBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    typeChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    typeChipText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Inter_700Bold',
        letterSpacing: 0.5,
    },
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
    },
    paginationDot: {
        height: 6,
        borderRadius: 3,
    },
    gradientImageLook: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70%',
        justifyContent: 'flex-end',
        padding: 24,
    },
    imageContentWrap: {
        gap: 6,
    },
    ratingRowImageLook: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    starsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    ratingTextImageLook: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
    },
    contentWrap: {
        gap: 6,
    },
    badge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Inter_700Bold',
        letterSpacing: 1.5,
    },
    title: {
        fontSize: 26,
        fontFamily: 'Outfit_800ExtraBold',
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 8,
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 13,
        fontFamily: 'Outfit_500Medium',
    },
    typeText: {
        fontSize: 11,
        fontFamily: 'Inter_600SemiBold',
        letterSpacing: 0.5,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    focusMinimal: {
        borderColor: 'rgba(255,255,255,0.7)',
        borderWidth: 3,
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
    }
});

export default React.memo(TrendingSlider);

