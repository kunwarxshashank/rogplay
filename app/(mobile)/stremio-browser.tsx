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
    const { url, title, manifest: manifestStr, selectedItemId, selectedItemType } = useLocalSearchParams();
    const manifest = useMemo(() => {
        try {
            return JSON.parse(manifestStr as string);
        } catch {
            return { catalogs: [], name: 'Stremio Addon' };
        }
    }, [manifestStr]);
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

    // Derive baseUrl: prefer explicit url param, then manifest.url, then manifest.baseUrl
    const baseUrl = useMemo(() => {
        if (url) return (url as string).replace('/manifest.json', '');
        if (manifest?.url) return (manifest.url as string).replace('/manifest.json', '');
        if (manifest?.baseUrl) return manifest.baseUrl as string;
        return '';
    }, [url, manifest]);

    // ─── Filter out search catalogs ─────────────────────
    const browsableCatalogs = useMemo(
        () => manifest.catalogs.filter((c: StremioCatalog) =>
            !c.id.toLowerCase().includes('search') &&
            !c.name.toLowerCase().includes('search')
        ),
        [manifest.catalogs]
    );

    useEffect(() => {
        if (browsableCatalogs.length > 0 && !selectedCatalog) {
            setSelectedCatalog(browsableCatalogs[0]);
        }
    }, [browsableCatalogs]);

    // Auto-load detail view if selectedItemId is provided (from cinema catalog click)
    useEffect(() => {
        if (!selectedItemId) return;
        const itemType = typeof selectedItemType === 'string' ? selectedItemType : 'series';
        const syntheticItem: StremioMeta = {
            id: selectedItemId as string,
            type: itemType,
            name: typeof title === 'string' ? title : 'Loading...',
        };
        handlePress(syntheticItem);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedItemId]);

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
        const resolvedType = (item.type || selectedCatalog?.type || '').toLowerCase();

        // ── tv / livetv / iptv: directly play stream without detail view ──
        if (resolvedType === 'tv' || resolvedType === 'livetv' || resolvedType === 'iptv' || resolvedType === 'live') {
            fetchAndPlayStreams(item);
            return;
        }

        const hasMeta = (() => {
            if (resolvedType === 'series' || resolvedType === 'movie' || resolvedType === 'anime') return true;
            if (!manifest || !manifest.resources) return false;
            for (const r of manifest.resources) {
                if (r === 'meta') return true;
                if (typeof r === 'object' && r.name === 'meta') {
                    const typeMatch = !r.types || r.types.includes(resolvedType);
                    const idPrefixMatch = !r.idPrefixes || r.idPrefixes.some((prefix: string) => item.id.startsWith(prefix));
                    if (typeMatch && idPrefixMatch) return true;
                }
            }
            return false;
        })();

        if (!hasMeta) {
            fetchAndPlayStreams(item);
            return;
        }

        setDetailLoading(true);
        try {
            const metaType = item.type || resolvedType;
            let response;
            try {
                const metaUrl = `${baseUrl}/meta/${metaType}/${encodeURIComponent(item.id)}.json`;
                console.log(`meta: ${metaUrl}`)
                response = await axios.get(metaUrl);
            } catch (addonErr) {
                console.log('Addon meta failed, falling back to cinemeta...', addonErr);
                const cinemetaUrl = `https://v3-cinemeta.strem.io/meta/${metaType}/${encodeURIComponent(item.id)}.json`;
                response = await axios.get(cinemetaUrl);
            }
            const fullMeta: StremioMeta = response.data.meta;

            setDetailMeta(fullMeta);
            if (fullMeta.videos && fullMeta.videos.length > 0) {
                const seasons = Array.from(new Set(fullMeta.videos.map(v => v.season || 1))).sort((a, b) => a - b);
                setSelectedSeason(seasons[0]);
            }
            setShowDetail(true);
            setDetailLoading(false);
        } catch (e) {
            console.error('Failed to load meta', e);
            setDetailLoading(false);
            fetchAndPlayStreams(item);
        }
    };

    // ─── Fetch streams and play ─────────────────────────
    const fetchAndPlayStreams = async (item: StremioMeta, videoId?: string) => {
        setSelectedItem(item);
        setLoading(true);
        try {
            const streamId = videoId || item.id;
            console.log('Manifest:', manifest);
            console.log('Base URL for streams:', baseUrl);
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

        router.push({ pathname: '/player', params: videoParams });
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
        console.log('Saving favorite with browserUrl:', url, 'and browserManifest:', manifestStr);
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
        const Wrapper = Platform.isTV ? TVFocusable : TouchableOpacity;
        return (
            <Wrapper
                style={[styles.episodeCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}
                onPress={() => handleEpisodePress(video)}
                activeOpacity={0.8}
            >
                <View style={styles.episodeCardContent}>
                    <View style={styles.episodeThumbnailWrap}>
                        {video.thumbnail ? (
                            <Image source={{ uri: video.thumbnail }} style={styles.episodeThumbnail} resizeMode="cover" />
                        ) : (
                            <View style={[styles.episodeThumbnailFallback, { backgroundColor: activeColors.surface }]}>
                                <MaterialIcons name="play-circle-outline" size={32} color={activeColors.primary} />
                            </View>
                        )}
                        {isEpLoading && (
                            <View style={styles.episodeLoadingOverlay}>
                                <ActivityIndicator size="small" color="#fff" />
                            </View>
                        )}
                    </View>
                    <View style={styles.episodeInfo}>
                        <Text style={[styles.episodeNumber, { color: activeColors.primary }]}>
                            Episode {video.episode || '—'}
                        </Text>
                        <Text style={[styles.episodeTitle, { color: activeColors.text }]} numberOfLines={2}>
                            {video.title || detailMeta?.name || 'Untitled'}
                        </Text>
                    </View>
                    <MaterialIcons name="play-arrow" size={24} color={activeColors.primary} />
                </View>
            </Wrapper>
        );
    };

    const detailView = showDetail && detailMeta ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: activeColors.background, zIndex: 100 }]}>
            {/* Background Image */}
            <Image
                source={{ uri: detailMeta.background || detailMeta.poster }}
                style={styles.detailBg}
                blurRadius={20}
            />
            <LinearGradient
                colors={['rgba(0,0,0,0.3)', activeColors.background, activeColors.background]}
                locations={[0, 0.35, 1]}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
                {/* Header */}
                <View style={[styles.detailHeader, { backgroundColor: activeColors.background + 'E6' }]}>
                    <TouchableOpacity onPress={() => { setShowDetail(false); setDetailMeta(null); }} style={styles.detailBackBtn}>
                        <MaterialIcons name="arrow-back" size={24} color={activeColors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.detailHeaderTitle, { color: activeColors.text }]} numberOfLines={1}>
                        {detailMeta.name}
                    </Text>
                </View>

                {/* Poster + Info */}
                <View style={styles.detailInfoRow}>
                    <Image
                        source={{ uri: detailMeta.poster || detailMeta.background }}
                        style={styles.detailPoster}
                    />
                    <View style={styles.detailTextWrap}>
                        <Text style={[styles.detailTitle, { color: activeColors.text }]} numberOfLines={2}>
                            {detailMeta.name}
                        </Text>
                        {detailMeta.country && (
                            <View style={styles.detailMetaRow}>
                                <Ionicons name="location-outline" size={14} color={activeColors.textSecondary} />
                                <Text style={[styles.detailMetaText, { color: activeColors.textSecondary }]}>
                                    {detailMeta.country}
                                </Text>
                            </View>
                        )}
                        {detailMeta.released && (
                            <View style={styles.detailMetaRow}>
                                <Ionicons name="calendar-outline" size={14} color={activeColors.textSecondary} />
                                <Text style={[styles.detailMetaText, { color: activeColors.textSecondary }]}>
                                    {new Date(detailMeta.released).getFullYear()}
                                </Text>
                            </View>
                        )}
                        <View style={styles.detailMetaRow}>
                            <MaterialIcons name="video-library" size={14} color={activeColors.textSecondary} />
                            <Text style={[styles.detailMetaText, { color: activeColors.textSecondary }]}>
                                {detailMeta.videos?.length || 0} Episodes · {seasons.length} Season{seasons.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Description */}
                {detailMeta.description && (
                    <Text style={[styles.detailDescription, { color: activeColors.textSecondary }]} numberOfLines={4}>
                        {detailMeta.description}
                    </Text>
                )}

                {/* Play Movie Button (If no videos/episodes) */}
                {(!detailMeta.videos || detailMeta.videos.length === 0) && (
                    <TouchableOpacity
                        style={[styles.playMovieBtn, { backgroundColor: activeColors.primary }]}
                        onPress={() => fetchAndPlayStreams(detailMeta)}
                    >
                        <MaterialIcons name="play-arrow" size={24} color="#fff" />
                        <Text style={styles.playMovieText}>WATCH NOW</Text>
                    </TouchableOpacity>
                )}

                {/* Season Selector */}
                {seasons.length > 1 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.seasonSelector}
                    >
                        {seasons.map(season => {
                            const isActive = selectedSeason === season;
                            const Btn = Platform.isTV ? TVFocusable : TouchableOpacity;
                            return (
                                <Btn
                                    key={season}
                                    style={[
                                        styles.seasonChip,
                                        { backgroundColor: activeColors.card, borderColor: activeColors.border },
                                        isActive && { backgroundColor: activeColors.primary, borderColor: activeColors.primary },
                                    ]}
                                    onPress={() => setSelectedSeason(season)}
                                >
                                    <Text style={[
                                        styles.seasonChipText,
                                        { color: activeColors.textSecondary },
                                        isActive && { color: '#fff' },
                                    ]}>
                                        Season {season}
                                    </Text>
                                </Btn>
                            );
                        })}
                    </ScrollView>
                )}

                {/* Episode List */}
                <View style={styles.episodeListHeader}>
                    <Text style={[styles.episodeListTitle, { color: activeColors.text }]}>
                        {seasons.length <= 1 ? 'Episodes' : `Season ${selectedSeason}`}
                    </Text>
                    <Text style={[styles.episodeCount, { color: activeColors.textSecondary }]}>
                        {episodesForSeason.length} episodes
                    </Text>
                </View>
                {episodesForSeason.map(video => (
                    <View key={video.id}>
                        {renderEpisode({ item: video })}
                    </View>
                ))}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    ) : null;


    // ─── Streams Modal ──────────────────────────────────
    const streamsModal = showStreams ? (
        <View style={[styles.streamsOverlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
            <View style={[styles.streamsContent, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                <View style={styles.streamsHeader}>
                    <Text style={[styles.streamsTitle, { color: activeColors.text }]}>Select Server</Text>
                    <TouchableOpacity onPress={() => setShowStreams(false)}>
                        <MaterialIcons name="close" size={24} color={activeColors.textSecondary} />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={streams}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                        <TVFocusable
                            style={[styles.streamItem, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}
                            onPress={() => {
                                setShowStreams(false);
                                playStream(item, selectedItem!);
                            }}
                        >
                            <View style={styles.streamItemContent}>
                                <View style={styles.streamInfo}>
                                    <Text style={[styles.streamName, { color: activeColors.text }]}>{item.name || 'Server'}</Text>
                                    <Text style={[styles.streamTitle, { color: activeColors.textSecondary }]} numberOfLines={2}>
                                        {item.title}
                                    </Text>
                                </View>
                                <MaterialIcons name="play-circle-outline" size={24} color={activeColors.primary} />
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
    },
    streamsContent: {
        width: '80%',
        maxHeight: '80%',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
    },
    streamsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    streamsTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    streamItem: {
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    streamItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        flex: 1,
    },
    streamInfo: {
        flex: 1,
    },
    streamName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    streamTitle: {
        fontSize: 12,
    },

    // Detail View
    detailBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.4,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    detailBackBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailHeaderTitle: {
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
        marginLeft: 12,
        flex: 1,
    },
    detailInfoRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 10,
        gap: 16,
    },
    detailPoster: {
        width: 120,
        height: 180,
        borderRadius: 14,
        backgroundColor: '#1a1f35',
    },
    detailTextWrap: {
        flex: 1,
        justifyContent: 'center',
        gap: 8,
    },
    detailTitle: {
        fontSize: 24,
        fontFamily: 'Outfit_700Bold',
    },
    detailMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailMetaText: {
        fontSize: 13,
        fontFamily: 'Outfit_500Medium',
    },
    playMovieBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        marginHorizontal: 20,
        marginTop: 20,
        gap: 8,
    },
    playMovieText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
    },
    detailDescription: {
        paddingHorizontal: 20,
        marginTop: 16,
        fontSize: 14,
        lineHeight: 22,
        fontFamily: 'Inter_400Regular',
    },
    seasonSelector: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 10,
    },
    seasonChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    seasonChipText: {
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
    },
    episodeListHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    episodeListTitle: {
        fontSize: 20,
        fontFamily: 'Outfit_700Bold',
    },
    episodeCount: {
        fontSize: 13,
        fontFamily: 'Outfit_500Medium',
    },
    episodeCard: {
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    episodeCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    episodeThumbnailWrap: {
        width: 120,
        height: 72,
        position: 'relative',
    },
    episodeThumbnail: {
        width: '100%',
        height: '100%',
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
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    episodeNumber: {
        fontSize: 12,
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: 2,
    },
    episodeTitle: {
        fontSize: 15,
        fontFamily: 'Outfit_500Medium',
    },

    // Detail Loading
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
