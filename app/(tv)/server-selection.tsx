import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ImageBackground } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import { Colors } from '@/constants/Colors';
import { useAddonsStore } from '@/store/addonsStore';
import { TVFocusable } from '@/components/TVFocusable';
import { MaterialIcons } from '@expo/vector-icons';
import { useStreamSources, StreamResult } from '@/hooks/useStreamSources';
import { TVServerSelectionSkeleton } from '@/components/Skeleton';
import { analyzeAndSortStreams, StreamResultWithHealth } from '@/services/streamHealthEngine';
import { useTheme } from '@/hooks/useTheme';
import { resolveMagnet } from '@/services/debrid';
import { Alert } from 'react-native';

const getTagsFromTitle = (title: string) => {
    if (!title) return [];
    const tags: string[] = [];
    const languages = ['Hindi', 'English', 'Spanish', 'French', 'Bengali', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Marathi', 'Gujarati', 'Punjabi', 'Urdu', 'Korean', 'Japanese', 'Chinese', 'Multi', 'Dual Audio'];
    const qualities = ['CAM', 'HDTS', 'DVDScr', 'DVDRip', 'WEBRip', 'WEB-DL', 'BluRay', 'Remux', 'HDRip', 'BDRemux', 'HDTC'];

    languages.forEach(lang => {
        const regex = new RegExp(`\\b${lang.replace(' ', '\\s*')}\\b`, 'i');
        if (regex.test(title)) tags.push(lang);
    });

    qualities.forEach(q => {
        const regexStr = q === 'WEB-DL' ? '\\bweb-?dl\\b' : `\\b${q}\\b`;
        const regex = new RegExp(regexStr, 'i');
        if (regex.test(title)) tags.push(q);
    });

    return tags;
};

export default function TVServerSelectionScreen() {
    const { id, type, title, season, episode, poster, backdrop, movieUrl, movieData, genre, query } = useLocalSearchParams();
    const router = useRouter();
    const { autoSelectHealthiestSource, debridProvider, debridApiKey } = useSettingsStore();
    const { colors: activeColors } = useTheme();
    const { addons, isHydrated } = useAddonsStore();

    const { results, loading, searchStreams } = useStreamSources();
    const [analyzedResults, setAnalyzedResults] = React.useState<StreamResultWithHealth[]>([]);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [resolvingMagnet, setResolvingMagnet] = React.useState(false);
    const [filter, setFilter] = React.useState<'all' | 'direct' | 'debrid'>('all');
    const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);
    const hasAutoPlayed = React.useRef(false);

    useEffect(() => {
        const resolvedType = (Array.isArray(type) ? type[0] : type || 'movie') as any;
        const resolvedMovieUrl = Array.isArray(movieUrl) ? movieUrl[0] : movieUrl as string;
        searchStreams(
            Array.isArray(title) ? title[0] : title || '',
            Array.isArray(id) ? id[0] : id,
            Array.isArray(season) ? season[0] : season,
            Array.isArray(episode) ? episode[0] : episode,
            resolvedType,
            resolvedType === 'addon' ? undefined : resolvedMovieUrl,
            Array.isArray(movieData) ? movieData[0] : movieData as string,
            resolvedType === 'addon' ? resolvedMovieUrl : undefined  // serverAddonUrl
        );
    }, [id, type, title, season, episode, movieUrl, movieData]);

    React.useEffect(() => {
        if (!loading && results.length > 0) {
            let active = true;
            setIsAnalyzing(true);
            analyzeAndSortStreams(results).then(analyzed => {
                if (active) {
                    setAnalyzedResults(analyzed);
                    setIsAnalyzing(false);
                    if (autoSelectHealthiestSource && !hasAutoPlayed.current && analyzed.length > 0) {
                        hasAutoPlayed.current = true;
                        handlePlay(analyzed[0], 0, analyzed);
                    }
                }
            });
            return () => { active = false; };
        } else if (!loading) {
            setAnalyzedResults([]);
            setIsAnalyzing(false);
        }
    }, [results, loading, autoSelectHealthiestSource]);

    const handlePlay = async (item: StreamResultWithHealth, index: number, sourceList: StreamResultWithHealth[] = analyzedResults) => {
        let finalUrl = item.url;

        if (item.isTorrent) {
            if (debridProvider === 'none' || !debridApiKey) {
                Alert.alert('Debrid Required', 'Please configure Real-Debrid in TV Settings to play torrent sources.');
                return;
            }

            setResolvingMagnet(true);
            try {
                const resolution = await resolveMagnet(item.magnetLink || item.url, debridProvider, debridApiKey);
                if (resolution.error || !resolution.url) {
                    Alert.alert('Debrid Error', resolution.error || 'Failed to unrestrict link.');
                    setResolvingMagnet(false);
                    return;
                }
                finalUrl = resolution.url;
            } catch (err: any) {
                Alert.alert('Error', err.message);
                setResolvingMagnet(false);
                return;
            }
            setResolvingMagnet(false);
        }

        const videoParams: any = {
            url: encodeURIComponent(finalUrl),
            title: encodeURIComponent((title ? String(title) : query ? String(query) : '') || item.title || 'Playing Video'),
            sourceType: 'cinema',
            contentType: Array.isArray(type) ? type[0] : type,
            tmdbId: Array.isArray(id) ? id[0] : id,
            season: Array.isArray(season) ? season[0] : season,
            episode: Array.isArray(episode) ? episode[0] : episode,
        };
        if (item.headers) videoParams.headers = JSON.stringify(item.headers);
        if (item.userAgent) videoParams.userAgent = item.userAgent;
        if (poster) videoParams.poster = Array.isArray(poster) ? poster[0] : poster;
        if (backdrop) videoParams.backdrop = Array.isArray(backdrop) ? backdrop[0] : backdrop;
        if (genre) videoParams.genre = Array.isArray(genre) ? genre[0] : genre;

        try {
            videoParams.sourceList = JSON.stringify(sourceList.slice(0, 10));
            videoParams.initialSourceIndex = index;
        } catch (e) { }

        router.push({ pathname: '/(tv)/player', params: videoParams });
    };

    const renderItem = ({ item, index }: { item: StreamResultWithHealth; index: number }) => {
        const isFocused = focusedIndex === index;
        return (
            <TVFocusable
                style={[styles.serverCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}
                onPress={() => handlePlay(item, index)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(prev => prev === index ? null : prev)}
                hasTVPreferredFocus={index === 0}
                nativeID={`tv-server-${index}`}
            >
                <View style={[styles.iconContainer, { backgroundColor: activeColors.primary + '20' }]}>
                    <MaterialIcons name={item.isTorrent ? "cloud-download" : "play-circle-outline"} size={32} color={activeColors.primary} />
                </View>
                <View style={styles.serverInfo}>
                    <Text style={[styles.serverName, { color: activeColors.text }]}>
                        {item.isTorrent && debridProvider !== 'none' && <Text style={{ color: activeColors.primary, fontFamily: 'Outfit_600SemiBold' }}>[RD] </Text>}
                        {item.source}
                    </Text>
                    <Text style={[styles.serverTitle, { color: activeColors.textSecondary }]} numberOfLines={isFocused ? 0 : 1}>{item.title}</Text>

                    {(item.healthInfo?.resolution || getTagsFromTitle(item.title).length > 0) && (
                        <View style={styles.metricsRow}>
                            {item.healthInfo?.resolution && (
                                <View style={[styles.metaBadge, { backgroundColor: activeColors.primary + '20' }]}>
                                    <Text style={[styles.metaText, { color: activeColors.primary }]}>{item.healthInfo.resolution}</Text>
                                </View>
                            )}
                            {getTagsFromTitle(item.title).map(tag => (
                                <View key={tag} style={[styles.metaBadge, { backgroundColor: activeColors.primary + '20' }]}>
                                    <Text style={[styles.metaText, { color: activeColors.primary }]}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </TVFocusable>
        );
    };

    const filteredResults = React.useMemo(() => {
        return analyzedResults.filter(item => {
            if (filter === 'all') return true;
            if (filter === 'direct') return !item.isTorrent;
            if (filter === 'debrid') return item.isTorrent;
            return true;
        });
    }, [analyzedResults, filter]);

    return (
        <View style={[styles.container, { backgroundColor: activeColors.background }]}>
            <ImageBackground
                source={{ uri: backdrop ? `https://image.tmdb.org/t/p/original${backdrop}` : undefined }}
                style={StyleSheet.absoluteFill}
                blurRadius={5}
            >
                <View style={[styles.overlay, { backgroundColor: activeColors.background + 'D9' }]} />
            </ImageBackground>

            <View style={styles.content}>
                <View style={styles.header}>
                    <TVFocusable
                        onPress={() => router.back()}
                        style={styles.headerBackButton}
                    >
                        <View style={styles.backButtonContent}>
                            <MaterialIcons name="arrow-back" size={28} color="#fff" />
                        </View>
                    </TVFocusable>
                    <View style={styles.headerInfo}>
                        <Text style={[styles.title, { color: activeColors.text }]}>Select Server</Text>
                        <Text style={[styles.subtitle, { color: activeColors.textSecondary }]}>
                            {title} {season ? `- S${season}E${episode}` : ''}
                        </Text>
                    </View>
                </View>

                {results.length > 0 && !isAnalyzing && (
                    <View style={{ flexDirection: 'row', marginBottom: 20, gap: 16 }}>
                        <TVFocusable 
                            onPress={() => setFilter('all')} 
                            style={[styles.tvFilterTab, filter === 'all' && { backgroundColor: activeColors.primary, borderColor: activeColors.primary }]}
                        >
                            <Text style={[styles.tvFilterText, filter === 'all' && { color: '#fff' }]}>All Streams</Text>
                        </TVFocusable>
                        <TVFocusable 
                            onPress={() => setFilter('direct')} 
                            style={[styles.tvFilterTab, filter === 'direct' && { backgroundColor: activeColors.primary, borderColor: activeColors.primary }]}
                        >
                            <Text style={[styles.tvFilterText, filter === 'direct' && { color: '#fff' }]}>Direct Streams</Text>
                        </TVFocusable>
                        <TVFocusable 
                            onPress={() => setFilter('debrid')} 
                            style={[styles.tvFilterTab, filter === 'debrid' && { backgroundColor: activeColors.primary, borderColor: activeColors.primary }]}
                        >
                            <Text style={[styles.tvFilterText, filter === 'debrid' && { color: '#fff' }]}>Debrid Torrents</Text>
                        </TVFocusable>
                    </View>
                )}

                {(loading || isAnalyzing || resolvingMagnet) ? (
                    resolvingMagnet ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={activeColors.primary} />
                            <Text style={{ color: activeColors.text, marginTop: 16, fontSize: 18, fontFamily: 'Outfit_500Medium' }}>Unrestricting link via Debrid...</Text>
                        </View>
                    ) : (
                        <TVServerSelectionSkeleton />
                    )
                ) : results.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="cloud-off" size={64} color={activeColors.textSecondary} />
                        <Text style={[styles.emptyText, { color: activeColors.text }]}>
                            {isHydrated && addons.filter(addon => addon.type === 'cinema' || addon.type === 'movie').length === 0
                                ? 'Please Install Cinema Addons First'
                                : 'No streams found'}
                        </Text>
                        {isHydrated && addons.filter(addon => addon.type === 'cinema' || addon.type === 'movie').length === 0 ? (
                            <TVFocusable
                                style={[styles.backButton, { backgroundColor: activeColors.primary }]}
                                onPress={() => router.push('/(tv)/addons')}
                                hasTVPreferredFocus={true}
                            >
                                <View style={styles.backButtonContent}>
                                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Add Addons</Text>
                                </View>
                            </TVFocusable>
                        ) : (
                            <TVFocusable
                                style={[styles.backButton, { backgroundColor: activeColors.primary }]}
                                onPress={() => router.back()}
                                hasTVPreferredFocus={true}
                            >
                                <View style={styles.backButtonContent}>
                                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Go Back</Text>
                                </View>
                            </TVFocusable>
                        )}
                    </View>
                ) : filteredResults.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="cloud-off" size={64} color={activeColors.textSecondary} />
                        <Text style={[styles.emptyText, { color: activeColors.text }]}>
                            No streams found for this filter
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={isAnalyzing ? [] : filteredResults}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => `${item.url}-${index}`}
                        contentContainerStyle={styles.list}
                        numColumns={2}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        flex: 1,
        padding: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
        gap: 20,
    },
    headerBackButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    headerInfo: {
        flex: 1,
    },
    backButtonContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        fontFamily: 'Outfit_600SemiBold',
    },
    tvFilterTab: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#334155',
        backgroundColor: 'transparent',
    },
    tvFilterText: {
        color: '#94a3b8',
        fontSize: 18,
        fontFamily: 'Outfit_500Medium',
    },
    subtitle: {
        fontSize: 18,
        fontFamily: 'Outfit_500Medium',
        marginTop: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        marginTop: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    emptyText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    list: {
        paddingBottom: 40,
    },
    serverCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        margin: 10,
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        minWidth: 300,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    serverInfo: {
        flex: 1,
    },
    serverName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    serverTitle: {
        fontSize: 14,
        marginBottom: 8,
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    badgeContainer: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    metaBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    metaText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    latencyText: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    backButton: {
        width: 160,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
    }
});
