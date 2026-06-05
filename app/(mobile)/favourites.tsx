import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSettingsStore } from '@/store/settingsStore';
import { FavoriteItem, useFavoritesStore } from '@/store/favoritesStore';
import { useToastStore } from '@/store/toastStore';

export default function MobileFavouritesScreen() {
    const router = useRouter();
    const { theme } = useSettingsStore();
    const activeColors = Colors[theme] || Colors.dark;

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
                pathname: '/details/[type]/[id]',
                params: {
                    type: item.tmdbType,
                    id: item.tmdbId,
                },
            });
            return;
        }

        if (item.kind === 'stremio' && item.browserUrl && item.browserManifest) {
            router.push({
                pathname: '/stremio-browser',
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
                pathname: '/music-player',
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

            if (Object.keys(headers).length > 0) {
                params.headers = JSON.stringify(headers);
            }

            if (item.userAgent) params.userAgent = item.userAgent;
            if (item.referer) params.referer = item.referer;
            if (item.origin) params.origin = item.origin;
            if (item.cookie) params.cookie = item.cookie;
            if (item.channelId) params.channelId = item.channelId;
            if (item.epgUrl) params.epgUrl = item.epgUrl;
            if (item.drmkeys) params.drmkeys = item.drmkeys;
            if (item.drmtype) params.drmtype = item.drmtype;

            router.push({ pathname: '/player', params });
            return;
        }

        Alert.alert('Unavailable', 'This favourite cannot be opened right now.');
    };

    const renderItem = ({ item }: { item: FavoriteItem }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}
            onPress={() => openFavorite(item)}
            activeOpacity={0.85}
        >
            <View style={styles.left}>
                {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.poster} />
                ) : (
                    <View style={[styles.posterFallback, { backgroundColor: activeColors.surface }]}>
                        <MaterialIcons name="favorite" size={24} color={activeColors.primary} />
                    </View>
                )}
                <View style={styles.textWrap}>
                    <Text style={[styles.title, { color: activeColors.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.subtitle, { color: activeColors.textSecondary }]} numberOfLines={1}>
                        {item.subtitle || item.kind.toUpperCase()}
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                onPress={() => {
                    removeFavorite(item.id);
                    showToast('Removed from favourites', 'success');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <MaterialIcons name="favorite" size={24} color={activeColors.primary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color={activeColors.text} />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={[styles.headerTitle, { color: activeColors.text }]}>Favourites</Text>
                    <Text style={[styles.headerSub, { color: activeColors.textSecondary }]}>
                        Movies, shows, channels and streams
                    </Text>
                </View>
            </View>

            <FlatList
                data={sortedItems}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <MaterialIcons name="favorite-border" size={54} color={activeColors.textSecondary} />
                        <Text style={[styles.emptyTitle, { color: activeColors.text }]}>No favourites yet</Text>
                        <Text style={[styles.emptyText, { color: activeColors.textSecondary }]}>Add from details, addon browser, stremio browser, or IPTV channel list.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingTop: 6,
        paddingBottom: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: { marginLeft: 8 },
    headerTitle: { fontSize: 30, fontFamily: 'Outfit_700Bold' },
    headerSub: { marginTop: 2, fontSize: 14, fontFamily: 'Inter_400Regular' },
    list: { paddingHorizontal: 16, paddingBottom: 120 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
    },
    left: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
    poster: { width: 52, height: 70, borderRadius: 10, marginRight: 12 },
    posterFallback: {
        width: 52,
        height: 70,
        borderRadius: 10,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textWrap: { flex: 1 },
    title: { fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
    subtitle: { marginTop: 2, fontSize: 12, fontFamily: 'Inter_400Regular' },
    emptyWrap: { alignItems: 'center', paddingTop: 90, paddingHorizontal: 30 },
    emptyTitle: { marginTop: 12, fontSize: 20, fontFamily: 'Outfit_700Bold' },
    emptyText: { marginTop: 8, fontSize: 13, textAlign: 'center', fontFamily: 'Inter_400Regular' },
});
