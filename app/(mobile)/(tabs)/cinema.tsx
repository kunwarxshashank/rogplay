import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList, Platform, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import TrendingSlider from '@/components/cinema/TrendingSlider';
import OTTSection from '@/components/cinema/OTTSection';
import MovieList from '@/components/cinema/MovieList';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import CinemaFilter, { FilterState } from '@/components/cinema/CinemaFilter';
import ContinueWatchingSection from '@/components/cinema/ContinueWatchingSection';
import { useCinemaAddon, fetchAddonCatalog } from '@/hooks/useCinemaAddon';
import { useAddonsStore } from '@/store/addonsStore';
import { useTheme } from '@/hooks/useTheme';
import { discoverContent, discoverAllContent } from '@/services/tmdb';
import { useThemeStore } from '@/store/themeStore';

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

    // UI state for addon changing
    const [showAddonPicker, setShowAddonPicker] = useState(false);

    const router = useRouter();

    const { addons, activeCinemaAddon, setActiveCinemaAddon, isLoading, isHydrated } = useAddonsStore();
    const addonConfig = useCinemaAddon();
    const { cinemaContinueWatching, cinemaPlatforms, cinemaHomeSlider, cinemaFilters } = useSettingsStore();
    const { colors: currentColors } = useTheme();
    const themeStore = useThemeStore();

    // Set default addon to tmdbaddon if not set and available
    useEffect(() => {
        if (isHydrated && addons.length > 0 && !activeCinemaAddon) {
            const tmdb = addons.find(a => a.addontype === 'tmdbaddon');
            if (tmdb) {
                setActiveCinemaAddon(tmdb.source || tmdb.url);
            } else {
                setActiveCinemaAddon(addons[0].source || addons[0].url);
            }
        }
    }, [isHydrated, addons, activeCinemaAddon, setActiveCinemaAddon]);

    // Fallback if addon has no catalogs but tt/tmdb prefixes
    useEffect(() => {
        if (isHydrated && !isLoading && addonConfig) {
            const { catalogs, idPrefixes } = addonConfig;
            if ((!catalogs || catalogs.length === 0) && idPrefixes) {
                const hasTmdbPrefix = idPrefixes.some((p: string) => ['tt', 'tmdb'].includes(p.toLowerCase()));
                if (hasTmdbPrefix) {
                    const tmdb = addons.find(a => a.addontype === 'tmdbaddon');
                    if (tmdb) {
                        setActiveCinemaAddon(tmdb.source || tmdb.url);
                    }

                    router.push('/search');
                }
            }
        }
    }, [isHydrated, isLoading, addonConfig, addons, setActiveCinemaAddon, router]);

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
        if (!addonConfig || appliedFilters) return [];

        const list = [];

        // Settings from Addon
        const { settings, catalogs, addontype } = addonConfig;

        if (cinemaHomeSlider && settings.showslider) list.push({ id: 'trending', type: 'slider' });
        if (cinemaPlatforms && settings.showottsection) list.push({ id: 'ott', type: 'ott' });
        if (cinemaContinueWatching) list.push({ id: 'continue', type: 'continue' });

        // Add dynamically fetched catalogs
        if (catalogs && catalogs.length > 0) {
            catalogs.forEach((c: any, index: number) => {
                const matchesTab = activeFilter === 'All' ||
                    (activeFilter === 'Movies' && c.type === 'movie') ||
                    (activeFilter === 'TV Shows' && (c.type === 'tv' || c.type === 'series'));

                if (matchesTab) {
                    const catalogRawType = c.type;
                    const mappedType = (catalogRawType === 'series' || catalogRawType === 'tv') ? 'tv' : (catalogRawType === 'movie' ? 'movie' : 'addon');

                    list.push({
                        id: `catalog_${index}_${c.name}`,
                        title: c.name,
                        type: mappedType,
                        fetch: (page?: number) => {
                            const p = page || 1;
                            const url = (p > 1 && c.paginationurl) ? c.paginationurl : c.url;
                            return fetchAddonCatalog(url, p, addontype, { url: c._addonUrl, manifestStr: c._addonManifestStr });
                        },
                        addonType: addontype,
                        catalogRawType
                    });
                }
            });
        }

        return list;
    }, [activeFilter, appliedFilters, handleOTTSelect, addonConfig, cinemaContinueWatching, cinemaPlatforms, cinemaHomeSlider]);

    const renderSection = useCallback(({ item }: { item: any }) => {
        switch (item.type) {
            case 'slider': return <TrendingSlider variant={themeStore.homeBuilder.heroBannerStyle} />;
            case 'ott': return <OTTSection onSelect={handleOTTSelect} />;
            case 'continue': return <ContinueWatchingSection />;
            default: return (
                <MovieList
                    title={item.title}
                    type={item.type}
                    fetchFunction={item.fetch}
                    paginated={true}
                    addonType={item.addonType}
                    catalogRawType={item.catalogRawType}
                />
            );
        }
    }, [handleOTTSelect]);

    if (!isHydrated || isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={currentColors.primary} />
            </SafeAreaView>
        );
    }

    // Fallback: no addons at all (should not happen since TMDB is built-in)
    if (addons.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={currentColors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background }]}>
            {/* Dark Luxury Gradient */}
            {currentColors.isAmoled ? (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
            ) : (
                <LinearGradient
                    colors={[currentColors.primary + '30', currentColors.background + 'FA', currentColors.background]}
                    locations={[0, 0.25, 1]}
                    style={StyleSheet.absoluteFill}
                />
            )}
            {!currentColors.isAmoled && (
              <View style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: currentColors.primary + '15', transform: [{ scale: 2 }] }} />
            )}
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header + Addon Picker Header */}
                <View style={[styles.headerTitleRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={[styles.categoryTitle, { color: currentColors.text }]}>
                            {activeFilter === 'All' ? 'Cinema' : activeFilter}
                        </Text>
                        <View style={[styles.titleDot, { backgroundColor: currentColors.primary }]} />
                    </View>
                    <TouchableOpacity onPress={() => setShowAddonPicker(!showAddonPicker)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: currentColors.primary, fontFamily: 'Outfit_500Medium', marginRight: 4 }}>
                            {addonConfig?.addon?.title || 'Providers'}
                        </Text>
                        <Ionicons name={showAddonPicker ? "chevron-up" : "chevron-down"} size={16} color={currentColors.primary} />
                    </TouchableOpacity>
                </View>

                {showAddonPicker && (
                    <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                            {addons.map((a, i) => {
                                const addSource = a.source || a.url;
                                const isSelected = activeCinemaAddon === addSource;
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 20,
                                            borderWidth: 1,
                                            borderColor: isSelected ? currentColors.primary : 'rgba(255,255,255,0.1)',
                                            backgroundColor: 'transparent',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            overflow: 'hidden'
                                        }}
                                        onPress={() => {
                                            setActiveCinemaAddon(addSource);
                                            setShowAddonPicker(false);
                                        }}
                                    >
                                        {currentColors.isAmoled ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} /> : <BlurView intensity={isSelected ? 40 : 20} tint="dark" style={StyleSheet.absoluteFill} />}
                                        {isSelected && <View style={[StyleSheet.absoluteFill, { backgroundColor: currentColors.primary + '20' }]} />}
                                        <Text style={{ color: isSelected ? currentColors.primary : currentColors.text, fontFamily: 'Outfit_500Medium', fontSize: 13, zIndex: 1 }}>
                                            {a.title || 'Addon'}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                <View style={styles.header}>
                    <View style={[styles.searchBar, { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }]}>
                        {currentColors.isAmoled ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} /> : <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
                        <Ionicons name="search-outline" size={20} color={currentColors.textSecondary} style={{ zIndex: 1 }} />
                        <TextInput
                            style={[styles.searchInput, { color: currentColors.text, zIndex: 1 }]}
                            placeholder="Search movies, tv shows..."
                            placeholderTextColor={currentColors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                    </View>
                    {addonConfig?.settings?.showfilter && cinemaFilters && (
                        <TouchableOpacity
                            style={[styles.filterBtn, { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }]}
                            onPress={() => setIsFilterVisible(!isFilterVisible)}
                            activeOpacity={0.7}
                        >
                            {currentColors.isAmoled ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} /> : <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
                            <Ionicons name="options-outline" size={20} color={currentColors.text} style={{ zIndex: 1 }} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter */}
                {addonConfig?.settings?.showfilter && cinemaFilters && (
                    <CinemaFilter
                        visible={isFilterVisible}
                        onClose={() => setIsFilterVisible(false)}
                        onApply={handleApplyFilters}
                        onReset={handleResetFilters}
                        selectedFilters={selectedFilters}
                        setSelectedFilters={setSelectedFilters}
                        type={contentType === 'all' ? 'movie' : contentType}
                    />
                )}

                {appliedFilters ? (
                    addonConfig?.addontype === 'tmdbaddon' ? (
                        <MovieList
                            key={`filtered-${contentType}`}
                            title="Filtered Results"
                            type={contentType === 'all' ? 'all' : contentType === 'tv' ? 'tv' : 'movie'}
                            fetchFunction={(page = 1) => {
                                if (contentType === 'all') {
                                    return discoverAllContent({ ...appliedFilters, page });
                                }
                                return discoverContent(contentType as 'movie' | 'tv', { ...appliedFilters, page });
                            }}
                            mode="grid"
                            paginated={true}
                            addonType="tmdbaddon"
                        />
                    ) : (
                        <View style={{ flex: 1, paddingHorizontal: 20 }}>
                            <Text style={{ color: currentColors.text, paddingVertical: 10 }}>Filter functionality requires global search API support which may not be mapped for custom addons.</Text>
                        </View>
                    )
                ) : !activeCinemaAddon || !addonConfig || !addonConfig.catalogs || addonConfig.catalogs.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 }}>
                        <Ionicons name="film-outline" size={64} color={currentColors.textSecondary} style={{ marginBottom: 16 }} />
                        <Text style={{ color: currentColors.text, fontSize: 18, fontFamily: 'Outfit_600SemiBold', textAlign: 'center' }}>
                            Please choose Any Provider to Explore
                        </Text>
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
        </View>
    );
}

export default function CinemaScreen() {
    return <Cinema />;
}

const styles = StyleSheet.create({
    // Keep styles equivalent to original file
    container: { flex: 1 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 20, marginTop: 10 },
    titleDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 4 },
    header: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, height: 52, borderWidth: 1, backgroundColor: 'rgba(255, 255, 255, 0.03)' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontFamily: 'Outfit_500Medium' },
    filterBtn: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, backgroundColor: 'rgba(255, 255, 255, 0.03)' },
    content: { paddingBottom: 120 },
    categoryTitle: { fontSize: 32, fontFamily: 'Outfit_700Bold' },
    categoriesContainer: { marginBottom: 10 },
    categoriesScroll: { paddingHorizontal: 20, gap: 10 },
    categoryTab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, minWidth: 80, alignItems: 'center' },
    categoryTabText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' }
});
