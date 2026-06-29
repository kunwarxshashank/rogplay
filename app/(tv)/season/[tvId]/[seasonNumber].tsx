import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { getSeasonDetails } from '@/services/tmdb';
import { TVFocusable } from '@/components/TVFocusable';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TVEpisodeSkeleton } from '@/components/Skeleton';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const hexAlpha = (hex: string, alpha: number) => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return hex + a;
};

export default function TVSeasonScreen() {
    const { colors: activeColors } = useTheme();
    const { tvId, seasonNumber, showName, backdrop, genre } = useLocalSearchParams();
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [seasonInfo, setSeasonInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

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
        const query = `${showName || seasonInfo?.name} Episode ${episode.episode_number}`;
        router.push({
            pathname: '/(tv)/server-selection',
            params: {
                query,
                type: 'tv',
                tmdb: tvId as string,
                season: seasonNumber as string,
                episode: episode.episode_number.toString(),
                title: `${showName || seasonInfo?.name} - S${seasonNumber}E${episode.episode_number}`,
                poster: episode.still_path || seasonInfo?.poster_path,
                backdrop: seasonInfo?.poster_path || backdrop || '',
                genre: genre as string,
            }
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: activeColors.background }]}>
                <View style={styles.header}>
                    <Text style={[styles.headerSubtitle, { color: activeColors.primary, marginBottom: 8 }]}>LOADING EPISODES</Text>
                    <Text style={[styles.title, { color: activeColors.text }]}>
                        {showName}
                    </Text>
                </View>
                <ScrollView contentContainerStyle={styles.list}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <TVEpisodeSkeleton key={i} />
                    ))}
                </ScrollView>
            </View>
        );
    }

    if (!seasonInfo) return null;

    return (
        <View style={[styles.container, { backgroundColor: activeColors.background }]}>
            {/* Backdrop */}
            {backdrop && (
                <View style={StyleSheet.absoluteFill}>
                    <Image
                        source={{ uri: `https://image.tmdb.org/t/p/original${backdrop}` }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                        blurRadius={15}
                    />
                    {activeColors.isAmoled ? (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
                    ) : (
                        <LinearGradient
                            colors={[
                                hexAlpha(activeColors.background, 0.7),
                                activeColors.background
                            ]}
                            style={StyleSheet.absoluteFill}
                        />
                    )}
                </View>
            )}

            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <TVFocusable
                        onPress={() => router.back()}
                        style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                        focusedScale={1.1}
                    >
                        <MaterialIcons name="arrow-back" size={24} color={activeColors.text} />
                    </TVFocusable>
                    <View style={styles.headerInfo}>
                        <Text style={[styles.headerSubtitle, { color: activeColors.primary }]}>
                            {showName?.toString().toUpperCase()}
                        </Text>
                        <Text style={[styles.title, { color: activeColors.text }]}>
                            {seasonInfo.name}
                        </Text>
                    </View>
                    <View style={[styles.episodeCountBadge, { backgroundColor: hexAlpha(activeColors.text, 0.1) }]}>
                        <Text style={styles.episodeCountText}>{seasonInfo.episodes?.length || 0} EPISODES</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            >
                {seasonInfo.episodes?.map((episode: any, index: number) => (
                    <TVFocusable
                        key={episode.id}
                        style={[
                            styles.episodeCard,
                            {
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                borderColor: hexAlpha(activeColors.text, 0.1)
                            }
                        ]}
                        onPress={() => handleEpisodePress(episode)}
                        focusedScale={1.02}
                        focusedBackgroundColor="rgba(255,255,255,0.08)"
                        focusedBorderColor={activeColors.primary}
                        hasTVPreferredFocus={index === 0}
                    >
                        <View style={styles.cardContent}>
                            <View style={styles.imageContainer}>
                                <Image
                                    source={{ uri: episode.still_path ? `https://image.tmdb.org/t/p/w500${episode.still_path}` : 'https://via.placeholder.com/300x169' }}
                                    style={styles.episodeImage}
                                />
                                <View style={[styles.epBadge, { backgroundColor: activeColors.primary }]}>
                                    <Text style={styles.epBadgeText}>EP {episode.episode_number}</Text>
                                </View>
                                {activeColors.isAmoled ? (
                                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
                                ) : (
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                                        style={StyleSheet.absoluteFill}
                                    />
                                )}
                            </View>
                            <View style={styles.episodeInfo}>
                                <View style={styles.titleRow}>
                                    <Text style={[styles.episodeTitle, { color: activeColors.text }]} numberOfLines={1}>
                                        {episode.name}
                                    </Text>
                                    {episode.vote_average > 0 && (
                                        <View style={styles.ratingRow}>
                                            <MaterialIcons name="star" size={14} color="#fbbf24" />
                                            <Text style={styles.ratingText}>{episode.vote_average.toFixed(1)}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.episodeOverview, { color: activeColors.textSecondary }]} numberOfLines={3}>
                                    {episode.overview || "No overview available for this episode."}
                                </Text>
                                <View style={styles.episodeMeta}>
                                    {episode.air_date && (
                                        <Text style={[styles.metaText, { color: activeColors.textSecondary }]}>
                                            Released: {new Date(episode.air_date).toLocaleDateString()}
                                        </Text>
                                    )}
                                    {episode.runtime && (
                                        <Text style={[styles.metaText, { color: activeColors.textSecondary, marginLeft: 16 }]}>
                                            Duration: {episode.runtime}m
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    </TVFocusable>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 40,
        paddingHorizontal: 60,
        paddingBottom: 20,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 24,
    },
    headerInfo: {
        flex: 1,
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 1,
    },
    title: {
        fontSize: 42,
        fontFamily: 'Outfit_700Bold',
        marginTop: 4,
    },
    episodeCountBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    episodeCountText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
    },
    list: {
        paddingHorizontal: 60,
        paddingBottom: 60,
    },
    episodeCard: {
        marginBottom: 20,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1.5,
    },
    cardContent: {
        flexDirection: 'row',
    },
    imageContainer: {
        width: 280,
        height: "100%",
        overflow: 'hidden',
    },
    episodeImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    epBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        zIndex: 10,
    },
    epBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
    },
    episodeInfo: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    episodeTitle: {
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
        flex: 1,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 12,
    },
    ratingText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        marginLeft: 4,
    },
    episodeOverview: {
        fontSize: 15,
        fontFamily: 'Outfit_700Bold',
        lineHeight: 22,
        marginBottom: 16,
    },
    episodeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 13,
        fontFamily: 'Outfit_700Bold',
    }
});
