import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { searchMulti } from '@/services/tmdb';
import { LinearGradient } from 'expo-linear-gradient';
import { TVFocusable } from '@/components/TVFocusable';
import { useSettingsStore } from '@/store/settingsStore';
import { MovieCardSkeleton, GridSkeleton } from '@/components/Skeleton';
import MovieCard from '@/components/cinema/MovieCard';
import MovieList from '@/components/cinema/MovieList';

import { useCinemaAddon, fetchAddonCatalog } from '@/hooks/useCinemaAddon';

function useSearchLogic() {
    const { query: initialQuery } = useLocalSearchParams();
    const [query, setQuery] = useState(initialQuery as string || '');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { theme } = useSettingsStore();
    const activeColors = Colors[theme] || Colors.dark;
    const addonConfig = useCinemaAddon();

    useEffect(() => {
        if (initialQuery) {
            handleSearch(initialQuery as string);
        }
    }, [initialQuery]);

    const handleSearch = async (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        try {
            let groupedData = [];

            const isTmdbAddon = addonConfig?.addontype === 'tmdbaddon';

            // For tmdbaddon, skip the searchcatalog loop — only use TMDB directly
            if (!isTmdbAddon && addonConfig && addonConfig.searchcatalog && addonConfig.searchcatalog.length > 0) {
                const promises = addonConfig.searchcatalog.map(async (cat: any) => {
                    const searchUrl = cat.searchurl.replace('${search}', encodeURIComponent(searchQuery));
                    const data = await fetchAddonCatalog(searchUrl, 1, addonConfig.addontype, { url: addonConfig.addonUrl, manifestStr: addonConfig.addonManifest });
                    return { title: cat.name || 'Catalog Search', data: data.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv') };
                });
                const catResults = await Promise.all(promises);
                groupedData.push(...catResults.filter(g => g.data.length > 0));
            }

            // Determine if TMDB search should also run
            let shouldShowTmdb = isTmdbAddon; // always true for tmdbaddon
            if (!isTmdbAddon) {
                if (!addonConfig) {
                    shouldShowTmdb = true;
                } else if (addonConfig.addontype === 'stremio') {
                    const prefixes = addonConfig.idPrefixes || [];
                    shouldShowTmdb = prefixes.some((p: string) => ['imdb', 'tmdb', 'tt'].includes(p.toLowerCase()));
                }
            }

            if (shouldShowTmdb) {
                const tmdbData = await searchMulti(searchQuery);
                const filteredTmdb = tmdbData.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
                if (filteredTmdb.length > 0) {
                    groupedData.push({ title: 'Search Results', data: filteredTmdb, isTmdb: true });
                }
            }
            setResults(groupedData);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    return { query, setQuery, results, loading, handleSearch, router, activeColors, addonConfig };
}

export function SearchMobile() {
    const { query, setQuery, results, loading, handleSearch, router, activeColors, addonConfig } = useSearchLogic();

    const numColumns = 3;
    const renderItem = ({ item }: { item: any }) => (
        <MovieCard
            item={item}
            showType
            addonType={addonConfig?.addontype}
            style={{ flex: 1 / 3, margin: 4 }}
            width={undefined}
        />
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: activeColors.card }]}>
                    <MaterialIcons name="arrow-back" size={24} color={activeColors.text} />
                </TouchableOpacity>
                <View style={[styles.searchBar, { backgroundColor: activeColors.card }]}>
                    <MaterialIcons name="search" size={20} color={activeColors.textSecondary} />
                    <TextInput
                        style={[styles.input, { color: activeColors.text }]}
                        placeholder="Search movies & TV shows..."
                        placeholderTextColor={activeColors.textSecondary}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={() => handleSearch(query)}
                        autoFocus
                    />
                </View>
            </View>

            {loading ? (
                <GridSkeleton
                    count={numColumns * 4}
                    columns={numColumns}
                    itemWidth={`${100 / numColumns - 2}%`}
                    renderItem={() => <MovieCardSkeleton width="100%" />}
                />
            ) : (
                <FlatList
                    data={results}
                    renderItem={({ item }) => (
                        <MovieList
                            title={item.title}
                            fetchFunction={async () => item.data}
                            mode="horizontal"
                            addonType={item.isTmdb ? undefined : addonConfig?.addontype}
                        />
                    )}
                    keyExtractor={(item, index) => `${item.title}-${index}`}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialIcons name="search-off" size={64} color={activeColors.textSecondary} />
                            <Text style={[styles.emptyText, { color: activeColors.textSecondary }]}>
                                {query ? "No results found" : "Search for something..."}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

export function SearchTV() {
    const { query, setQuery, results, loading, handleSearch, router, activeColors, addonConfig } = useSearchLogic();
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={[styles.container, { backgroundColor: activeColors.background, flexDirection: 'row' }]}>
            <View style={{ flex: 1, padding: 30 }}>
                <View style={styles.header}>
                    <TVFocusable
                        style={[
                            styles.searchBar,
                            {
                                backgroundColor: activeColors.card,
                                height: 60,
                                borderWidth: isFocused ? 2 : 0,
                                borderColor: activeColors.primary
                            }
                        ]}
                        onPress={() => { }}
                    >
                        <MaterialIcons name="search" size={24} color={activeColors.textSecondary} />
                        <TextInput
                            style={[styles.input, { color: activeColors.text, fontSize: 20, height: '100%' }]}
                            placeholder="Search movies & TV shows..."
                            placeholderTextColor={activeColors.textSecondary}
                            value={query}
                            onChangeText={setQuery}
                            onSubmitEditing={() => handleSearch(query)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                    </TVFocusable>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={activeColors.primary} style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={results}
                        renderItem={({ item }) => (
                            <MovieList
                                title={item.title}
                                fetchFunction={async () => item.data}
                                mode="horizontal"
                                addonType={item.isTmdb ? undefined : addonConfig?.addontype}
                            />
                        )}
                        keyExtractor={(item, index) => `${item.title}-${index}`}
                        contentContainerStyle={[styles.list, { paddingBottom: 50 }]}
                        key={'tv-search'}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <MaterialIcons name="search" size={80} color={activeColors.textSecondary} />
                                <Text style={[styles.emptyText, { color: activeColors.textSecondary, fontSize: 24, marginTop: 20 }]}>
                                    {query ? "No results found" : "Search for something..."}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

export default function SearchScreen() {
    return Platform.isTV ? <SearchTV /> : <SearchMobile />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
    },
    list: {
        padding: 8,
        paddingBottom: 100,
    },
    empty: {
        alignItems: 'center',
        marginTop: 100,
        width: '100%',
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
    }
});
