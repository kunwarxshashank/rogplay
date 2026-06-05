import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, ActivityIndicator, Alert, Dimensions, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAddonsStore } from '@/store/addonsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { EpisodeSkeleton } from '@/components/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { getSeasonDetails } from '@/services/tmdb';

const { width: SCREEN_W } = Dimensions.get('window');

const hexAlpha = (hex: string, alpha: number) => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return hex + a;
};

export default function SeasonDetailsScreen() {
    const { tvId, seasonNumber, showName } = useLocalSearchParams();
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [seasonInfo, setSeasonInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { addons } = useAddonsStore();
    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;

    useEffect(() => {
        loadSeasonDetails();
    }, [tvId, seasonNumber]);

    const loadSeasonDetails = async () => {
        try {
            const data = await getSeasonDetails(tvId as string, Number(seasonNumber));
            setSeasonInfo(data);
            setEpisodes(data.episodes || []);
        } catch (error) {
            console.error('Error loading season:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEpisodePress = (episode: any) => {
        const cinemaAddons = addons.filter((addon: any) => addon.type === 'cinema');

        if (cinemaAddons.length === 0) {
            Alert.alert(
                'Cinema Addons Missing',
                'Please add cinema addons to use this feature. Go to Addons tab to add cinema sources.',
                [{ text: 'OK' }]
            );
            return;
        }

        const query = `${showName || seasonInfo?.name} Episode ${episode.episode_number}`;
        router.push({
            pathname: '/server-selection',
            params: {
                query,
                type: 'tv',
                tmdb: tvId as string,
                season: seasonNumber as string,
                episode: episode.episode_number.toString(),
                title: `${showName || seasonInfo?.name} - S${seasonNumber}E${episode.episode_number}`,
                poster: episode.still_path || seasonInfo?.poster_path,
                backdrop: seasonInfo?.poster_path || '',
            }
        });
    };

    const renderEpisode = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.episodeCard, { backgroundColor: hexAlpha(currentColors.card, 0.5), borderColor: hexAlpha(currentColors.border, 0.3) }]}
            onPress={() => handleEpisodePress(item)}
            activeOpacity={0.8}
        >
            <View style={styles.episodeImageContainer}>
                {item.still_path ? (
                    <Image
                        source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${item.still_path}` }}
                        style={styles.episodeImage}
                    />
                ) : (
                    <View style={[styles.placeholderImage, { backgroundColor: currentColors.background }]}>
                        <MaterialIcons name="play-circle" size={40} color={currentColors.textSecondary} />
                    </View>
                )}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.episodeBadge, { backgroundColor: currentColors.primary }]}>
                    <Text style={styles.episodeBadgeText}>E{item.episode_number}</Text>
                </View>
            </View>
            <View style={styles.episodeInfo}>
                <Text style={[styles.episodeTitle, { color: currentColors.text }]} numberOfLines={1}>
                    {item.name}
                </Text>
                <Text style={[styles.episodeOverview, { color: hexAlpha(currentColors.text, 0.6) }]} numberOfLines={1}>
                    {item.overview || 'No description available for this episode.'}
                </Text>
                <View style={styles.episodeMeta}>
                    {item.vote_average > 0 && (
                        <View style={styles.ratingBox}>
                            <MaterialIcons name="star" size={12} color="#fbbf24" />
                            <Text style={styles.ratingText}>{item.vote_average.toFixed(1)}</Text>
                        </View>
                    )}
                    {item.runtime && <Text style={[styles.runtime, { color: currentColors.textSecondary }]}>{item.runtime}m</Text>}
                    {item.air_date && <Text style={[styles.airDate, { color: currentColors.textSecondary }]}>{item.air_date.split('-')[0]}</Text>}
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: currentColors.background }]}>
                <StatusBar barStyle="light-content" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                        <MaterialIcons name="arrow-back" size={24} color={currentColors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={[styles.headerTitle, { color: currentColors.text }]}>Loading...</Text>
                    </View>
                </View>
                <ScrollView contentContainerStyle={styles.list}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <EpisodeSkeleton key={index} />
                    ))}
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background }]}>
            <StatusBar barStyle="light-content" />

            {seasonInfo?.poster_path && (
                <View style={styles.backgroundContainer}>
                    <Image
                        source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${seasonInfo.poster_path}` }}
                        style={StyleSheet.absoluteFill}
                        blurRadius={20}
                    />
                    <LinearGradient
                        colors={['transparent', currentColors.background]}
                        style={StyleSheet.absoluteFill}
                    />
                </View>
            )}

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                        <MaterialIcons name="arrow-back" size={24} color={currentColors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={[styles.headerSubtitle, { color: currentColors.primary }]}>
                            {showName || 'TV SERIES'}
                        </Text>
                        <Text style={[styles.headerTitle, { color: currentColors.text }]} numberOfLines={1}>
                            {seasonInfo?.name || 'Season'}
                        </Text>
                    </View>
                    <View style={styles.epCount}>
                        <Text style={styles.epCountText}>{episodes.length} EP</Text>
                    </View>
                </View>

                <FlatList
                    data={episodes}
                    renderItem={renderEpisode}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={() => (
                        <View style={styles.seasonOverview}>
                            <Text style={[styles.overviewText, { color: hexAlpha(currentColors.text, 0.7) }]}>
                                {seasonInfo?.overview || 'No season overview available.'}
                            </Text>
                        </View>
                    )}
                />
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        gap: 15,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
    },
    headerSubtitle: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 1,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'Outfit_700Bold',
    },
    epCount: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    epCountText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
    },
    seasonOverview: {
        marginBottom: 25,
        paddingHorizontal: 4,
    },
    overviewText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        lineHeight: 20,
    },
    list: {
        padding: 20,
        paddingBottom: 100,
    },
    episodeCard: {
        flexDirection: 'row',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    episodeImageContainer: {
        width: 130,
        height: 85,
        position: 'relative',
    },
    episodeImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    episodeBadge: {
        position: 'absolute',
        top: 6,
        left: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    episodeBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Outfit_700Bold',
    },
    episodeInfo: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    episodeTitle: {
        fontSize: 15,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 4,
    },
    episodeOverview: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        lineHeight: 16,
        marginBottom: 6,
    },
    episodeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    ratingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    ratingText: {
        fontSize: 11,
        fontFamily: 'Outfit_700Bold',
        color: '#fbbf24',
    },
    runtime: {
        fontSize: 11,
        fontFamily: 'Outfit_500Medium',
    },
    airDate: {
        fontSize: 11,
        fontFamily: 'Outfit_500Medium',
    }
});
