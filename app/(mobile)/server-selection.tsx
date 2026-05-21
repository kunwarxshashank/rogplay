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

export default function ContentListScreen() {
    const { query, type: rawType, movieUrl, tmdb, season, episode, movieData, title, poster, backdrop } = useLocalSearchParams();
    const type = Array.isArray(rawType) ? rawType[0] : rawType;
    const { addons, isHydrated } = useAddonsStore();
    const { results, loading, searchStreams } = useStreamSources();
    const router = useRouter();

    const isMovie = type === 'movie' || type === 'rogmovie' || !type;

    useEffect(() => {
        searchStreams(
            query as string,
            tmdb as string,
            season as string,
            episode as string,
            (type as any) || 'movie',
            movieUrl as string,
            movieData as string
        );
    }, [query, tmdb, type, movieUrl, movieData]);

    const theme = useSettingsStore(state => state.theme);
    const activeColors = Colors[theme] || Colors.dark;

    const handlePlay = (item: any) => {
        const videoParams: any = {
            url: encodeURIComponent(item.url),
            title: encodeURIComponent(item.title || String(title || query) || 'Playing Video'),
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

        router.push({ pathname: '/player', params: videoParams });
    };

    const handleDownload = (item: any) => {
        const downloadParams: any = {
            url: encodeURIComponent(item.url),
            title: encodeURIComponent(item.title || 'Video')
        };
        if (item.headers) downloadParams.headers = typeof item.headers === 'object' ? JSON.stringify(item.headers) : item.headers;

        router.push({ pathname: '/video-downloader', params: downloadParams });
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}
            onPress={() => handlePlay(item)}
            activeOpacity={0.8}
        >
            <View style={[styles.iconContainer, { backgroundColor: activeColors.primary + '15' }]}>
                <MaterialIcons name="play-lesson" size={28} color={activeColors.primary} />
            </View>
            <View style={styles.info}>
                <Text style={[styles.title, { color: activeColors.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.subtitle, { color: activeColors.textSecondary }]} numberOfLines={1}>{item.source || 'Unknown Source'}</Text>
            </View>
            <View style={styles.action}>
                <TouchableOpacity
                    style={[styles.qualityBadge, { backgroundColor: activeColors.primary }]}
                    onPress={() => handleDownload(item)}
                >
                    <MaterialIcons name="file-download" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

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

            {results.length === 0 && (loading || !isHydrated) ? (
                <View style={styles.list}>
                    {Array.from({ length: 8 }).map((_, index) => (
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
            ) : (
                <FlatList
                    data={results}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `${item.source}-${index}`}
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
