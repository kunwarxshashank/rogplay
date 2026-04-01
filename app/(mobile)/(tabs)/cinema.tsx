import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrendingSlider from '@/components/cinema/TrendingSlider';
import OTTSection from '@/components/cinema/OTTSection';
import MovieList from '@/components/cinema/MovieList';
import {
    getPopularMovies, getPopularTV, getTrending,
    getLatestMovies, getOnAirTV, getAnime, getBollywoodMovies, getKDrama,
    discoverContent, discoverAllContent
} from '@/services/tmdb';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import CinemaFilter, { FilterState } from '@/components/cinema/CinemaFilter';
import ContinueWatchingSection from '@/components/cinema/ContinueWatchingSection';

// --- Mobile Component (Original) ---
export function Cinema() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState<FilterState | null>(null);
    const [selectedFilters, setSelectedFilters] = useState<FilterState>({
        genre: '',
        year: '',
        rating: '',
        language: '',
        sort_by: 'popularity.desc',
        country: '',
    });
    const router = useRouter();
    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;

    const handleSearch = useCallback(() => {
        if (searchQuery.trim()) {
            router.push({ pathname: '/search', params: { query: searchQuery } });
        }
    }, [searchQuery, router]);

    const handleOTTSelect = useCallback((providerId: number, name: string) => {
        router.push({ pathname: '/details/provider', params: { providerId, name } });
    }, [router]);

    const handleApplyFilters = useCallback((filters: FilterState) => {
        setAppliedFilters(filters);
    }, []);

    const handleResetFilters = useCallback(() => {
        setAppliedFilters(null);
    }, []);

    const contentType = useMemo(() =>
        activeFilter === 'TV Shows' || activeFilter === 'Anime' || activeFilter === 'K-Drama' ? 'tv' :
            (activeFilter === 'Movies' || activeFilter === 'Bollywood' ? 'movie' : 'all'),
        [activeFilter]);

    const sections = useMemo(() => {
        if (appliedFilters) return [];

        const list = [];
        if (activeFilter === 'All') {
            list.push({ id: 'trending', type: 'trending' });
            list.push({ id: 'ott', type: 'ott' });
            list.push({ id: 'continue', type: 'continue' });
        }

        if (activeFilter === 'All' || activeFilter === 'Movies') {
            list.push({ id: 'latest_movies', title: 'Latest Movies', type: 'movie', fetch: getLatestMovies });
        }
        if (activeFilter === 'All' || activeFilter === 'TV Shows') {
            list.push({ id: 'latest_tv', title: 'Latest TV Shows', type: 'tv', fetch: getOnAirTV });
        }
        if (activeFilter === 'All' || activeFilter === 'Movies') {
            list.push({ id: 'pop_movies', title: 'Popular Movies', type: 'movie', fetch: getPopularMovies });
        }
        if (activeFilter === 'All' || activeFilter === 'TV Shows') {
            list.push({ id: 'pop_tv', title: 'Popular TV Shows', type: 'tv', fetch: getPopularTV });
        }
        if (activeFilter === 'All' || activeFilter === 'Anime') {
            list.push({ id: 'anime', title: 'Anime', type: 'tv', fetch: getAnime });
        }
        if (activeFilter === 'All' || activeFilter === 'Bollywood' || activeFilter === 'Movies') {
            list.push({ id: 'bollywood', title: 'Bollywood', type: 'movie', fetch: getBollywoodMovies });
        }
        if (activeFilter === 'All' || activeFilter === 'K-Drama' || activeFilter === 'TV Shows') {
            list.push({ id: 'kdrama', title: 'K-Drama', type: 'tv', fetch: getKDrama });
        }
        if (activeFilter === 'All') {
            list.push({ id: 'trending_day', title: 'Trending Now', type: 'movie', fetch: () => getTrending('day') });
        }

        return list;
    }, [activeFilter, appliedFilters, handleOTTSelect]);

    const renderSection = useCallback(({ item }: { item: any }) => {
        switch (item.type) {
            case 'trending': return <TrendingSlider />;
            case 'ott': return <OTTSection onSelect={handleOTTSelect} />;
            case 'continue': return <ContinueWatchingSection />;
            default: return (
                <MovieList
                    title={item.title}
                    type={item.type}
                    fetchFunction={item.fetch}
                    paginated={true}
                />
            );
        }
    }, [handleOTTSelect]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]} edges={['top']}>
            <View style={styles.headerTitleRow}>
                <Text style={[styles.categoryTitle, { color: currentColors.text }]}>
                    {activeFilter === 'All' ? 'Cinema' : activeFilter}
                </Text>
                <View style={[styles.titleDot, { backgroundColor: currentColors.primary }]} />
            </View>

            <View style={styles.header}>
                <View style={[styles.searchBar, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
                    <Ionicons name="search-outline" size={20} color={currentColors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: currentColors.text }]}
                        placeholder="Search movies, tv shows..."
                        placeholderTextColor={currentColors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>
                <TouchableOpacity
                    style={[styles.filterBtn, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
                    onPress={() => setIsFilterVisible(!isFilterVisible)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="options-outline" size={20} color={currentColors.text} />
                </TouchableOpacity>
            </View>

            <CinemaFilter
                visible={isFilterVisible}
                onClose={() => setIsFilterVisible(false)}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
                type={contentType === 'all' ? 'movie' : contentType}
            />

            {appliedFilters ? (
                <View style={{ flex: 1 }}>
                    <MovieList
                        title="Filtered Results"
                        type={contentType}
                        fetchFunction={useCallback((page?: number) => {
                            const filtersWithPage = { ...appliedFilters, page };
                            if (contentType === 'all') {
                                return discoverAllContent(filtersWithPage);
                            }
                            return discoverContent(contentType, filtersWithPage);
                        }, [appliedFilters, contentType])}
                        mode="grid"
                        paginated={true}
                    />
                </View>
            ) : (
                <FlatList
                    data={sections}
                    renderItem={renderSection}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.content}
                    initialNumToRender={3}
                    windowSize={5}
                    maxToRenderPerBatch={2}
                    removeClippedSubviews={Platform.OS === 'android'}
                    ListHeaderComponent={<View style={{ height: 10 }} />}
                />
            )}
        </SafeAreaView>
    );
}

export default function CinemaScreen() {
    return <Cinema />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        paddingHorizontal: 20,
        marginTop: 10,
    },
    titleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginLeft: 4,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        fontFamily: 'Outfit_500Medium',
    },
    filterBtn: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    content: {
        paddingBottom: 120,
    },
    categoryTitle: {
        fontSize: 32,
        fontFamily: 'Outfit_700Bold',
    },
    categoriesContainer: {
        marginBottom: 10,
    },
    categoriesScroll: {
        paddingHorizontal: 20,
        gap: 10,
    },
    categoryTab: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        minWidth: 80,
        alignItems: 'center',
    },
    categoryTabText: {
        fontSize: 13,
        fontFamily: 'Outfit_600SemiBold',
    }
});

