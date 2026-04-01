import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { parseM3u, parseJsonPlaylist, PlaylistItem } from '@/services/playlistParser';
import * as FileSystem from 'expo-file-system/legacy';
import CatalogBrowser, { BrowserCategory, BrowserItem } from '@/components/CatalogBrowser';
import { useIptvStore } from '@/store/iptvStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useToastStore } from '@/store/toastStore';

const ALL_CATEGORY_ID = '__all__';

export default function AddonBrowserScreen() {
    const { url, title, type, content } = useLocalSearchParams();
    const router = useRouter();
    const [data, setData] = useState<PlaylistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [hasMoreData, setHasMoreData] = useState(true);
    const [selectedGroupId, setSelectedGroupId] = useState<string>(ALL_CATEGORY_ID);
    const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
    const isFavorite = useFavoritesStore((state) => state.isFavorite);
    const showToast = useToastStore((state) => state.showToast);

    const isInitialMount = useRef(true);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isRogmovie = type === 'movie';
    const isIPTV = type === 'iptv' || type === 'livetv' || type === 'tv' || type === 'live';

    useEffect(() => {
        loadData(1);
    }, []);

    const loadData = async (pageToFetch: number, search?: string) => {
        if (!url && !content) return;
        setLoading(true);
        try {
            let text = '';

            if (content && pageToFetch === 1 && !search) {
                text = content as string;
            } else if (url && (url as string).startsWith('file://')) {
                text = await FileSystem.readAsStringAsync(url as string);
            } else {
                let fetchUrl: string;
                if (isRogmovie && search) {
                    fetchUrl = `${url}?search=${encodeURIComponent(search)}`;
                } else if (isRogmovie) {
                    fetchUrl = `${url}?page=${pageToFetch}`;
                } else {
                    fetchUrl = url as string;
                }
                const response = await fetch(fetchUrl);
                text = await response.text();
            }

            let parsedItems: PlaylistItem[] = [];

            if (text.includes('#EXTINF')) {
                parsedItems = parseM3u(text);
            } else {
                try {
                    const json = JSON.parse(text);
                    parsedItems = parseJsonPlaylist(Array.isArray(json) ? json : [json]);
                } catch (e) {
                    console.error('JSON Parse Error', e);
                }
            }

            if (isRogmovie) {
                if (search) {
                    // Search results replace existing data
                    setData(parsedItems);
                    setHasMoreData(false);
                } else if (parsedItems.length > 0) {
                    setData(prev => {
                        const newItems = parsedItems.filter(n => !prev.some(p => p.url === n.url));
                        return [...prev, ...newItems];
                    });
                } else {
                    setHasMoreData(false);
                }
            } else {
                setData(parsedItems);
                setHasMoreData(false);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to load addon data');
        } finally {
            setLoading(false);
        }
    };

    // ─── Debounced API search for rogmovie ─────────────
    useEffect(() => {
        if (!isRogmovie) return;
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (searchQuery.trim()) {
            searchTimerRef.current = setTimeout(() => {
                setPage(1);
                setHasMoreData(false);
                loadData(1, searchQuery.trim());
            }, 500);
        } else {
            // Search cleared — reload paginated data
            setPage(1);
            setHasMoreData(true);
            setData([]);
            loadData(1);
        }

        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, [searchQuery]);

    // ─── Extract unique groups as category tabs ─────────
    const categories: BrowserCategory[] = useMemo(() => {
        const groups = new Set<string>();
        data.forEach(item => {
            if (item.group && item.group.trim()) {
                groups.add(item.group.trim());
            }
        });
        if (groups.size === 0) return [];
        const sorted = Array.from(groups).sort((a, b) => a.localeCompare(b));
        return [
            { id: ALL_CATEGORY_ID, name: 'All' },
            ...sorted.map(g => ({ id: g, name: g })),
        ];
    }, [data]);

    // ─── Filter data by selected group + search ────────
    const filteredItems: BrowserItem[] = useMemo(() => {
        let filtered = data;

        // Filter by group
        if (selectedGroupId !== ALL_CATEGORY_ID) {
            filtered = filtered.filter(item => item.group?.trim() === selectedGroupId);
        }

        // Filter by search (only for non-rogmovie; rogmovie uses API search)
        if (searchQuery && !isRogmovie) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(item => item.title.toLowerCase().includes(q));
        }

        // Map to BrowserItem
        return filtered.map(item => ({
            id: item.id,
            title: item.title,
            imageUrl: item.imageUrl,
            subtitle: item.group || (isIPTV ? 'Live TV' : item.type?.toUpperCase()),
            isLive: isIPTV,
            _original: item, // keep original for press handler
        }));
    }, [data, selectedGroupId, searchQuery, isIPTV]);

    // ─── Handle item press ─────────────────────────────
    const handleItemPress = async (browserItem: BrowserItem) => {
        // Find the original PlaylistItem
        const item = data.find(d => d.id === browserItem.id);
        if (!item) return;

        if (isRogmovie) {
            setLoading(true);
            try {
                const response = await fetch(item.url);
                const movieData = await response.json();

                router.push({
                    pathname: '/server-selection',
                    params: {
                        query: item.title,
                        type: 'rogmovie',
                        movieUrl: item.url,
                        tmdb: item.tmdb || '',
                        movieData: JSON.stringify(movieData),
                    },
                });
            } catch (e) {
                console.error('Failed to fetch movie data', e);
                // Fallback: still navigate
                router.push({
                    pathname: '/server-selection',
                    params: {
                        query: item.title,
                        type: 'movie',
                        movieUrl: item.url,
                        tmdb: item.tmdb || '',
                    },
                });
            } finally {
                setLoading(false);
            }
            return;
        }

        // IPTV / LiveTV — play directly
        const videoParams: any = {
            url: encodeURIComponent(item.url),
            title: item.title,
        };
        if (item.userAgent) videoParams.userAgent = item.userAgent;
        if (item.headers) {
            videoParams.headers = typeof item.headers === 'object' ? JSON.stringify(item.headers) : item.headers;
        }

        const mergedHeaders: Record<string, string> = (() => {
            if (!videoParams.headers) return {};
            try {
                const parsed = JSON.parse(videoParams.headers);
                return typeof parsed === 'object' && parsed !== null ? parsed : {};
            } catch {
                return {};
            }
        })();

        if (item.referer) mergedHeaders['Referer'] = item.referer;
        if (item.origin) mergedHeaders['Origin'] = item.origin;
        if (item.cookie) mergedHeaders['Cookie'] = item.cookie;
        if (item.userAgent) mergedHeaders['User-Agent'] = item.userAgent;

        if (Object.keys(mergedHeaders).length > 0) {
            videoParams.headers = JSON.stringify(mergedHeaders);
        }
        if (item.imageUrl) videoParams.channelLogo = item.imageUrl;
        if (item.group) videoParams.channelGroup = item.group;
        if (item.epgUrl) videoParams.epgUrl = item.epgUrl;
        if (item.channelId) videoParams.channelId = item.channelId;
        if (item.drmkeys) videoParams.drmkeys = item.drmkeys;
        if (item.drmtype) videoParams.drmtype = item.drmtype;
        if (item.origin) videoParams.origin = item.origin;
        if (item.cookie) videoParams.cookie = item.cookie;

        // Pass all IPTV channels via store for EPG sidebar channel switching
        // This is much faster and reduces memory load compared to stringifying in params
        if (isIPTV && data.length > 0) {
            useIptvStore.getState().setCurrentChannels(data);
            // Also pass the playlist URL so the player can fetch it if needed (e.g. for EPG)
            if (url) videoParams.playlistUrl = url;
        }

        router.push({ pathname: '/player', params: videoParams });
    };

    // ─── Pagination ────────────────────────────────────
    const handleEndReached = () => {
        if (isRogmovie && hasMoreData && !loading && !searchQuery.trim()) {
            setPage(p => {
                loadData(p + 1);
                return p + 1;
            });
        }
    };

    const handleToggleFavorite = (browserItem: BrowserItem) => {
        const item = data.find(d => d.id === browserItem.id);
        if (!item) return;

        const favId = `addon:${type || 'addon'}:${item.id || item.url}`;
        const exists = isFavorite(favId);
        toggleFavorite({
            id: favId,
            kind: isIPTV ? 'iptv' : 'addon',
            title: item.title,
            subtitle: browserItem.subtitle,
            imageUrl: item.imageUrl,
            streamUrl: item.url,
            headers: item.headers,
            userAgent: item.userAgent,
            referer: item.referer,
            origin: item.origin,
            cookie: item.cookie,
            drmkeys: item.drmkeys,
            drmtype: item.drmtype,
            channelId: item.channelId,
            epgUrl: item.epgUrl,
        });
        showToast(exists ? 'Removed from favourites' : 'Added to favourites', 'success');
    };

    const handleIsFavorite = (browserItem: BrowserItem) => {
        const item = data.find(d => d.id === browserItem.id);
        if (!item) return false;
        return isFavorite(`addon:${type || 'addon'}:${item.id || item.url}`);
    };

    return (
        <CatalogBrowser
            title={(title as string) || 'Addon'}
            onBack={() => router.back()}
            categories={categories}
            selectedCategoryId={selectedGroupId}
            onSelectCategory={(cat) => setSelectedGroupId(cat.id)}
            items={filteredItems}
            loading={loading}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            searchPlaceholder="Search items..."
            onItemPress={handleItemPress}
            onToggleFavorite={handleToggleFavorite}
            isItemFavorite={handleIsFavorite}
            onEndReached={handleEndReached}
            isLiveMode={isIPTV}
        />
    );
}
