import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
    Platform, ScrollView, Dimensions, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSettingsStore } from '@/store/settingsStore';
import { TVFocusable } from '@/components/TVFocusable';
import CatalogBrowser, { BrowserCategory, BrowserItem } from '@/components/CatalogBrowser';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useToastStore } from '@/store/toastStore';

const { width, height } = Dimensions.get('window');

interface StremioCatalog {
    type: string;
    id: string;
    name: string;
    extra?: { name: string; isRequired: boolean }[];
}

interface StremioMeta {
    id: string;
    type: string;
    name: string;
    poster?: string;
    background?: string;
    logo?: string;
    description?: string;
    country?: string;
    released?: string;
    videos?: StremioVideo[];
}

interface StremioVideo {
    id: string;
    title: string;
    season?: number;
    episode?: number;
    released?: string;
    thumbnail?: string;
    description?: string;
    type?: string;
}

interface StremioStream {
    url?: string;
    title?: string;
    name?: string;
    infoHash?: string;
    fileIdx?: number;
    behaviorHints?: any;
}

export default function StremioBrowserScreen() {
    const { url, title, manifest: manifestStr } = useLocalSearchParams();
    const manifest = useMemo(() => JSON.parse(manifestStr as string), [manifestStr]);
    const router = useRouter();
    const theme = useSettingsStore(state => state.theme);
    const activeColors = Colors[theme] || Colors.dark;

    const [selectedCatalog, setSelectedCatalog] = useState<StremioCatalog | null>(null);
    const [items, setItems] = useState<StremioMeta[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [streams, setStreams] = useState<StremioStream[]>([]);
    const [showStreams, setShowStreams] = useState(false);
    const [selectedItem, setSelectedItem] = useState<StremioMeta | null>(null);

    // ─── Pagination State ────────────────────────────────
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // ─── Search State ────────────────────────────────────
    const [isSearching, setIsSearching] = useState(false);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const PAGE_SIZE = 20;

    // ─── Series Detail State ────────────────────────────
    const [detailMeta, setDetailMeta] = useState<StremioMeta | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [detailLoading, setDetailLoading] = useState(false);
    const [episodeStreamLoading, setEpisodeStreamLoading] = useState<string | null>(null);
    const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
    const isFavorite = useFavoritesStore((state) => state.isFavorite);
    const showToast = useToastStore((state) => state.showToast);

    const baseUrl = (url as string).replace('/manifest.json', '');

    // ─── Filter out search catalogs ─────────────────────
    const browsableCatalogs = useMemo(
        () => manifest.catalogs.filter((c: StremioCatalog) =>
            !c.id.toLowerCase().includes('search') &&
            !c.name.toLowerCase().includes('search')
        ),
        [manifest.catalogs]
    );

    useEffect(() => {
        // Reset state when navigating to a different addon
        setItems([]);
        setSelectedCatalog(null);
        setSkip(0);
        setHasMore(true);
        setShowDetail(false);
        setDetailMeta(null);
        setSearchQuery('');
        setIsSearching(false);
    }, [url]);

    useEffect(() => {
        if (browsableCatalogs.length > 0 && !selectedCatalog) {
            setSelectedCatalog(browsableCatalogs[0]);
        }
    }, [browsableCatalogs]);

    useEffect(() => {
        if (selectedCatalog) {
            setSearchQuery('');
            setIsSearching(false);
            loadCatalog(selectedCatalog, 0, false);
        }
    }, [selectedCatalog]);

    const loadCatalog = async (catalog: StremioCatalog, skipVal: number = 0, append: boolean = false) => {
        if (append) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setHasMore(true);
        }
        try {
            let fetchUrl = `${baseUrl}/catalog/${catalog.type}/${catalog.id}`;
            if (skipVal > 0) {
                fetchUrl += `/skip=${skipVal}.json`;
            } else {
                fetchUrl += '.json';
            }
            const response = await axios.get(fetchUrl);
            const newMetas = response.data.metas || [];

            if (newMetas.length < PAGE_SIZE) {
                setHasMore(false);
            }

            if (append) {
                setItems(prev => [...prev, ...newMetas]);
            } else {
                setItems(newMetas);
            }
            setSkip(skipVal + newMetas.length);
        } catch (e) {
            console.error('Failed to load catalog', e);
            if (!append) setHasMore(false);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // ─── Load More (Pagination) ──────────────────────────
    const handleLoadMore = useCallback(() => {
        if (loadingMore || !hasMore || !selectedCatalog || isSearching) return;
        loadCatalog(selectedCatalog, skip, true);
    }, [loadingMore, hasMore, selectedCatalog, skip, isSearching]);

    // ─── Find search catalog for current type ────────────
    const searchCatalogForType = useMemo(() => {
        if (!selectedCatalog) return null;
        const type = selectedCatalog.type;
        return manifest.catalogs.find(
            (c: StremioCatalog) => c.id.toLowerCase().includes('search') && c.type === type
        ) || null;
    }, [selectedCatalog, manifest.catalogs]);

    // ─── API Search ─────────────────────────────────────
    const performSearch = useCallback(async (query: string) => {
        if (!query.trim() || !searchCatalogForType) {
            // No query or no search catalog — reload the regular catalog
            if (selectedCatalog) {
                setIsSearching(false);
                loadCatalog(selectedCatalog, 0, false);
            }
            return;
        }
        setIsSearching(true);
        setLoading(true);
        try {
            const searchUrl = `${baseUrl}/catalog/${searchCatalogForType.type}/${searchCatalogForType.id}/search=${encodeURIComponent(query.trim())}.json`;
            const response = await axios.get(searchUrl);
            setItems(response.data.metas || []);
            setHasMore(false); // search results are not paginated
        } catch (e) {
            console.error('Search failed', e);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [searchCatalogForType, selectedCatalog, baseUrl]);

    // ─── Debounced search handler ────────────────────────
    const handleSearch = useCallback((text: string) => {
        setSearchQuery(text);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            performSearch(text);
        }, 500);
    }, [performSearch]);

    // ─── Determine if current catalog is movie/series ───
    const isMediaCatalog = useMemo(() => {
        if (!selectedCatalog) return false;
        const t = selectedCatalog.type.toLowerCase();
        return t === 'movie' || t === 'series';
    }, [selectedCatalog]);

    // ─── Handle item press ──────────────────────────────
    const handleItemPress = useCallback((browserItem: BrowserItem) => {
        const meta = items.find(i => i.id === browserItem.id);
        if (!meta) return;
        handlePress(meta);
    }, [items, isMediaCatalog]);

    const handlePress = async (item: StremioMeta) => {
        const catalogType = selectedCatalog?.type?.toLowerCase();

        // Only series gets the detail/episode view
        if (catalogType !== 'series') {
            // Movie / TV / Live / other — direct stream fetch
            fetchAndPlayStreams(item);
            return;
        }

        // Series — fetch full meta to get episodes
        setDetailLoading(true);
        try {
            const metaUrl = `${baseUrl}/meta/${item.type}/${encodeURIComponent(item.id)}.json`;
            const response = await axios.get(metaUrl);
            const fullMeta: StremioMeta = response.data.meta;

            if (!fullMeta.videos || fullMeta.videos.length === 0) {
                // No episodes found — fallback to direct stream
                setDetailLoading(false);
                fetchAndPlayStreams({ ...item, ...fullMeta });
            } else {
                // Show series detail view with episodes
                setDetailMeta(fullMeta);
                const seasons = Array.from(new Set(fullMeta.videos.map(v => v.season || 1))).sort((a, b) => a - b);
                setSelectedSeason(seasons[0]);
                setShowDetail(true);
                setDetailLoading(false);
            }
        } catch (e) {
            console.error('Failed to load meta', e);
            setDetailLoading(false);
            // Fallback: treat like direct stream
            fetchAndPlayStreams(item);
        }
    };

    // ─── Fetch streams and play ─────────────────────────
    const fetchAndPlayStreams = async (item: StremioMeta, videoId?: string) => {
        setSelectedItem(item);
        setLoading(true);
        try {
            const streamId = videoId || item.id;
            const fetchUrl = `${baseUrl}/stream/${item.type}/${encodeURIComponent(streamId)}.json`;
            const response = await axios.get(fetchUrl);
            const streamList = response.data.streams || [];

            if (streamList.length === 1 && streamList[0].url) {
                playStream(streamList[0], item);
            } else if (streamList.length > 1) {
                setStreams(streamList);
                setShowStreams(true);
            } else {
                alert('No streams available for this item');
            }
        } catch (e) {
            console.error('Failed to load streams', e);
            alert('Failed to load streams');
        } finally {
            setLoading(false);
            setEpisodeStreamLoading(null);
        }
    };

    // ─── Handle episode press ───────────────────────────
    const handleEpisodePress = (video: StremioVideo) => {
        if (!detailMeta) return;
        setEpisodeStreamLoading(video.id);
        fetchAndPlayStreams(detailMeta, video.id);
    };

    const playStream = (stream: StremioStream, meta: StremioMeta) => {
        if (!stream.url) {
            alert('Streaming via InfoHash/Torrent is not supported yet. Only Direct URLs work.');
            return;
        }

        const videoParams: any = {
            url: encodeURIComponent(stream.url),
            title: stream.title || stream.name || meta.name,
            channelLogo: meta.logo || meta.poster || '',
            description: meta.description || '',
        };

        if (stream.behaviorHints?.proxyHeaders) {
            const headers = stream.behaviorHints.proxyHeaders;
            videoParams.headers = JSON.stringify(headers);
            if (headers.Referer || headers.referer) {
                videoParams.referer = headers.Referer || headers.referer;
            }
            if (headers['User-Agent'] || headers['user-agent']) {
                videoParams.userAgent = headers['User-Agent'] || headers['user-agent'];
            }
        }

        router.push({ pathname: '/(tv)/player', params: videoParams });
    };

    // ─── Map catalogs → BrowserCategory (exclude search) ──
    const categories: BrowserCategory[] = useMemo(
        () => browsableCatalogs.map((c: StremioCatalog) => ({ id: c.id, name: c.name })),
        [browsableCatalogs]
    );

    // ─── Map items → BrowserItem ─────────────────────────
    const browserItems: BrowserItem[] = useMemo(() => {
        return items.map(item => {
            const isLive = item.type === 'live' || item.type === 'tv' || item.type === 'iptv' || selectedCatalog?.type === 'live' || selectedCatalog?.type === 'tv' || selectedCatalog?.type === 'iptv';
            return {
                id: item.id,
                title: item.name,
                imageUrl: item.poster || item.logo,
                subtitle: isLive ? 'Live Station' : item.type?.toUpperCase(),
                isLive,
            };
        });
    }, [items, selectedCatalog]);

    const handleSelectCategory = (cat: BrowserCategory) => {
        const catalog = browsableCatalogs.find((c: StremioCatalog) => c.id === cat.id);
        if (catalog) {
            setSelectedCatalog(catalog);
            setShowDetail(false);
            setDetailMeta(null);
            setSearchQuery('');
            setIsSearching(false);
        }
    };

    const handleToggleFavorite = useCallback((browserItem: BrowserItem) => {
        const meta = items.find((entry) => entry.id === browserItem.id);
        if (!meta) return;

        const favId = `stremio:${selectedCatalog?.id || 'catalog'}:${meta.id}`;
        const exists = isFavorite(favId);
        toggleFavorite({
            id: favId,
            kind: 'stremio',
            title: meta.name,
            subtitle: browserItem.subtitle,
            imageUrl: meta.poster || meta.logo,
            browserUrl: url as string,
            browserManifest: manifestStr as string,
        });
        showToast(exists ? 'Removed from favourites' : 'Added to favourites', 'success');
    }, [isFavorite, items, manifestStr, selectedCatalog, showToast, toggleFavorite, url]);

    const handleIsFavorite = useCallback((browserItem: BrowserItem) => {
        return isFavorite(`stremio:${selectedCatalog?.id || 'catalog'}:${browserItem.id}`);
    }, [isFavorite, selectedCatalog]);

    // ─── Series Detail View ─────────────────────────────
    const seasons = useMemo(() => {
        if (!detailMeta?.videos) return [];
        return Array.from(new Set(detailMeta.videos.map(v => v.season || 1))).sort((a, b) => a - b);
    }, [detailMeta]);

    const episodesForSeason = useMemo(() => {
        if (!detailMeta?.videos) return [];
        return detailMeta.videos
            .filter(v => (v.season || 1) === selectedSeason)
            .sort((a, b) => (a.episode || 0) - (b.episode || 0));
    }, [detailMeta, selectedSeason]);

    const renderEpisode = ({ item: video }: { item: StremioVideo }) => {
        const isEpLoading = episodeStreamLoading === video.id;
        return (
            <TVFocusable
                style={[styles.episodeCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}
                onPress={() => handleEpisodePress(video)}
                focusedScale={1.02}
                focusedBorderColor={activeColors.primary}
            >
                <View style={styles.episodeCardContent}>
                    <View style={styles.episodeThumbnailWrap}>
                        {video.thumbnail ? (
                            <Image source={{ uri: video.thumbnail }} style={styles.episodeThumbnail} resizeMode="cover" />
                        ) : (
                            <View style={[styles.episodeThumbnailFallback, { backgroundColor: activeColors.surface }]}>
                                <MaterialIcons name="play-circle-outline" size={48} color={activeColors.primary} />
                            </View>
                        )}
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.8)']}
                            style={styles.episodeThumbnailOverlay}
                        />
                        {isEpLoading && (
                            <View style={styles.episodeLoadingOverlay}>
                                <ActivityIndicator size="small" color="#fff" />
                            </View>
                        )}
                    </View>
                    <View style={styles.episodeInfo}>
                        <View style={styles.episodeMetaHeader}>
                            <Text style={[styles.episodeNumber, { color: activeColors.primary }]}>
                                EPISODE {video.episode || '—'}
                            </Text>
                            {video.released && (
                                <Text style={[styles.episodeDate, { color: activeColors.textSecondary }]}>
                                    {new Date(video.released).toLocaleDateString()}
                                </Text>
                            )}
                        </View>
                        <Text style={[styles.episodeTitle, { color: activeColors.text }]} numberOfLines={1}>
                            {video.title || `Episode ${video.episode}`}
                        </Text>
                        <Text style={[styles.episodeDesc, { color: activeColors.textSecondary }]} numberOfLines={2}>
                            {video.description || 'No description available for this episode.'}
                        </Text>
                    </View>
                    <View style={styles.playIconContainer}>
                        <MaterialIcons name="play-arrow" size={32} color={activeColors.primary} />
                    </View>
                </View>
            </TVFocusable>
        );
    };

    const detailView = showDetail && detailMeta ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: activeColors.background, zIndex: 100 }]}>
            {/* Background Image Immersive */}
            <Image
                source={{ uri: detailMeta.background || detailMeta.poster }}
                style={styles.detailBgImmersive}
                blurRadius={10}
            />
            <LinearGradient
                colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)', activeColors.background]}
                locations={[0, 0.4, 0.8]}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* TV Header */}
                <View style={styles.tvDetailHeader}>
                    <TVFocusable
                        onPress={() => { setShowDetail(false); setDetailMeta(null); }}
                        style={styles.tvBackCircle}
                        focusedScale={1.1}
                        hasTVPreferredFocus
                    >
                        <MaterialIcons name="arrow-back" size={28} color="#fff" />
                    </TVFocusable>
                    <View style={styles.tvHeaderSeparator} />
                    <Text style={[styles.tvHeaderInfoText, { color: activeColors.textSecondary }]}>
                        {detailMeta.type?.toUpperCase()} • {seasons.length} SEASONS
                    </Text>
                </View>

                {/* Hero Layout */}
                <View style={styles.tvHeroContent}>
                    <View style={styles.tvHeroLeft}>
                        <Image
                            source={{ uri: detailMeta.poster || detailMeta.background }}
                            style={styles.tvHeroPoster}
                        />
                        <TVFocusable
                            onPress={() => handleEpisodePress(episodesForSeason[0])}
                            style={[styles.tvMainPlayBtn, { backgroundColor: activeColors.primary }]}
                            focusedScale={1}
                        >
                            <View style={styles.tvMainPlayContent}>
                                <MaterialIcons name="play-arrow" size={32} color="#fff" />
                                <Text style={styles.tvMainPlayText}>WATCH S{selectedSeason} E1</Text>
                            </View>
                        </TVFocusable>
                    </View>

                    <View style={styles.tvHeroRight}>
                        <Text style={[styles.tvDetailTitle, { color: activeColors.text }]}>
                            {detailMeta.name}
                        </Text>

                        <View style={styles.tvDetailMetaRow}>
                            {detailMeta.released && (
                                <View style={styles.tvMetaBadge}>
                                    <Text style={styles.tvMetaBadgeText}>{new Date(detailMeta.released).getFullYear()}</Text>
                                </View>
                            )}
                            {detailMeta.country && (
                                <Text style={[styles.tvMetaSimple, { color: activeColors.textSecondary }]}>
                                    {detailMeta.country}
                                </Text>
                            )}
                            <Text style={[styles.tvMetaSimple, { color: activeColors.textSecondary }]}>
                                {detailMeta.videos?.length} Episodes
                            </Text>
                        </View>

                        <Text style={[styles.tvDetailDesc, { color: activeColors.textSecondary }]} numberOfLines={6}>
                            {detailMeta.description || 'No description available for this series.'}
                        </Text>
                    </View>
                </View>

                {/* Season Selection - Grid or horizontal scroll */}
                {seasons.length > 1 && (
                    <View style={styles.tvSeasonSection}>
                        <Text style={[styles.tvSectionTitle, { color: activeColors.text }]}>Seasons</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.tvSeasonScroll}
                        >
                            {seasons.map(season => {
                                const isActive = selectedSeason === season;
                                return (
                                    <TVFocusable
                                        key={season}
                                        style={[
                                            styles.tvSeasonCard,
                                            { backgroundColor: activeColors.card, borderColor: activeColors.border },
                                            isActive && { borderColor: activeColors.primary, borderBottomWidth: 4 }
                                        ]}
                                        onPress={() => setSelectedSeason(season)}
                                        focusedScale={1.1}
                                    >
                                        <Text style={[
                                            styles.tvSeasonText,
                                            { color: isActive ? activeColors.primary : activeColors.text }
                                        ]}>
                                            S{season}
                                        </Text>
                                    </TVFocusable>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Episodes Grid-like list */}
                <View style={styles.tvEpisodeSection}>
                    <View style={styles.tvEpisodeHeader}>
                        <Text style={[styles.tvSectionTitle, { color: activeColors.text }]}>
                            Episodes — Season {selectedSeason}
                        </Text>
                        <Text style={[styles.tvEpisodeCount, { color: activeColors.textSecondary }]}>
                            {episodesForSeason.length} Total
                        </Text>
                    </View>

                    <View style={styles.tvEpisodeList}>
                        {episodesForSeason.map(video => (
                            <View key={video.id}>
                                {renderEpisode({ item: video })}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    ) : null;


    // ─── Streams Modal ──────────────────────────────────
    const streamsModal = showStreams ? (
        <View style={[styles.streamsOverlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
            <View style={[styles.streamsContent, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                <View style={styles.streamsHeader}>
                    <View>
                        <Text style={[styles.streamsTitle, { color: activeColors.text }]}>Select Quality / Server</Text>
                        <Text style={[styles.streamsSubtitle, { color: activeColors.textSecondary }]}>
                            {streams.length} options available
                        </Text>
                    </View>
                    <TVFocusable
                        onPress={() => setShowStreams(false)}
                        style={styles.streamsCloseBtn}
                        focusedScale={1.1}
                    >
                        <MaterialIcons name="close" size={28} color={activeColors.text} />
                    </TVFocusable>
                </View>
                <FlatList
                    data={streams}
                    keyExtractor={(item, index) => index.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    renderItem={({ item }) => (
                        <TVFocusable
                            style={[styles.streamItem, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}
                            onPress={() => {
                                setShowStreams(false);
                                playStream(item, selectedItem!);
                            }}
                            focusedScale={1.03}
                            focusedBorderColor={activeColors.primary}
                        >
                            <View style={styles.streamItemContent}>
                                <View style={[styles.streamIconBox, { backgroundColor: activeColors.primary + '20' }]}>
                                    <MaterialIcons name="dns" size={24} color={activeColors.primary} />
                                </View>
                                <View style={styles.streamInfo}>
                                    <Text style={[styles.streamName, { color: activeColors.text }]}>
                                        {item.name || 'External Link'}
                                    </Text>
                                    <Text style={[styles.streamTitleText, { color: activeColors.textSecondary }]} numberOfLines={2}>
                                        {item.title || 'No additional info'}
                                    </Text>
                                </View>
                                <View style={styles.streamPlayIndicator}>
                                    <MaterialIcons name="play-arrow" size={28} color={activeColors.primary} />
                                </View>
                            </View>
                        </TVFocusable>
                    )}
                />
            </View>
        </View>
    ) : null;

    // ─── Detail Loading Overlay ─────────────────────────
    const detailLoadingOverlay = detailLoading ? (
        <View style={styles.detailLoadingOverlay}>
            <ActivityIndicator size="large" color={activeColors.primary} />
            <Text style={[styles.detailLoadingText, { color: activeColors.text }]}>Loading details...</Text>
        </View>
    ) : null;

    return (
        <CatalogBrowser
            title={(title as string) || manifest.name}
            subtitle={manifest.description}
            backgroundImage={manifest.background}
            onBack={() => router.back()}
            categories={categories}
            selectedCategoryId={selectedCatalog?.id}
            onSelectCategory={handleSelectCategory}
            items={browserItems}
            loading={loading}
            searchQuery={searchQuery}
            onSearch={handleSearch}
            searchPlaceholder={searchCatalogForType ? 'Search ...' : 'Filter results...'}
            onItemPress={handleItemPress}
            onToggleFavorite={handleToggleFavorite}
            isItemFavorite={handleIsFavorite}
            onEndReached={handleLoadMore}
            loadingMore={loadingMore}
            isLiveMode={selectedCatalog?.type === 'live' || selectedCatalog?.type === 'tv' || selectedCatalog?.type === 'iptv'}
        >
            {detailView}
            {streamsModal}
            {detailLoadingOverlay}
        </CatalogBrowser>
    );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
    // Streams Modal
    streamsOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: 40,
    },
    streamsContent: {
        width: '60%',
        maxHeight: '85%',
        borderRadius: 30,
        padding: 40,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.6,
        shadowRadius: 30,
        elevation: 10,
    },
    streamsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 35,
    },
    streamsTitle: {
        fontSize: 32,
        fontFamily: 'Outfit_700Bold',
    },
    streamsSubtitle: {
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
        marginTop: 4,
        opacity: 0.8,
    },
    streamsCloseBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    streamItem: {
        borderRadius: 20,
        borderWidth: 2,
        marginBottom: 16,
    },
    streamItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        flex: 1,
        gap: 20,
    },
    streamIconBox: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    streamInfo: {
        flex: 1,
    },
    streamName: {
        fontSize: 20,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 4,
    },
    streamTitleText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        lineHeight: 20,
    },
    streamPlayIndicator: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Detail View TV Focused
    detailBgImmersive: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.7,
        opacity: 0.6,
    },
    tvDetailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 60,
        paddingTop: 40,
        paddingBottom: 20,
    },
    tvBackCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tvHeaderSeparator: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 24,
    },
    tvHeaderInfoText: {
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
        letterSpacing: 1.2,
    },
    tvHeroContent: {
        flexDirection: 'row',
        paddingHorizontal: 60,
        marginTop: 5,
        gap: 30,
    },
    tvHeroLeft: {
        width: 180,
    },
    tvHeroPoster: {
        width: 180,
        height: 270,
        borderRadius: 16,
        backgroundColor: '#1a1f35',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
    },
    tvMainPlayBtn: {
        marginTop: 20,
        height: 54,
        borderRadius: 12,
    },
    tvMainPlayContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: 10,
    },
    tvMainPlayText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
    },
    tvHeroRight: {
        flex: 1,
        justifyContent: 'flex-start',
        paddingTop: 5,
    },
    tvDetailTitle: {
        fontSize: 42,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 12,
    },
    tvDetailMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
    },
    tvMetaBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
    },
    tvMetaBadgeText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Outfit_700Bold',
    },
    tvMetaSimple: {
        fontSize: 15,
        fontFamily: 'Outfit_500Medium',
    },
    tvDetailDesc: {
        fontSize: 16,
        lineHeight: 26,
        fontFamily: 'Inter_400Regular',
        maxWidth: 700,
        opacity: 0.9,
    },
    tvSeasonSection: {
        marginTop: 20,
        paddingHorizontal: 60,
    },
    tvSectionTitle: {
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 12,
    },
    tvSeasonScroll: {
        gap: 14,
        paddingBottom: 5,
    },
    tvSeasonCard: {
        width: 100,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    tvSeasonText: {
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
    },
    tvEpisodeSection: {
        marginTop: 20,
        paddingHorizontal: 60,
    },
    tvEpisodeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 12,
    },
    tvEpisodeCount: {
        fontSize: 14,
        fontFamily: 'Outfit_500Medium',
    },
    tvEpisodeList: {
        gap: 8,
    },
    episodeCard: {
        borderRadius: 12,
        borderWidth: 2,
        overflow: 'hidden',
    },
    episodeCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 6,
        flex: 1,
    },
    episodeThumbnailWrap: {
        width: 120,
        height: 68,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    episodeThumbnail: {
        width: '100%',
        height: '100%',
    },
    episodeThumbnailOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
    },
    episodeThumbnailFallback: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    episodeLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    episodeInfo: {
        flex: 1,
        paddingHorizontal: 16,
    },
    episodeMetaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    episodeNumber: {
        fontSize: 11,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.8,
    },
    episodeDate: {
        fontSize: 11,
        fontFamily: 'Outfit_500Medium',
    },
    episodeTitle: {
        fontSize: 15,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 3,
    },
    episodeDesc: {
        fontSize: 12,
        lineHeight: 18,
        fontFamily: 'Inter_400Regular',
    },
    playIconContainer: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
    detailLoadingText: {
        marginTop: 12,
        fontSize: 15,
        fontFamily: 'Outfit_500Medium',
    },
});
