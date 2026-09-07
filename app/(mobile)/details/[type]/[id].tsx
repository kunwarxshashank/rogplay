import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Alert, ImageBackground, Animated, Linking, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { getDetails } from '@/services/tmdb';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAddonsStore } from '@/store/addonsStore';
import { DetailsSkeleton } from '@/components/Skeleton';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useToastStore } from '@/store/toastStore';
import { useTheme } from '@/hooks/useTheme';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function DetailsScreen() {
    const { colors: currentColors } = useTheme();
    const { id, type } = useLocalSearchParams();
    const [details, setDetails] = useState<any>(null);
    const router = useRouter();
    const { addons } = useAddonsStore();
    const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
    const showToast = useToastStore((state) => state.showToast);

    const scrollY = useRef(new Animated.Value(0)).current;

    const favoriteId = `${type}:${id}`;
    const favoriteActive = useFavoritesStore((state) => state.isFavorite(favoriteId));

    useEffect(() => {
        if (id && type) {
            getDetails(type as 'movie' | 'tv', id as string).then(setDetails).catch(console.error);
        }
    }, [id, type]);

    if (!details) return <DetailsSkeleton />;

    const truncateDescription = (text: string, wordLimit: number) => {
        if (!text) return '';
        const words = text.split(' ');
        if (words.length > wordLimit) {
            return words.slice(0, wordLimit).join(' ') + '...';
        }
        return text;
    };

    const handleWatch = () => {
        const cinemaAddons = addons.filter(addon => addon.type === 'cinema' || addon.type === 'movie');
        if (cinemaAddons.length === 0) {
            Alert.alert(
                'Cinema Addons Missing',
                'Please add cinema addons to use this feature. Go to Addons tab to add cinema sources.',
                [{ text: 'OK' }]
            );
            return;
        }

        const query = details.title || details.name;
        const primaryGenre = details.genres && details.genres.length > 0 ? details.genres[0].name : '';
        router.push({
            pathname: '/server-selection',
            params: {
                query: query,
                type: type as string,
                tmdb: id as string,
                title: details.title || details.name,
                poster: details.poster_path,
                backdrop: details.backdrop_path,
                genre: primaryGenre,
                ...(type === 'tv' && { season: 1, episode: 1 }),
            }
        });
    };

    const handleToggleFavorite = () => {
        const exists = useFavoritesStore.getState().isFavorite(favoriteId);
        toggleFavorite({
            id: favoriteId,
            kind: type === 'tv' ? 'tv' : 'movie',
            title: details.title || details.name,
            subtitle: details.release_date || details.first_air_date,
            imageUrl: details.poster_path ? `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${details.poster_path}` : undefined,
            tmdbType: type as 'movie' | 'tv',
            tmdbId: String(id),
        });
        showToast(exists ? 'Removed from favourites' : 'Added to favourites', 'success');
    };

    const renderCastItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.castItem}
            activeOpacity={0.7}
            onPress={() => router.push(`/person/${item.id}` as any)}
        >
            {item.profile_path ? (
                <Image
                    source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${item.profile_path}` }}
                    style={styles.castImage}
                />
            ) : (
                <View style={[styles.castImage, styles.castImagePlaceholder, { backgroundColor: currentColors.card }]}>
                    <MaterialIcons name="person" size={32} color={currentColors.textSecondary} />
                </View>
            )}
            <Text style={[styles.castName, { color: currentColors.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.castCharacter, { color: currentColors.textSecondary }]} numberOfLines={1}>{item.character}</Text>
        </TouchableOpacity>
    );

    // Extract providers and cast
    const cast = details.credits?.cast?.slice(0, 15) || [];
    const providersUS = details['watch/providers']?.results?.US; // Assuming US for now, could be dynamic
    const flatrateProviders = providersUS?.flatrate || [];
    const rentProviders = providersUS?.rent || [];
    const buyProviders = providersUS?.buy || [];
    const allProviders = [...flatrateProviders, ...rentProviders, ...buyProviders];
    const uniqueProviders = allProviders.filter((v, i, a) => a.findIndex(v2 => (v2.provider_id === v.provider_id)) === i);
    const providerLink = providersUS?.link;

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background }]}>

            {/* Header / Nav */}
            <SafeAreaView style={styles.headerSafeArea}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleToggleFavorite} style={styles.iconButton}>
                    <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
                    <MaterialIcons
                        name={favoriteActive ? 'favorite' : 'favorite-border'}
                        size={22}
                        color={favoriteActive ? '#ff6b8a' : '#fff'}
                    />
                </TouchableOpacity>
            </SafeAreaView>

            <Animated.ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            >
                <View style={styles.backdropContainer}>
                    <Animated.Image
                        source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${details.backdrop_path}` }}
                        style={[styles.backdrop, {
                            transform: [
                                {
                                    translateY: scrollY.interpolate({
                                        inputRange: [-300, 0, 300],
                                        outputRange: [-150, 0, 150],
                                        extrapolate: 'clamp',
                                    })
                                },
                                {
                                    scale: scrollY.interpolate({
                                        inputRange: [-300, 0],
                                        outputRange: [2, 1],
                                        extrapolateLeft: 'extend',
                                        extrapolateRight: 'clamp',
                                    })
                                }
                            ]
                        }]}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.4)', currentColors.background]}
                        locations={[0, 0.5, 1]}
                        style={styles.gradient}
                    />
                </View>

                <View style={styles.content}>
                    <View style={styles.posterAndTitleContainer}>
                        <Image
                            source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${details.poster_path}` }}
                            style={styles.poster}
                        />
                        <View style={styles.titleContainer}>
                            <Text style={[styles.title, { color: currentColors.text }]} numberOfLines={3}>{details.title || details.name}</Text>
                            <View style={styles.metaRow}>
                                <Text style={[styles.metaText, { color: currentColors.textSecondary }]}>
                                    {details.release_date || details.first_air_date ? new Date(details.release_date || details.first_air_date).getFullYear() : 'N/A'}
                                </Text>
                                <View style={[styles.dot, { backgroundColor: currentColors.textSecondary }]} />
                                <MaterialIcons name="star" size={14} color="#f5c518" style={{ marginRight: 2 }} />
                                <Text style={[styles.metaText, { color: currentColors.text }]}>{details.vote_average?.toFixed(1) || '0.0'}</Text>
                                <View style={[styles.dot, { backgroundColor: currentColors.textSecondary }]} />
                                <Text style={[styles.metaText, { color: currentColors.textSecondary }]}>{details.runtime || (details.episode_run_time ? details.episode_run_time[0] : '?')}m</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genresScroll} contentContainerStyle={{ alignItems: 'center' }}>
                                {details.genres?.map((g: any) => (
                                    <View key={g.id} style={[styles.genreChip, { backgroundColor: currentColors.card }]}>
                                        <Text style={[styles.genreText, { color: currentColors.textSecondary }]}>{g.name}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    {type === 'movie' && (
                        <TouchableOpacity style={styles.playButton} onPress={handleWatch} activeOpacity={0.8}>
                            <LinearGradient
                                colors={[currentColors.primary, currentColors.primary + 'B3']}
                                style={styles.playButtonGradient}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                <MaterialIcons name="play-circle-fill" size={28} color="#fff" />
                                <Text style={styles.playButtonText}>Watch Now</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 12 }]}>Storyline</Text>
                    <Text style={[styles.overview, { color: currentColors.textSecondary }]}>
                        {details.overview || 'No storyline available.'}
                    </Text>

                    {/* OTT Providers Section */}
                    {uniqueProviders.length > 0 && (
                        <View style={styles.sectionContainer}>
                            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Available On</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providersList}>
                                {uniqueProviders.map((provider: any) => (
                                    <TouchableOpacity
                                        key={provider.provider_id}
                                        style={styles.providerItem}
                                        onPress={() => {
                                            const query = encodeURIComponent(`${details.title || details.name} ${provider.provider_name}`);
                                            Linking.openURL(`https://www.google.com/search?q=${query}`).catch(() => {});
                                        }}
                                    >
                                        <Image
                                            source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${provider.logo_path}` }}
                                            style={styles.providerLogo}
                                        />
                                        <Text style={[styles.providerName, { color: currentColors.textSecondary }]} numberOfLines={1}>
                                            {provider.provider_name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Cast Section */}
                    {cast.length > 0 && (
                        <View style={styles.sectionContainer}>
                            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Top Cast</Text>
                            <FlatList
                                data={cast}
                                renderItem={renderCastItem}
                                keyExtractor={(item) => item.id.toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.castList}
                            />
                        </View>
                    )}

                    {type === 'tv' && details.seasons && (
                        <View style={styles.sectionContainer}>
                            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Seasons</Text>
                            {details.seasons.map((season: any) => (
                                <TouchableOpacity key={season.id} style={[styles.seasonItem, { backgroundColor: currentColors.card }]} onPress={() => {
                                    const cinemaAddons = addons.filter((addon: any) => addon.type === 'cinema');
                                    if (cinemaAddons.length === 0) {
                                        Alert.alert(
                                            'Cinema Addons Missing',
                                            'Please add cinema addons to use this feature. Go to Addons tab to add cinema sources.',
                                            [{ text: 'OK' }]
                                        );
                                        return;
                                    }
                                    const primaryGenre = details.genres && details.genres.length > 0 ? details.genres[0].name : '';
                                    router.push({
                                        pathname: '/season/[tvId]/[seasonNumber]',
                                        params: { tvId: id, seasonNumber: season.season_number, genre: primaryGenre }
                                    });
                                }} activeOpacity={0.7}>
                                    <Image source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${season.poster_path}` }} style={styles.seasonPoster} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.seasonName, { color: currentColors.text }]}>{season.name}</Text>
                                        <Text style={[styles.episodeCount, { color: currentColors.textSecondary }]}>{season.episode_count} Episodes</Text>
                                        {season.air_date && <Text style={[styles.episodeCount, { color: currentColors.textSecondary, marginTop: 4 }]}>{new Date(season.air_date).getFullYear()}</Text>}
                                    </View>
                                    <MaterialIcons name="chevron-right" size={24} color={currentColors.textSecondary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                </View>
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerSafeArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        marginHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    backdropContainer: {
        width: width,
        height: 380,
        position: 'relative',
    },
    backdrop: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    content: {
        padding: 20,
        paddingTop: 0,
        marginTop: -80,
    },
    posterAndTitleContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 24,
    },
    poster: {
        width: 110,
        height: 165,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    titleContainer: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'flex-end',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 8,
        lineHeight: 30,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        flexWrap: 'wrap',
    },
    metaText: {
        fontSize: 13,
        fontWeight: '500',
    },
    dot: {
        width: 4, height: 4, borderRadius: 2, marginHorizontal: 6,
    },
    genresScroll: {
        flexGrow: 0,
    },
    genreChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    genreText: {
        fontSize: 11,
        fontWeight: '600',
    },
    playButton: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        marginBottom: 24,
    },
    playButtonGradient: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
    },
    playButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 8,
        letterSpacing: 0.5,
    },
    sectionContainer: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    overview: {
        fontSize: 15,
        lineHeight: 24,
        fontWeight: '400',
    },
    castList: {
        paddingRight: 20,
    },
    castItem: {
        width: 90,
        marginRight: 16,
        alignItems: 'flex-start',
    },
    castImage: {
        width: 90,
        height: 120,
        borderRadius: 12,
        marginBottom: 8,
    },
    castImagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    castName: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2,
    },
    castCharacter: {
        fontSize: 11,
    },
    providersList: {
        paddingRight: 20,
    },
    providerItem: {
        alignItems: 'center',
        marginRight: 20,
        width: 60,
    },
    providerLogo: {
        width: 56,
        height: 56,
        borderRadius: 16,
        marginBottom: 8,
    },
    providerName: {
        fontSize: 11,
        textAlign: 'center',
    },
    seasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        padding: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    seasonPoster: {
        width: 60, height: 90,
        borderRadius: 8,
        marginRight: 16,
    },
    seasonName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    episodeCount: {
        fontSize: 13,
    }
});
