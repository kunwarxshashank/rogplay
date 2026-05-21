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

export default function TVServerSelectionScreen() {
    const { id, type, title, season, episode, poster, backdrop, movieUrl, movieData } = useLocalSearchParams();
    const router = useRouter();
    const { theme } = useSettingsStore();
    const activeColors = Colors[theme] || Colors.dark;
    const { addons, isHydrated } = useAddonsStore();

    const { results, loading, searchStreams } = useStreamSources();

    useEffect(() => {

        searchStreams(
            Array.isArray(title) ? title[0] : title || '',
            Array.isArray(id) ? id[0] : id,
            Array.isArray(season) ? season[0] : season,
            Array.isArray(episode) ? episode[0] : episode,
            (Array.isArray(type) ? type[0] : type || 'movie') as any,
            Array.isArray(movieUrl) ? movieUrl[0] : movieUrl as string,
            Array.isArray(movieData) ? movieData[0] : movieData as string
        );
    }, [id, type, title, season, episode, movieUrl, movieData]);

    const handlePlay = (item: StreamResult) => {
        const videoParams: any = {
            url: encodeURIComponent(item.url),
            title: encodeURIComponent(item.title || String(title) || 'Video'),
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

        router.push({ pathname: '/(tv)/player', params: videoParams });
    };

    const renderItem = ({ item, index }: { item: StreamResult; index: number }) => (
        <TVFocusable
            style={[styles.serverCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}
            onPress={() => handlePlay(item)}
            hasTVPreferredFocus={index === 0}
            nativeID={`tv-server-${index}`}
        >
            <View style={[styles.iconContainer, { backgroundColor: activeColors.primary + '20' }]}>
                <MaterialIcons name="play-circle-outline" size={32} color={activeColors.primary} />
            </View>
            <View style={styles.serverInfo}>
                <Text style={[styles.serverName, { color: activeColors.text }]}>{item.source}</Text>
                <Text style={[styles.serverTitle, { color: activeColors.textSecondary }]} numberOfLines={1}>{item.title}</Text>
            </View>
        </TVFocusable>
    );

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

                {loading || !isHydrated ? (
                    <TVServerSelectionSkeleton />
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
                ) : (
                    <FlatList
                        data={results}
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
        fontFamily: 'Outfit_700Bold',
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
    },
    backButton: {
        width: 160,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
    }
});
