import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, Image,
    FlatList, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import { Colors } from '@/constants/Colors';
import { getDetails } from '@/services/tmdb';
import { TVFocusable } from '@/components/TVFocusable';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useToastStore } from '@/store/toastStore';

import { TVDetailsSkeleton } from '@/components/Skeleton';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const hexAlpha = (hex: string, alpha: number) => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return hex + a;
};

export default function TVDetailsScreen() {
    const { type, id } = useLocalSearchParams();
    const router = useRouter();
    const { theme } = useSettingsStore();
    const c = Colors[theme] || Colors.dark;
    const gradients = c.gradients || { primary: [c.primary, c.primary] };
    const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
    const isFavorite = useFavoritesStore((state) => state.isFavorite);
    const showToast = useToastStore((state) => state.showToast);

    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchDetails();
    }, [id, type]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const data = await getDetails(type as 'movie' | 'tv', id as string);
            setDetails(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlay = () => {
        router.push({
            pathname: '/(tv)/server-selection',
            params: {
                id: details.id,
                season: 1,
                episode: 1,
                type: type,
                title: details.title || details.name,
                poster: details.poster_path,
                backdrop: details.backdrop_path,
            },
        });
    };

    const handleSeasonPress = (season: any) => {
        router.push({
            pathname: `/(tv)/season/${id}/${season.season_number}`,
            params: {
                showName: details.name,
                backdrop: details.backdrop_path,
            },
        });
    };

    const isSeries = type === 'tv';
    const favoriteId = `${type}:${id}`;
    const favoriteActive = isFavorite(favoriteId);
    const seasons = details?.seasons?.filter((s: any) => s.season_number > 0) || [];

    const handleToggleFavorite = () => {
        const exists = isFavorite(favoriteId);
        toggleFavorite({
            id: favoriteId,
            kind: type === 'tv' ? 'tv' : 'movie',
            title: details.title || details.name,
            subtitle: details.release_date || details.first_air_date,
            imageUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : undefined,
            tmdbType: type as 'movie' | 'tv',
            tmdbId: String(id),
        });
        showToast(exists ? 'Removed from favourites' : 'Added to favourites', 'success');
    };

    // ── Loading ──────────────────────────────────
    if (loading) {
        return <TVDetailsSkeleton />;
    }

    if (!details) return null;

    const year = (details.release_date || details.first_air_date || '').split('-')[0];
    const rating = details.vote_average?.toFixed(1);
    const genres = details.genres?.slice(0, 3) || [];
    const runtime = details.runtime
        ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
        : details.episode_run_time?.[0]
            ? `${details.episode_run_time[0]} min/ep`
            : null;

    // ── Season card dimensions ───────────────────
    const SEASON_CARD_W = 240;
    const SEASON_CARD_H = 150;

    const renderSeasonCard = ({ item, index }: { item: any; index: number }) => {
        const posterUri = item.poster_path
            ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
            : details.backdrop_path
                ? `https://image.tmdb.org/t/p/w500${details.backdrop_path}`
                : null;
        return (
            <TVFocusable
                key={item.id}
                style={[styles.seasonCard, { width: SEASON_CARD_W, height: SEASON_CARD_H, borderColor: c.border }]}
                onPress={() => handleSeasonPress(item)}
                hasTVPreferredFocus={index === 0}
                nativeID={`tv-season-${item.season_number}`}
                focusedScale={1.05}
                focusedBorderColor={c.primary}
            >
                {/* Thumbnail */}
                {posterUri ? (
                    <Image source={{ uri: posterUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.card }]} />
                )}

                {/* Dark gradient overlay */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.75)']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                />

                {/* Top badges row */}
                <View style={styles.seasonBadgesRow}>
                    <View style={[styles.seasonBadge, { backgroundColor: hexAlpha(c.primary, 0.9) }]}>
                        <Text style={styles.seasonBadgeText}>S{item.season_number}</Text>
                    </View>
                    {item.episode_count > 0 && (
                        <View style={[styles.seasonBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                            <Text style={styles.seasonBadgeText}>{item.episode_count} EP</Text>
                        </View>
                    )}
                </View>

                {/* Bottom info */}
                <View style={styles.seasonCardBottom}>
                    <Text style={styles.seasonCardTitle} numberOfLines={1}>
                        {item.name}
                    </Text>
                    {item.air_date && (
                        <Text style={styles.seasonCardYear}>
                            {item.air_date.split('-')[0]}
                        </Text>
                    )}
                </View>
            </TVFocusable>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            {/* ── Full Backdrop ────────────────────────── */}
            <Image
                source={{ uri: `https://image.tmdb.org/t/p/original${details.backdrop_path}` }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                blurRadius={1}
            />
            {/* Gradient overlays */}
            <LinearGradient
                colors={['transparent', c.background]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0.2 }}
                end={{ x: 0, y: 0.85 }}
            />
            <LinearGradient
                colors={[`${c.background}DD`, 'transparent', `${c.background}AA`]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.6, y: 0 }}
            />

            {/* ── Main Content (no scroll) ─────────────── */}
            <View style={styles.mainContent}>

                {/* ── Top Section: Poster + Info ──────────── */}
                <View style={styles.topSection}>
                    {/* Poster */}
                    <View style={styles.posterWrap}>
                        <Image
                            source={{ uri: `https://image.tmdb.org/t/p/w500${details.poster_path}` }}
                            style={styles.poster}
                        />
                    </View>

                    {/* Info */}
                    <View style={styles.infoSection}>
                        {/* Genres */}
                        {genres.length > 0 && (
                            <View style={styles.genresRow}>
                                {genres.map((g: any) => (
                                    <View key={g.id} style={[styles.genrePill, { borderColor: hexAlpha(c.text, 0.2) }]}>
                                        <Text style={[styles.genreText, { color: c.text }]}>{g.name}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Title */}
                        <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
                            {details.title || details.name}
                        </Text>

                        {/* Meta row */}
                        <View style={styles.metaRow}>
                            {year ? (
                                <View style={styles.metaItem}>
                                    <MaterialIcons name="event" size={16} color={c.textSecondary} />
                                    <Text style={[styles.metaText, { color: c.textSecondary }]}>{year}</Text>
                                </View>
                            ) : null}
                            {rating && Number(rating) > 0 ? (
                                <View style={styles.metaItem}>
                                    <MaterialIcons name="star" size={16} color="#f59e0b" />
                                    <Text style={[styles.metaText, { color: c.textSecondary }]}>{rating}/10</Text>
                                </View>
                            ) : null}
                            {runtime ? (
                                <View style={styles.metaItem}>
                                    <MaterialIcons name="schedule" size={16} color={c.textSecondary} />
                                    <Text style={[styles.metaText, { color: c.textSecondary }]}>{runtime}</Text>
                                </View>
                            ) : null}
                            {isSeries && seasons.length > 0 ? (
                                <View style={styles.metaItem}>
                                    <MaterialIcons name="video-library" size={16} color={c.textSecondary} />
                                    <Text style={[styles.metaText, { color: c.textSecondary }]}>
                                        {seasons.length} Season{seasons.length > 1 ? 's' : ''}
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Overview */}
                        <Text
                            style={[styles.overview, { color: c.textSecondary }]}
                            numberOfLines={isSeries ? 3 : 5}
                        >
                            {details.overview}
                        </Text>

                        {/* Action buttons */}
                        <View style={styles.actions}>
                            <TVFocusable
                                style={styles.playBtnWrap}
                                onPress={handlePlay}
                                nativeID="tv-detail-play"
                                focusedScale={1.05}
                                hasTVPreferredFocus={!isSeries}
                            >
                                <LinearGradient
                                    colors={gradients.primary as any}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={styles.playBtnContent}>
                                    <MaterialIcons name="play-arrow" size={28} color="#fff" />
                                    <Text style={styles.playBtnText}>
                                        {isSeries ? 'Play S1 E1' : 'Play Now'}
                                    </Text>
                                </View>
                            </TVFocusable>

                            <TVFocusable
                                style={[styles.secondaryBtn, { borderColor: hexAlpha(c.text, 0.2) }]}
                                onPress={handleToggleFavorite}
                                nativeID="tv-detail-favorite"
                                focusedScale={1.05}
                            >
                                <View style={styles.secondaryBtnContent}>
                                    <MaterialIcons name={favoriteActive ? 'favorite' : 'favorite-border'} size={22} color={c.text} />
                                    <Text style={[styles.secondaryBtnText, { color: c.text }]}>
                                        {favoriteActive ? 'Unfavourite' : 'Favourite'}
                                    </Text>
                                </View>
                            </TVFocusable>

                            <TVFocusable
                                style={[styles.secondaryBtn, { borderColor: hexAlpha(c.text, 0.2) }]}
                                onPress={() => router.back()}
                                nativeID="tv-detail-back"
                                focusedScale={1.05}
                            >
                                <View style={styles.secondaryBtnContent}>
                                    <MaterialIcons name="arrow-back" size={22} color={c.text} />
                                    <Text style={[styles.secondaryBtnText, { color: c.text }]}>Back</Text>
                                </View>
                            </TVFocusable>
                        </View>
                    </View>
                </View>

                {/* ── Seasons Section (TV only) ──────────── */}
                {isSeries && seasons.length > 0 && (
                    <View style={styles.seasonsSection}>
                        <View style={styles.seasonsSectionHeader}>
                            {/* <View style={styles.seasonsHeaderLeft}>
                                <View style={[styles.seasonsIconWrap, { backgroundColor: hexAlpha(c.primary, 0.15) }]}>
                                    <MaterialIcons name="video-library" size={18} color={c.primary} />
                                </View>
                                <Text style={[styles.seasonsSectionTitle, { color: c.text }]}>All Seasons</Text>
                            </View> */}
                            {/* Pagination dots */}
                            <View style={styles.paginationDots}>
                                {seasons.length > 5 && (
                                    <Text style={[styles.scrollHint, { color: c.textSecondary }]}>
                                        Slide left to see more
                                    </Text>
                                )}
                            </View>
                        </View>

                        <FlatList
                            data={seasons}
                            renderItem={renderSeasonCard}
                            keyExtractor={(item: any) => item.id.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.seasonsListContent}
                            ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
                        />
                    </View>
                )}
            </View>
        </View>
    );
}

// ── Styles ──────────────────────────────────────
const POSTER_W = 220;
const POSTER_H = 330;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    /* ── Main layout ────────────────────────── */
    mainContent: {
        flex: 1,
        paddingTop: 40,
        paddingLeft: 50,
        paddingRight: 40,
        justifyContent: 'space-between',
    },

    /* ── Top section ────────────────────────── */
    topSection: {
        flexDirection: 'row',
        flex: 1,
    },
    posterWrap: {
        marginRight: 36,
    },
    poster: {
        width: POSTER_W,
        height: POSTER_H,
        borderRadius: 16,
        backgroundColor: '#1a1a2e',
    },

    /* ── Info ────────────────────────────────── */
    infoSection: {
        flex: 1,
        justifyContent: 'center',
        maxWidth: 650,
        paddingVertical: 10,
    },
    genresRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    genrePill: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    genreText: {
        fontSize: 12,
        fontWeight: '600',
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        letterSpacing: 0.3,
        marginBottom: 10,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        marginBottom: 14,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    metaText: {
        fontSize: 14,
        fontWeight: '500',
    },
    overview: {
        fontSize: 15,
        lineHeight: 23,
        marginBottom: 20,
        opacity: 0.85,
    },

    /* ── Actions ─────────────────────────────── */
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    playBtnWrap: {
        height: 52,
        paddingHorizontal: 28,
        borderRadius: 26,
        overflow: 'hidden',
    },
    playBtnContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    playBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        paddingHorizontal: 5,
    },
    secondaryBtn: {
        height: 52,
        paddingHorizontal: 24,
        borderRadius: 26,
        borderWidth: 1,
    },
    secondaryBtnContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },

    /* ── Seasons Section ─────────────────────── */
    seasonsSection: {
        marginTop: 50,
        paddingBottom: 8,
    },
    seasonsSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    seasonsHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    seasonsIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    seasonsSectionTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    paginationDots: {
        flex: 1,
        alignItems: 'center',
    },
    scrollHint: {
        fontSize: 12,
        opacity: 0.6,
    },
    seasonsListContent: {
        paddingRight: 40,
    },

    /* ── Season Card (episode-card style) ────── */
    seasonCard: {
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        position: 'relative',
    },
    seasonBadgesRow: {
        position: 'absolute',
        top: 10,
        left: 10,
        flexDirection: 'row',
        gap: 6,
        zIndex: 2,
    },
    seasonBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    seasonBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    seasonCardBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 12,
        paddingBottom: 10,
        paddingTop: 30,
    },
    seasonCardTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    seasonCardYear: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
});
