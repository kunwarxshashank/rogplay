import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, Image,
    FlatList, Dimensions, ScrollView, Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDetails } from '@/services/tmdb';
import { TVFocusable } from '@/components/TVFocusable';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useToastStore } from '@/store/toastStore';

import { TVDetailsSkeleton } from '@/components/Skeleton';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const hexAlpha = (hex: string, alpha: number) => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return hex + a;
};

export default function TVDetailsScreen() {
    const { colors: c } = useTheme();
    const { type, id } = useLocalSearchParams();
    const router = useRouter();
    const gradients = c.gradients || { primary: [c.primary, c.primary] };
    const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
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
        const primaryGenre = details.genres && details.genres.length > 0 ? details.genres[0].name : '';
        router.push({
            pathname: '/(tv)/server-selection',
            params: {
                id: details.id,
                season: 1,
                episode: 1,
                type: type as string,
                title: details.title || details.name,
                poster: details.poster_path,
                backdrop: details.backdrop_path,
                genre: primaryGenre,
            },
        });
    };

    const handleSeasonPress = (season: any) => {
        const primaryGenre = details.genres && details.genres.length > 0 ? details.genres[0].name : '';
        router.push({
            pathname: `/(tv)/season/${id}/${season.season_number}`,
            params: {
                showName: details.name,
                backdrop: details.backdrop_path,
                genre: primaryGenre,
            },
        });
    };

    const isSeries = type === 'tv';
    const favoriteId = `${type}:${id}`;
    const favoriteActive = useFavoritesStore((state) => state.isFavorite(favoriteId));
    const seasons = details?.seasons?.filter((s: any) => s.season_number > 0) || [];

    const cast = details?.credits?.cast?.slice(0, 15) || [];
    const providersUS = details?.['watch/providers']?.results?.US;
    const allProviders = [
        ...(providersUS?.flatrate || []),
        ...(providersUS?.rent || []),
        ...(providersUS?.buy || [])
    ];
    const uniqueProviders = allProviders.filter((v, i, a) => a.findIndex(v2 => (v2.provider_id === v.provider_id)) === i);
    const providerLink = providersUS?.link;

    const handleToggleFavorite = () => {
        const exists = useFavoritesStore.getState().isFavorite(favoriteId);
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

    if (loading) return <TVDetailsSkeleton />;
    if (!details) return null;

    const year = (details.release_date || details.first_air_date || '').split('-')[0];
    const rating = details.vote_average?.toFixed(1);
    const genres = details.genres?.slice(0, 3) || [];
    const runtime = details.runtime
        ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
        : details.episode_run_time?.[0]
            ? `${details.episode_run_time[0]} min/ep`
            : null;

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
                nativeID={`tv-season-${item.season_number}`}
                focusedScale={1.05}
                focusedBorderColor={c.primary}
            >
                {posterUri ? (
                    <Image source={{ uri: posterUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.card }]} />
                )}
                <LinearGradient
                    colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.75)']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                />
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
                <View style={styles.seasonCardBottom}>
                    <Text style={styles.seasonCardTitle} numberOfLines={1}>{item.name}</Text>
                    {item.air_date && <Text style={styles.seasonCardYear}>{item.air_date.split('-')[0]}</Text>}
                </View>
            </TVFocusable>
        );
    };

    const renderCastCard = ({ item, index }: { item: any; index: number }) => (
        <TVFocusable
            key={item.id}
            style={[styles.castCard, { backgroundColor: c.card }]}
            onPress={() => router.push(`/(tv)/person/${item.id}` as any)}
            nativeID={`tv-cast-${item.id}`}
            focusedScale={1.05}
            focusedBorderColor={c.primary}
        >
            {item.profile_path ? (
                <Image source={{ uri: `https://image.tmdb.org/t/p/w300${item.profile_path}` }} style={styles.castImage} />
            ) : (
                <View style={[styles.castImage, styles.castImagePlaceholder, { backgroundColor: c.border }]}>
                    <MaterialIcons name="person" size={40} color={c.textSecondary} />
                </View>
            )}
            <View style={styles.castInfo}>
                <Text style={[styles.castName, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.castCharacter, { color: c.textSecondary }]} numberOfLines={1}>{item.character}</Text>
            </View>
        </TVFocusable>
    );

    const renderProviderCard = ({ item, index }: { item: any; index: number }) => (
        <TVFocusable
            key={item.provider_id}
            style={styles.providerCard}
            onPress={() => {
                const query = encodeURIComponent(`${details.title || details.name} ${item.provider_name}`);
                Linking.openURL(`https://www.google.com/search?q=${query}`).catch(() => {});
            }}
            nativeID={`tv-provider-${item.provider_id}`}
            focusedScale={1.1}
            focusedBorderColor={c.primary}
        >
            <Image source={{ uri: `https://image.tmdb.org/t/p/w154${item.logo_path}` }} style={styles.providerLogo} />
        </TVFocusable>
    );

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <Image
                source={{ uri: `https://image.tmdb.org/t/p/original${details.backdrop_path}` }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                blurRadius={1}
            />
            <LinearGradient
                colors={['transparent', c.background]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0.2 }} end={{ x: 0, y: 0.85 }}
            />
            <LinearGradient
                colors={[`${c.background}DD`, 'transparent', `${c.background}AA`]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0 }}
            />

            <ScrollView 
                style={styles.mainContent} 
                contentContainerStyle={{ paddingBottom: 60 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.topSection}>
                    <View style={styles.posterWrap}>
                        <Image source={{ uri: `https://image.tmdb.org/t/p/w500${details.poster_path}` }} style={styles.poster} />
                    </View>
                    <View style={styles.infoSection}>
                        {genres.length > 0 && (
                            <View style={styles.genresRow}>
                                {genres.map((g: any) => (
                                    <View key={g.id} style={[styles.genrePill, { borderColor: hexAlpha(c.text, 0.2) }]}>
                                        <Text style={[styles.genreText, { color: c.text }]}>{g.name}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
                            {details.title || details.name}
                        </Text>
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
                                    <Text style={[styles.metaText, { color: c.textSecondary }]}>{seasons.length} Season{seasons.length > 1 ? 's' : ''}</Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={[styles.overview, { color: c.textSecondary }]} numberOfLines={4}>
                            {details.overview}
                        </Text>
                        <View style={styles.actions}>
                            <TVFocusable
                                style={styles.playBtnWrap}
                                onPress={handlePlay}
                                nativeID="tv-detail-play"
                                focusedScale={1.05}
                                hasTVPreferredFocus={true}
                            >
                                <LinearGradient
                                    colors={gradients.primary as any}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={styles.playBtnContent}>
                                    <MaterialIcons name="play-arrow" size={28} color="#fff" />
                                    <Text style={styles.playBtnText}>{isSeries ? 'Play S1 E1' : 'Play Now'}</Text>
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
                                    <Text style={[styles.secondaryBtnText, { color: c.text }]}>{favoriteActive ? 'Unfavourite' : 'Favourite'}</Text>
                                </View>
                            </TVFocusable>
                        </View>
                    </View>
                </View>

                {uniqueProviders.length > 0 && (
                    <View style={styles.listSection}>
                        <Text style={[styles.sectionTitle, { color: c.text }]}>Available On</Text>
                        <FlatList
                            data={uniqueProviders}
                            renderItem={renderProviderCard}
                            keyExtractor={(item: any) => item.provider_id.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingRight: 40 }}
                            ItemSeparatorComponent={() => <View style={{ width: 20 }} />}
                        />
                    </View>
                )}

                {cast.length > 0 && (
                    <View style={styles.listSection}>
                        <Text style={[styles.sectionTitle, { color: c.text }]}>Top Cast</Text>
                        <FlatList
                            data={cast}
                            renderItem={renderCastCard}
                            keyExtractor={(item: any) => item.id.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingRight: 40 }}
                            ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
                        />
                    </View>
                )}

                {isSeries && seasons.length > 0 && (
                    <View style={styles.listSection}>
                        <Text style={[styles.sectionTitle, { color: c.text }]}>All Seasons</Text>
                        <FlatList
                            data={seasons}
                            renderItem={renderSeasonCard}
                            keyExtractor={(item: any) => item.id.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingRight: 40 }}
                            ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
                        />
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const POSTER_W = 220;
const POSTER_H = 330;

const styles = StyleSheet.create({
    container: { flex: 1 },
    mainContent: {
        flex: 1,
        paddingTop: 40,
        paddingLeft: 50,
        paddingRight: 40,
    },
    topSection: { flexDirection: 'row', marginBottom: 40 },
    posterWrap: { marginRight: 36 },
    poster: { width: POSTER_W, height: POSTER_H, borderRadius: 16, backgroundColor: '#1a1a2e' },
    infoSection: { flex: 1, justifyContent: 'center', maxWidth: 650, paddingVertical: 10 },
    genresRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    genrePill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    genreText: { fontSize: 12, fontWeight: '600' },
    title: { fontSize: 36, fontWeight: '800', letterSpacing: 0.3, marginBottom: 10 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 14 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { fontSize: 14, fontWeight: '500' },
    overview: { fontSize: 15, lineHeight: 23, marginBottom: 20, opacity: 0.85 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    playBtnWrap: { height: 52, paddingHorizontal: 28, borderRadius: 26, overflow: 'hidden' },
    playBtnContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    playBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', paddingHorizontal: 5 },
    secondaryBtn: { height: 52, paddingHorizontal: 24, borderRadius: 26, borderWidth: 1 },
    secondaryBtnContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    secondaryBtnText: { fontSize: 16, fontWeight: '600' },
    listSection: { marginBottom: 30 },
    sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 14 },
    seasonCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, position: 'relative' },
    seasonBadgesRow: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6, zIndex: 2 },
    seasonBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    seasonBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    seasonCardBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 12, paddingBottom: 10, paddingTop: 30 },
    seasonCardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
    seasonCardYear: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500', marginTop: 2 },
    castCard: { width: 140, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
    castImage: { width: '100%', height: 180, resizeMode: 'cover' },
    castImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
    castInfo: { padding: 10 },
    castName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    castCharacter: { fontSize: 12 },
    providerCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
    providerLogo: { width: 60, height: 60, borderRadius: 14 }
});
