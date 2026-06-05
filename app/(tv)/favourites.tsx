import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSettingsStore } from '@/store/settingsStore';
import { FavoriteItem, useFavoritesStore } from '@/store/favoritesStore';
import { TVFocusable } from '@/components/TVFocusable';
import { useToastStore } from '@/store/toastStore';

const CARD_W = 360;
const CARD_H = 200;

export default function TVFavouritesScreen() {
    const router = useRouter();
    const { theme } = useSettingsStore();
    const c = Colors[theme] || Colors.dark;

    const items = useFavoritesStore((state) => state.items);
    const removeFavorite = useFavoritesStore((state) => state.removeFavorite);
    const loadSyncedFavorites = useFavoritesStore((state) => state.loadSyncedFavorites);
    const isLoading = useFavoritesStore((state) => state.isLoading);
    const showToast = useToastStore((state) => state.showToast);

    React.useEffect(() => {
        loadSyncedFavorites();
    }, []);

    const sortedItems = useMemo(
        () => [...items].sort((a, b) => b.addedAt - a.addedAt),
        [items]
    );

    const openFavorite = (item: FavoriteItem) => {
        if ((item.kind === 'movie' || item.kind === 'tv') && item.tmdbId && item.tmdbType) {
            router.push({
                pathname: '/(tv)/details/[type]/[id]',
                params: {
                    type: item.tmdbType,
                    id: item.tmdbId,
                },
            });
            return;
        }

        if (item.kind === 'stremio' && item.browserUrl && item.browserManifest) {
            router.push({
                pathname: '/(tv)/stremio-browser',
                params: {
                    url: item.browserUrl,
                    manifest: item.browserManifest,
                    title: item.title,
                },
            });
            return;
        }

        if (item.kind === 'music') {
            const tracks = JSON.stringify([{
                id: item.id,
                title: item.title,
                artist: item.subtitle || '',
                poster: item.imageUrl,
                url: item.streamUrl || '',
            }]);
            router.push({
                pathname: '/(tv)/music-player',
                params: { tracks, index: '0', addonUrl: item.browserUrl || '', addonManifest: item.browserManifest || '' },
            });
            return;
        }

        if (item.streamUrl) {
            const params: any = {
                url: encodeURIComponent(item.streamUrl),
                title: item.title,
            };
            if (item.imageUrl) params.channelLogo = item.imageUrl;

            const headers: Record<string, string> = {};
            if (item.headers && typeof item.headers === 'object') {
                Object.assign(headers, item.headers);
            }
            if (item.referer) headers.Referer = item.referer;
            if (item.origin) headers.Origin = item.origin;
            if (item.cookie) headers.Cookie = item.cookie;
            if (item.userAgent) headers['User-Agent'] = item.userAgent;
            if (Object.keys(headers).length > 0) params.headers = JSON.stringify(headers);

            if (item.userAgent) params.userAgent = item.userAgent;
            if (item.referer) params.referer = item.referer;
            if (item.origin) params.origin = item.origin;
            if (item.cookie) params.cookie = item.cookie;
            if (item.channelId) params.channelId = item.channelId;
            if (item.epgUrl) params.epgUrl = item.epgUrl;
            if (item.drmkeys) params.drmkeys = item.drmkeys;
            if (item.drmtype) params.drmtype = item.drmtype;

            router.push({ pathname: '/(tv)/player', params });
            return;
        }
    };

    const renderItem = ({ item, index }: { item: FavoriteItem; index: number }) => (
        <View style={styles.cardWrap}>
            <TVFocusable
                style={[styles.card, { width: CARD_W, height: CARD_H, borderColor: c.border }]}
                onPress={() => openFavorite(item)}
                hasTVPreferredFocus={index === 0}
                focusedScale={1.04}
                focusedBorderColor={c.primary}
            >
                {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.card }]} />
                )}
                <View style={[StyleSheet.absoluteFill, styles.overlay]} />

                <View style={styles.content}>
                    <View>
                        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle || item.kind.toUpperCase()}</Text>
                    </View>

                    <TVFocusable
                        style={[styles.removeBtn, { borderColor: c.primary }]}
                        onPress={() => {
                            removeFavorite(item.id);
                            showToast('Removed from favourites', 'success');
                        }}
                        autoFlex={false}
                        focusedScale={1.06}
                        focusedBorderColor={c.primary}
                    >
                        <MaterialIcons name="favorite" size={20} color={c.primary} />
                        <Text style={[styles.removeText, { color: c.primary }]}>Remove</Text>
                    </TVFocusable>
                </View>
            </TVFocusable>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: c.text }]}>Favourites</Text>
                <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>Movies, shows, channels and streams</Text>
            </View>

            <FlatList
                data={sortedItems}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                numColumns={3}
                key={'tv-favourites-grid'}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <MaterialIcons name="favorite-border" size={64} color={c.textSecondary} />
                        <Text style={[styles.emptyTitle, { color: c.text }]}>No favourites yet</Text>
                        <Text style={[styles.emptySubtitle, { color: c.textSecondary }]}>Add from details, addon browser, stremio browser, or IPTV channel list.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: 52,
        paddingHorizontal: 44,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 42,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    headerSubtitle: {
        marginTop: 6,
        fontSize: 17,
    },
    list: {
        paddingHorizontal: 44,
        paddingBottom: 32,
    },
    cardWrap: {
        marginRight: 18,
        marginBottom: 18,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    overlay: {
        backgroundColor: 'rgba(0,0,0,0.48)',
    },
    content: {
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        maxWidth: 230,
    },
    subtitle: {
        marginTop: 4,
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        maxWidth: 230,
    },
    removeBtn: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    removeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        width: '100%',
    },
    emptyTitle: {
        marginTop: 14,
        fontSize: 28,
        fontWeight: '700',
    },
    emptySubtitle: {
        marginTop: 8,
        fontSize: 16,
    },
});
