import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useSettingsStore } from '@/store/settingsStore';
import { searchMulti } from '@/services/tmdb';
import MovieList from '@/components/cinema/MovieList';
import { TVSearchBar } from '@/components/tv/TVSearchBar';
import { GridSkeleton, MovieCardSkeleton } from '@/components/Skeleton';
import { Platform } from 'react-native';

import { useCinemaAddon, fetchAddonCatalog } from '@/hooks/useCinemaAddon';

export default function TVSearchScreen() {
    const { query } = useLocalSearchParams();
    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;

    const [searchQuery, setSearchQuery] = useState(query as string || '');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const addonConfig = useCinemaAddon();

    useEffect(() => {
        if (searchQuery) {
            handleSearch(searchQuery);
        }
    }, [searchQuery]);

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length > 2) {
            setLoading(true);
            try {
                let data = [];
                if (addonConfig && addonConfig.searchcatalog && addonConfig.searchcatalog.length > 0) {
                    const searchUrl = addonConfig.searchcatalog[0].searchurl.replace('${search}', encodeURIComponent(text));
                    data = await fetchAddonCatalog(searchUrl, 1, addonConfig.addontype, { url: addonConfig.addonUrl, manifestStr: addonConfig.addonManifest });
                } else {
                    data = await searchMulti(text);
                }
                setResults(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        } else {
            setResults([]);
        }
    };

    // We reuse MovieList logic but pass data directly?
    // MovieList expects a fetchFunction. 
    // We can create a fetch function closure or modify MovieList to accept data.
    // Or just implement a simple grid using specific components.
    // For now, I'll use a fetch function wrapper if I can, but MovieList handles state internally.
    // I can make a wrapper fetch function that returns 'results' state.

    const fetchSearchResults = async () => {
        return results;
    };

    const numColumns = Platform.isTV ? 5 : 3;

    return (
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
            <View style={styles.header}>
                <TVSearchBar onSearch={handleSearch} autoFocus hasTVPreferredFocus />
            </View>

            <View style={styles.content}>
                {loading ? (
                    <View style={{ paddingHorizontal: 24 }}>
                        <GridSkeleton
                            count={numColumns * 2}
                            columns={numColumns}
                            itemWidth={`${100 / numColumns - 2}%`}
                            renderItem={() => <MovieCardSkeleton width="100%" />}
                        />
                    </View>
                ) : results.length > 0 ? (
                    <MovieList
                        key={searchQuery}
                        title={`Results for "${searchQuery}"`}
                        fetchFunction={fetchSearchResults}
                        mode="grid"
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                            {searchQuery ? 'No results found' : 'Start typing to search...'}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 80, // Top Bar space
    },
    header: {
        paddingHorizontal: 40,
        marginBottom: 20,
        width: '60%',
        alignSelf: 'center',
    },
    content: {
        flex: 1,
        paddingBottom: 50,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 18,
    }
});
