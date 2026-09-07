import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, ImageBackground } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAddonsStore } from '@/store/addonsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';
import { useStreamSources, StreamResult } from '@/hooks/useStreamSources';
import { StreamResultWithHealth, HealthInfo } from '@/services/streamHealthEngine';
import { useTheme } from '@/hooks/useTheme';
import { resolveMagnet } from '@/services/debrid';
import { Alert } from 'react-native';
import { TVFocusable } from '@/components/TVFocusable';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const Touchable = Platform.isTV ? TVFocusable as any : TouchableOpacity;

const ServerSkeletonItem = () => {
    const { colors: activeColors } = useTheme();
    return (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
            <View style={[styles.card, { borderColor: activeColors.primary + '20', backgroundColor: activeColors.primary + '05', overflow: 'hidden' }]}>
                <View style={[styles.iconContainer, { backgroundColor: activeColors.primary + '10' }]}>
                    <Skeleton width={32} height={32} borderRadius={16} style={{ backgroundColor: activeColors.primary + '20' }} />
                </View>
                <View style={styles.info}>
                    <Skeleton width="70%" height={16} borderRadius={4} style={{ marginBottom: 12, backgroundColor: activeColors.primary + '20' }} />
                    <View style={styles.metricsRow}>
                        <Skeleton width={50} height={20} borderRadius={6} style={{ backgroundColor: activeColors.primary + '15' }} />
                        <Skeleton width={80} height={20} borderRadius={6} style={{ backgroundColor: activeColors.primary + '15' }} />
                        <Skeleton width={60} height={20} borderRadius={6} style={{ backgroundColor: activeColors.primary + '15' }} />
                    </View>
                </View>
                <View style={[styles.action, { flexDirection: 'column', justifyContent: 'center' }]}>
                    <Skeleton width={32} height={32} borderRadius={8} style={{ backgroundColor: activeColors.primary + '20' }} />
                </View>
            </View>
        </Animated.View>
    );
};

const getTagsFromTitle = (title: string) => {
    if (!title) return [];
    const tags: string[] = [];
    const languages = ['Hindi', 'English', 'Spanish', 'French', 'Bengali', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Marathi', 'Gujarati', 'Punjabi', 'Urdu', 'Korean', 'Japanese', 'Chinese', 'Multi', 'Dual Audio'];
    const qualities = ['CAM', 'HDTS', 'DVDScr', 'DVDRip', 'WEBRip', 'WEB-DL', 'BluRay', 'Remux', 'HDRip', 'BDRemux', 'HDTC', '4K', 'AUTO', 'Multi-Quality'];

    languages.forEach(lang => {
        const regex = new RegExp(`\\b${lang.replace(' ', '\\s*')}\\b`, 'i');
        if (regex.test(title)) tags.push(lang);
    });

    qualities.forEach(q => {
        const regexStr = q === 'WEB-DL' ? '\\bweb-?dl\\b' : `\\b${q}\\b`;
        const regex = new RegExp(regexStr, 'i');
        if (regex.test(title)) tags.push(q);
    });

    const sizeRegex = /\b(\d+(?:\.\d+)?)\s*(GB|MB|GiB|MiB)\b/i;
    const sizeMatch = title.match(sizeRegex);
    if (sizeMatch) {
        tags.push(sizeMatch[0].toUpperCase());
    }

    return tags;
};

export default function ServerSelectionScreen() {
    const { query, type: rawType, movieUrl, tmdb, id, season, episode, movieData, title, poster, backdrop, genre } = useLocalSearchParams();
    const type = Array.isArray(rawType) ? rawType[0] : rawType;
    const tmdbId = Array.isArray(tmdb) ? tmdb[0] : tmdb || (Array.isArray(id) ? id[0] : id);
    const { addons, isHydrated } = useAddonsStore();
    const { results, loading, searchStreams, healthChecking, healthProgress, currentLog } = useStreamSources();
    const [resolvingMagnet, setResolvingMagnet] = useState(false);
    const [filter, setFilter] = useState<'all' | 'direct' | 'debrid'>('all');
    const hasAutoPlayed = React.useRef(false);
    const router = useRouter();

    const isMovie = type === 'movie' || type === 'rogmovie' || !type;

    useEffect(() => {
        searchStreams(
            query as string,
            tmdbId as string,
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

    // Auto-play: wait until scraping is done, then pick the top-scored result
    useEffect(() => {
        if (!loading && !healthChecking && results.length > 0 && autoSelectHealthiestSource && !hasAutoPlayed.current) {
            hasAutoPlayed.current = true;
            handlePlay(results[0], 0, results);
        }
    }, [results, loading, healthChecking, autoSelectHealthiestSource]);

    const handlePlay = async (item: StreamResult, index: number, sourceList: StreamResult[] = results) => {
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
            tmdbId: tmdbId,
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

        router.push({ pathname: Platform.isTV ? '/(tv)/player' : '/player', params: videoParams });
    };

    const handleDownload = async (item: StreamResult) => {
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

    const renderItem = ({ item, index }: { item: StreamResultWithHealth, index: number }) => {
        const health = item.healthInfo;
        const isDead = health && !health.isAlive;
        const latencyText = health && health.isAlive && health.latency < 9999 ? `${health.latency}ms` : null;

        // Colors for health badges
        const getHealthColor = () => {
            if (isDead) return '#ef4444';
            if (!health) return '#94a3b8';
            if (health.score >= 75) return '#22c55e';
            if (health.score >= 50) return '#eab308';
            return '#ef4444';
        };

        const healthColor = getHealthColor();

        return (
            <Touchable
                style={{ marginBottom: 12, width: '100%', opacity: isDead ? 0.45 : 1 }}
                onPress={() => handlePlay(item, index)}
                activeOpacity={0.8}
                hasTVPreferredFocus={index === 0}
                autoFlex={false}
            >
                <BlurView intensity={25} tint="dark" style={[styles.card, { borderColor: isDead ? '#ef444440' : 'rgba(255,255,255,0.05)', backgroundColor: isDead ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0,0,0,0.3)', marginBottom: 0, width: '100%' }]}>
                    <View style={[styles.iconContainer, { backgroundColor: isDead ? '#ef444415' : 'rgba(255,255,255,0.05)' }]}>
                        <MaterialIcons name={item.isTorrent ? "cloud-download" : "play-lesson"} size={26} color={isDead ? '#ef4444' : '#fff'} />
                    </View>
                    <View style={styles.info}>
                        <Text style={[styles.title, { color: '#fff' }]} numberOfLines={3}>
                            {item.isTorrent && debridProvider !== 'none' && <Text style={{ color: activeColors.primary, fontFamily: 'Outfit_700Bold' }}>[RD] </Text>}
                            {item.title}
                        </Text>

                        <View style={styles.metricsRow}>
                            {/* Health status badge */}
                            {health && (
                                <View style={[styles.metaBadge, { backgroundColor: healthColor + '20', borderColor: healthColor + '40' }]}>
                                    <Text style={[styles.metaText, { color: healthColor }]}>
                                        {health.statusBadge.split(' ')[0]} {health.statusBadge.split(' ')[1]?.toUpperCase() || 'UNKNOWN'}
                                    </Text>
                                </View>
                            )}
                            {/* Latency badge */}
                            {latencyText && (
                                <View style={[styles.metaBadge, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                                    <MaterialIcons name="speed" size={10} color="#cbd5e1" style={{ marginRight: 2 }} />
                                    <Text style={[styles.metaText, { color: '#cbd5e1' }]}>{latencyText}</Text>
                                </View>
                            )}
                            {/* Quality badge */}
                            {item.quality && (
                                <View style={[styles.metaBadge, { backgroundColor: activeColors.primary + '20', borderColor: activeColors.primary + '40' }]}>
                                    <MaterialIcons name="hd" size={10} color={activeColors.primary} style={{ marginRight: 2 }} />
                                    <Text style={[styles.metaText, { color: activeColors.primary }]}>{String(item.quality).toUpperCase()}</Text>
                                </View>
                            )}
                            {/* Tag badges */}
                            {getTagsFromTitle(item.title).map(tag => (
                                <View key={tag} style={[styles.metaBadge, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }]}>
                                    <Text style={[styles.metaText, { color: '#94a3b8' }]}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                    {!Platform.isTV && (
                        <View style={[styles.action, { flexDirection: 'column', justifyContent: 'center' }]}>
                            <Touchable
                                style={[styles.qualityBadge, { backgroundColor: isDead ? '#ef4444' : 'rgba(255,255,255,0.1)' }]}
                                onPress={() => handleDownload(item)}
                            >
                                <MaterialIcons name="file-download" size={18} color={isDead ? "#fff" : activeColors.text} />
                            </Touchable>
                        </View>
                    )}
                </BlurView>
            </Touchable>
        );
    };

    const filteredResults = React.useMemo(() => {
        return results.filter(item => {
            if (filter === 'all') return true;
            if (filter === 'direct') return !item.isTorrent;
            if (filter === 'debrid') return item.isTorrent;
            return true;
        });
    }, [results, filter]);

    return (
        <View style={{ flex: 1, backgroundColor: activeColors.background }}>
            {(backdrop || poster) ? (
                <ImageBackground
                    source={{ uri: `https://image.tmdb.org/t/p/original${backdrop || poster}` }}
                    style={StyleSheet.absoluteFill}
                >
                    <BlurView intensity={Platform.isTV ? 100 : 80} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                </ImageBackground>
            ) : null}
            <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>

            <View style={styles.header}>
                <Touchable onPress={() => router.back()} style={styles.backBtn} hasTVPreferredFocus={results.length === 0}>
                    <MaterialIcons name="arrow-back" size={24} color={activeColors.text} />
                </Touchable>
                <View style={styles.headerInfo}>
                    <Text style={[styles.headerTitle, { color: activeColors.text }]} numberOfLines={1}>{title || query || 'Available Sources'}</Text>
                    <Text style={[styles.headerSubtitle, { color: activeColors.textSecondary }]} numberOfLines={1}>
                        {results.length} servers found
                        {loading && currentLog && ` • ${currentLog}`}
                        {loading && !currentLog && ` • Scanning sources…`}
                        {!loading && healthChecking && ` • Checking ${healthProgress.checked}/${healthProgress.total}`}
                        {!loading && !healthChecking && healthProgress.total > 0 && ` • Health checked ✓`}
                    </Text>
                </View>
            </View>

            {results.length > 0 && (
                <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 }}>
                    <Touchable autoFlex={false} onPress={() => setFilter('all')} style={[styles.filterTab, filter === 'all' && { backgroundColor: activeColors.primary, borderColor: activeColors.primary }]}>
                        <Text style={[styles.filterText, { color: filter === 'all' ? '#fff' : activeColors.textSecondary }]}>All</Text>
                    </Touchable>
                    <Touchable autoFlex={false} onPress={() => setFilter('direct')} style={[styles.filterTab, filter === 'direct' && { backgroundColor: activeColors.primary, borderColor: activeColors.primary }]}>
                        <Text style={[styles.filterText, { color: filter === 'direct' ? '#fff' : activeColors.textSecondary }]}>Direct</Text>
                    </Touchable>
                    <Touchable autoFlex={false} onPress={() => setFilter('debrid')} style={[styles.filterTab, filter === 'debrid' && { backgroundColor: activeColors.primary, borderColor: activeColors.primary }]}>
                        <Text style={[styles.filterText, { color: filter === 'debrid' ? '#fff' : activeColors.textSecondary }]}>Debrid</Text>
                    </Touchable>
                </View>
            )}

            {((results.length === 0 && (loading || !isHydrated)) || resolvingMagnet) ? (
                <View style={styles.list}>
                    {resolvingMagnet && (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={activeColors.primary} />
                            <Text style={{ color: activeColors.text, marginTop: 12, fontFamily: 'Outfit_500Medium' }}>Unrestricting link via Debrid...</Text>
                        </View>
                    )}
                    {!resolvingMagnet && Array.from({ length: 8 }).map((_, index) => (
                        <ServerSkeletonItem key={index} />
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
        </View>
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
        overflow: 'hidden',
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
        fontSize: 14,
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    metaText: {
        fontSize: 10,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.5,
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
