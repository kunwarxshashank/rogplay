import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Alert, ImageBackground } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { getDetails } from '@/services/tmdb';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAddonsStore } from '@/store/addonsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { DetailsSkeleton } from '@/components/Skeleton';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useToastStore } from '@/store/toastStore';

const { width } = Dimensions.get('window');

export default function DetailsScreen() {
    const { id, type } = useLocalSearchParams();
    const [details, setDetails] = useState<any>(null);
    const router = useRouter();
    const { addons } = useAddonsStore();
    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;
    const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
    const isFavorite = useFavoritesStore((state) => state.isFavorite);
    const showToast = useToastStore((state) => state.showToast);

    const favoriteId = `${type}:${id}`;
    const favoriteActive = isFavorite(favoriteId);

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
        // Check if there are cinema addons
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
        // Navigate to content-list to search for streams for this title
        router.push({
            pathname: '/server-selection',
            params: {
                query: query,
                type: type as string,
                tmdb: id as string,
                title: details.title || details.name,
                poster: details.poster_path,
                backdrop: details.backdrop_path,
                ...(type === 'tv' && { season: 1, episode: 1 }),
            }
        });
    };

    const handleToggleFavorite = () => {
        const exists = isFavorite(favoriteId);
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

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background }]}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                <ImageBackground
                    source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${details.backdrop_path}` }}
                    style={styles.backdrop}
                >
                    <LinearGradient
                        colors={['transparent', currentColors.background]}
                        style={styles.gradient}
                    />
                    <SafeAreaView style={styles.headerSafeArea}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <MaterialIcons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleToggleFavorite} style={styles.favIconButton}>
                            <MaterialIcons
                                name={favoriteActive ? 'favorite' : 'favorite-border'}
                                size={22}
                                color={favoriteActive ? '#ff6b8a' : '#fff'}
                            />
                        </TouchableOpacity>
                    </SafeAreaView>
                </ImageBackground>

                <View style={styles.content}>
                    <Image
                        source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${details.poster_path}` }}
                        style={styles.poster}
                    />
                    <Text style={[styles.title, { color: currentColors.text }]}>{details.title || details.name}</Text>
                    <View style={styles.meta}>
                        <Text style={[styles.metaText, { color: currentColors.textSecondary }]}>
                            {details.release_date || details.first_air_date ? new Date(details.release_date || details.first_air_date).getFullYear() : 'N/A'}
                        </Text>
                        <View style={[styles.dot, { backgroundColor: currentColors.textSecondary }]} />
                        <Text style={[styles.metaText, { color: currentColors.textSecondary }]}>{details.vote_average?.toFixed(1) || '0.0'} ★</Text>
                        <View style={[styles.dot, { backgroundColor: currentColors.textSecondary }]} />
                        <Text style={[styles.metaText, { color: currentColors.textSecondary }]}>{details.runtime || (details.episode_run_time ? details.episode_run_time[0] : '?')} min</Text>
                    </View>

                    <View style={styles.genres}>
                        {details.genres?.map((g: any) => (
                            <View key={g.id} style={[styles.genreChip, { backgroundColor: currentColors.card }]}>
                                <Text style={[styles.genreText, { color: currentColors.textSecondary }]}>{g.name}</Text>
                            </View>
                        ))}
                    </View>

                    {type === 'movie' && (<TouchableOpacity style={styles.playButton} onPress={handleWatch}>
                        <LinearGradient
                            colors={[currentColors.primary, currentColors.primary + '80']}
                            style={styles.playButtonGradient}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        >
                            <MaterialIcons name="play-arrow" size={30} color="#fff" />
                            <Text style={styles.playButtonText}>Watch Now</Text>
                        </LinearGradient>
                    </TouchableOpacity>)}



                    <Text style={[styles.overview, { color: currentColors.textSecondary }]}>
                        {truncateDescription(details.overview, 50)}
                    </Text>

                    {type === 'tv' && details.seasons && (
                        <View style={styles.seasons}>
                            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Seasons</Text>
                            {details.seasons.map((season: any) => (
                                <TouchableOpacity key={season.id} style={[styles.seasonItem, { backgroundColor: currentColors.card }]} onPress={() => {
                                    // Check for cinema addons before navigating
                                    const cinemaAddons = addons.filter((addon: any) => addon.type === 'cinema');

                                    if (cinemaAddons.length === 0) {
                                        Alert.alert(
                                            'Cinema Addons Missing',
                                            'Please add cinema addons to use this feature. Go to Addons tab to add cinema sources.',
                                            [{ text: 'OK' }]
                                        );
                                        return;
                                    }

                                    router.push({
                                        pathname: '/season/[tvId]/[seasonNumber]',
                                        params: { tvId: id, seasonNumber: season.season_number }
                                    });
                                }}>
                                    <Image source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${season.poster_path}` }} style={styles.seasonPoster} />
                                    <View>
                                        <Text style={[styles.seasonName, { color: currentColors.text }]}>{season.name}</Text>
                                        <Text style={[styles.episodeCount, { color: currentColors.textSecondary }]}>{season.episode_count} Episodes</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backdrop: {
        width: width,
        height: 300,
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 150,
    },
    headerSafeArea: {
        marginHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    favIconButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center', alignItems: 'center',
    },
    backButton: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
    },
    content: {
        padding: 16,
        marginTop: -60,
    },
    poster: {
        width: 120,
        height: 180,
        borderRadius: 12,
        alignSelf: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    meta: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    metaText: {
        color: Colors.dark.textSecondary,
        fontSize: 14,
    },
    dot: {
        width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.dark.textSecondary, marginHorizontal: 8,
    },
    genres: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 24,
        gap: 8,
    },
    genreChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    genreText: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
    },
    overview: {
        color: '#e2e8f0',
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 32,
    },
    playButton: {
        marginBottom: 32,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 5,
    },

    playButtonGradient: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
    },
    playButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    seasons: {
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    seasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        padding: 8,
        borderRadius: 12,
    },
    seasonPoster: {
        width: 50, height: 75,
        borderRadius: 8,
        marginRight: 12,
    },
    seasonName: {
        fontSize: 16,
        fontWeight: '600',
    },
    episodeCount: {
        fontSize: 12,
    }
});
