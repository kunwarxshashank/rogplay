import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAddonsStore } from '@/store/addonsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StreamSourceSkeleton } from '@/components/Skeleton';
import { useStreamSources } from '@/hooks/useStreamSources';
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

export default function ContentListScreen() {
    const { query, type: rawType, movieUrl, tmdb, season, episode, movieData, title, poster, backdrop, genre } = useLocalSearchParams();
    const type = Array.isArray(rawType) ? rawType[0] : rawType;
    const { addons, isHydrated } = useAddonsStore();
    const { results, loading, searchStreams } = useStreamSources();
    const [analyzedResults, setAnalyzedResults] = useState<StreamResultWithHealth[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [resolvingMagnet, setResolvingMagnet] = useState(false);
    const [filter, setFilter] = useState<'all' | 'direct' | 'debrid'>('all');
    const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(new Set());
    const hasAutoPlayed = React.useRef(false);
    const router = useRouter();

    const isMovie = type === 'movie' || type === 'rogmovie' || !type;

    useEffect(() => {
        searchStreams(
            query as string,
            tmdb as string,
            season as string,
            episode as string,
            (type as any) || 'movie',
            type === 'addon' ? undefined : movieUrl as string,
            movieData as string,
            type === 'addon' ? movieUrl as string : undefined  // serverAddonUrl for DesiHub-style
        );
    }, [query, tmdb, type, movieUrl, movieData]);

    const { autoSelectHealthiestSource, debridProvider, debridApiKey } = useSettingsStore();
    const { colors: activeColors } = useTheme();

    useEffect(() => {
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
                Alert.alert('Debrid Required', 'Please configure Real-Debrid or another provider in Settings to play torrent sources.');
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
            contentType: type,
            tmdbId: tmdb,
            season,
            episode,
        };
        if (item.headers) videoParams.headers = typeof item.headers === 'object' ? JSON.stringify(item.headers) : item.headers;
        if (item.userAgent) videoParams.userAgent = item.userAgent;
        if (poster) videoParams.poster = poster;
        if (backdrop) videoParams.backdrop = backdrop;
        if (genre) videoParams.genre = genre;

        try {
            // Include sourceList max 10 to avoid URI size limit
            videoParams.sourceList = JSON.stringify(sourceList.slice(0, 10));
            videoParams.initialSourceIndex = index;
        } catch (e) { }

        router.push({ pathname: '/player', params: videoParams });
    };

    const handleDownload = async (item: StreamResultWithHealth) => {
        let finalUrl = item.url;

        if (item.isTorrent) {
            if (debridProvider === 'none' || !debridApiKey) {
                Alert.alert('Debrid Required', 'You must configure a Debrid provider in settings to download torrent streams.');
                return;
            }

            setResolvingMagnet(true);
            try {
                const resolution = await resolveMagnet(item.url, debridProvider, debridApiKey);
                if (!resolution.url) {
                    throw new Error('Failed to extract direct stream link');
                }
                finalUrl = resolution.url;
            } catch (err: any) {
                Alert.alert('Error', err.message);
                setResolvingMagnet(false);
                return;
            }
            setResolvingMagnet(false);
        }

        const downloadParams: any = {
            url: encodeURIComponent(finalUrl),
            title: encodeURIComponent((title ? String(title) : query ? String(query) : '') || item.title || 'Video')
        };
        if (item.headers) downloadParams.headers = typeof item.headers === 'object' ? JSON.stringify(item.headers) : item.headers;

        router.push({ pathname: '/video-downloader', params: downloadParams });
    };

    const toggleExpand = (index: number) => {
        setExpandedIndexes(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const renderItem = ({ item, index }: { item: StreamResultWithHealth, index: number }) => {
        const isExpanded = expandedIndexes.has(index);
        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}
                onPress={() => handlePlay(item, index)}
                activeOpacity={0.8}
            >
                <View style={[styles.iconContainer, { backgroundColor: activeColors.primary + '15' }]}>
                    <MaterialIcons name={item.isTorrent ? "cloud-download" : "play-lesson"} size={28} color={activeColors.primary} />
                </View>
                <View style={styles.info}>
                    <Text style={[styles.title, { color: activeColors.text }]} numberOfLines={isExpanded ? 0 : 1}>
                        {item.isTorrent && debridProvider !== 'none' && <Text style={{ color: activeColors.primary, fontFamily: 'Outfit_600SemiBold' }}>[RD] </Text>}
                        {item.title}
                    </Text>
                    <Text style={[styles.subtitle, { color: activeColors.textSecondary }]} numberOfLines={1}>{item.source || 'Unknown Source'}</Text>

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
                <View style={[styles.action, { flexDirection: 'column', justifyContent: 'space-between' }]}>
                    <TouchableOpacity
                        style={[styles.qualityBadge, { backgroundColor: activeColors.primary, marginBottom: 8 }]}
                        onPress={() => handleDownload(item)}
                    >
                        <MaterialIcons name="file-download" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.qualityBadge, { backgroundColor: activeColors.surface, borderWidth: 1, borderColor: activeColors.border }]}
                        onPress={() => toggleExpand(index)}
                    >
                        <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={18} color={activeColors.text} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
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
        <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color={activeColors.text} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={[styles.headerTitle, { color: activeColors.text }]} numberOfLines={1}>{query || 'Available Sources'}</Text>
                    <Text style={[styles.headerSubtitle, { color: activeColors.textSecondary }]}>{results.length} servers found</Text>
                </View>
            </View>

            {results.length > 0 && !isAnalyzing && (
                <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 }}>
                    <TouchableOpacity onPress={() => setFilter('all')} style={[styles.filterTab, filter === 'all' && { backgroundColor: activeColors.primary, borderColor: activeColors.primary }]}>
                        <Text style={[styles.filterText, filter === 'all' && { color: '#fff' }]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setFilter('direct')} style={[styles.filterTab, filter === 'direct' && { backgroundColor: activeColors.primary, borderColor: activeColors.primary }]}>
                        <Text style={[styles.filterText, filter === 'direct' && { color: '#fff' }]}>Direct</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setFilter('debrid')} style={[styles.filterTab, filter === 'debrid' && { backgroundColor: activeColors.primary, borderColor: activeColors.primary }]}>
                        <Text style={[styles.filterText, filter === 'debrid' && { color: '#fff' }]}>Debrid</Text>
                    </TouchableOpacity>
                </View>
            )}

            {((results.length === 0 && (loading || !isHydrated)) || isAnalyzing || resolvingMagnet) ? (
                <View style={styles.list}>
                    {resolvingMagnet && (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={activeColors.primary} />
                            <Text style={{ color: activeColors.text, marginTop: 12, fontFamily: 'Outfit_500Medium' }}>Unrestricting link via Debrid...</Text>
                        </View>
                    )}
                    {!resolvingMagnet && Array.from({ length: 8 }).map((_, index) => (
                        <StreamSourceSkeleton key={index} />
                    ))}
                </View>
            ) : results.length === 0 ? (
                <View style={styles.empty}>
                    <MaterialIcons name="cloud-off" size={64} color={activeColors.textSecondary + '40'} />
                    <Text style={[styles.emptyText, { color: activeColors.textSecondary }]}>
                        {isHydrated && addons.filter(addon => addon.type === 'cinema' || addon.type === 'movie').length === 0
                            ? 'Please Install Cinema Addons First'
                            : 'No streams found'}
                    </Text>
                    <Text style={[styles.emptySubtext, { color: activeColors.textSecondary }]}>
                        {isHydrated && addons.filter(addon => addon.type === 'cinema' || addon.type === 'movie').length === 0
                            ? 'Go to Addon Store to install'
                            : 'Try adding more cinema addons'}
                    </Text>
                    {isHydrated && addons.filter(addon => addon.type === 'cinema' || addon.type === 'movie').length === 0 && (
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: activeColors.primary }]}
                            onPress={() => router.push('/addons')}
                        >
                            <Text style={styles.addButtonText}>Add Addons</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : filteredResults.length === 0 ? (
                <View style={styles.empty}>
                    <MaterialIcons name="cloud-off" size={64} color={activeColors.textSecondary + '40'} />
                    <Text style={[styles.emptyText, { color: activeColors.textSecondary }]}>
                        No streams found for this filter
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredResults}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `${item.url}-${index}`}
                    contentContainerStyle={styles.list}
                    ListFooterComponent={loading ? <ActivityIndicator size="small" color={activeColors.primary} style={{ marginVertical: 20 }} /> : null}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    filterText: {
        color: '#94a3b8',
        fontSize: 14,
        fontFamily: 'Outfit_500Medium',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 13,
        marginBottom: 4,
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    badgeContainer: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    metaBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    metaText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    latencyText: {
        fontSize: 10,
        fontWeight: '500',
        marginLeft: 4,
    },
    action: {
        paddingLeft: 12,
    },
    qualityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    qualityText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#fff',
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
    },
    addButton: {
        marginTop: 24,
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 25,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
