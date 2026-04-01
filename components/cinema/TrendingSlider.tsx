import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, Image, TouchableOpacity, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getTrending } from '@/services/tmdb';
import { Colors } from '@/constants/Colors';
import { Ionicons, } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TVFocusable } from '@/components/TVFocusable';
import { useSettingsStore } from '@/store/settingsStore';
import { TrendingSliderSkeleton } from '@/components/Skeleton';

const { width, height } = Dimensions.get('window');
const isTV = Platform.isTV;

interface TrendingSliderProps {
    fullScreen?: boolean;
}

const TVExpandedItem = ({ item, isFocused, onPress, onFocus, onBlur, currentColors }: any) => {
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
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.poster}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(6, 9, 18, 0.6)', 'rgba(6, 9, 18, 0.95)']}
                    locations={[0.2, 0.7, 1]}
                    style={styles.gradientImageLook}
                >
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
                </LinearGradient>
            </Animated.View>
        </TVFocusable>
    );
};

function TrendingSlider({ fullScreen = false }: TrendingSliderProps) {
    const [data, setData] = useState<any[]>([]);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);
    const router = useRouter();
    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const ITEM_WIDTH = useMemo(() => {
        if (fullScreen && isTV) return width * 0.82;
        return isTV ? width * 0.6 : width * 0.85;
    }, [fullScreen]);

    const ITEM_HEIGHT = useMemo(() => {
        if (fullScreen && isTV) return height * 0.45;
        return 220;
    }, [fullScreen]);

    const ITEM_MARGIN = isTV ? (fullScreen ? 20 : 10) : 10;
    const SNAP_INTERVAL = ITEM_WIDTH + ITEM_MARGIN * 2;
    const SPACER_WIDTH = (width - SNAP_INTERVAL) / 2;

    useEffect(() => {
        loadTrending();
    }, []);

    const loadTrending = async () => {
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
                setData([{ key: 'left-spacer' }, ...filtered, { key: 'right-spacer' }]);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => {
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
                    currentColors={currentColors}
                />
            );
        }

        // Standard / Mobile Layout
        const inputRange = [
            (index - 2) * SNAP_INTERVAL,
            (index - 1) * SNAP_INTERVAL,
            index * SNAP_INTERVAL,
        ];

        const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.92, 1, 0.92],
        });

        const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
        });

        const Container = Platform.isTV ? TVFocusable : TouchableOpacity;

        return (
            <Container
                activeOpacity={1}
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
                        transform: [{ scale: isFocused ? 1.02 : scale }],
                        opacity,
                        backgroundColor: currentColors.card
                    },
                ]}>
                    <Image
                        source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${item.backdrop_path}` }}
                        style={styles.poster}
                    />

                    <LinearGradient
                        colors={['transparent', 'rgba(6, 9, 18, 0.4)', 'rgba(6, 9, 18, 0.9)', '#060912']}
                        locations={[0, 0.5, 0.8, 1]}
                        style={styles.gradient}
                    >
                        <View style={styles.contentWrap}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>TRENDING</Text>
                            </View>
                            <Text style={styles.title} numberOfLines={1}>
                                {item.title || item.name}
                            </Text>
                            <View style={styles.metaRow}>
                                <View style={styles.metaItem}>
                                    <Ionicons name="calendar-outline" size={12} color={currentColors.primary} />
                                    <Text style={[styles.metaText, { color: currentColors.textSecondary }]}>
                                        {new Date(item.release_date || item.first_air_date).getFullYear()}
                                    </Text>
                                </View>
                                <View style={styles.dot} />
                                <View style={styles.metaItem}>
                                    <Ionicons name="star" size={12} color="#f59e0b" />
                                    <Text style={[styles.metaText, { color: currentColors.textSecondary }]}>
                                        {item.vote_average?.toFixed(1)}
                                    </Text>
                                </View>
                                <View style={styles.dot} />
                                <View style={styles.metaItem}>
                                    <Text style={[styles.typeText, { color: currentColors.primary }]}>
                                        {(item.media_type || 'Movie').toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>
            </Container>
        );
    };

    if (data.length === 0) {
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
                snapToInterval={(!fullScreen || !isTV) ? SNAP_INTERVAL : undefined}
                decelerationRate="fast"
                bounces={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 32,
        marginTop: 10
    },
    flatListContent: {
        alignItems: 'center',
    },
    itemContainer: {
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
    },
    poster: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%',
        justifyContent: 'flex-end',
        padding: 40,
        paddingBottom: 40,
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
        fontSize: 22,
        fontFamily: 'Outfit_800ExtraBold',
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.7)',
        textShadowOffset: { width: 0, height: 3 },
        textShadowRadius: 6,
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

