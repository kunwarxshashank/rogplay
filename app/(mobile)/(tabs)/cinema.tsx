import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, ActivityIndicator, Alert, InteractionManager } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Colors } from '@/constants/Colors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import TrendingSlider from '@/components/cinema/TrendingSlider';
import OTTSection from '@/components/cinema/OTTSection';
import MovieList from '@/components/cinema/MovieList';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import CinemaFilter, { FilterState } from '@/components/cinema/CinemaFilter';
import CinemaSearchBar from '@/components/cinema/CinemaSearchBar';
import ContinueWatchingSection from '@/components/cinema/ContinueWatchingSection';
import { useCinemaAddon, fetchAddonCatalog } from '@/hooks/useCinemaAddon';
import { useAddonsStore } from '@/store/addonsStore';
import { useTheme } from '@/hooks/useTheme';
import { discoverContent, discoverAllContent } from '@/services/tmdb';
import { useThemeStore } from '@/store/themeStore';
import { TrendingSliderSkeleton, MovieCardSkeleton } from '@/components/Skeleton';

// Module-level flag: once the Cinema tab has been mounted once, skip the
// InteractionManager delay on subsequent visits.
let cinemaHasMounted = false;

export function Cinema() {
    const [isReady, setIsReady] = useState(cinemaHasMounted);
    
    useEffect(() => {
        if (cinemaHasMounted) return;
        const task = InteractionManager.runAfterInteractions(() => {
            cinemaHasMounted = true;
            setIsReady(true);
        });
        return () => task.cancel();
    }, []);

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
    const heroBannerStyle = useThemeStore((s) => s.homeBuilder.heroBannerStyle);
    const insets = useSafeAreaInsets();

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

    const handleOTTSelect = useCallback((providerId: number, name: string) => {
        router.push({ pathname: '/details/provider', params: { providerId, name } });
    }, [router]);

    const toggleFilter = useCallback(() => {
        setIsFilterVisible((v) => !v);
    }, []);

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
    }, [activeFilter, appliedFilters, addonConfig, cinemaContinueWatching, cinemaPlatforms, cinemaHomeSlider]);

    const renderSection = useCallback(({ item }: { item: any }) => {
        switch (item.type) {
            case 'slider': return <TrendingSlider variant={heroBannerStyle} />;
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
    }, [handleOTTSelect, heroBannerStyle]);

    if (!isReady || !isHydrated || isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: 'transparent' }]}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50, paddingTop: insets.top }}>
                    <TrendingSliderSkeleton />
                    
                    {/* Fake OTT Section Skeleton */}
                    <View style={{ marginTop: 10, paddingHorizontal: 20 }}>
                        <View style={{ borderRadius: 6, overflow: 'hidden', width: 120, height: 24, marginBottom: 16, backgroundColor: currentColors.primary + '15' }}>
                            <View style={{ flex: 1, backgroundColor: currentColors.primary + '30' }} />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                             {[...Array(5)].map((_, i) => (
                                 <View key={i} style={{ width: 60, height: 60, borderRadius: 30, overflow: 'hidden', backgroundColor: currentColors.primary + '15' }}>
                                     <View style={{ flex: 1, backgroundColor: currentColors.primary + '20' }} />
                                 </View>
                             ))}
                        </View>
                    </View>

                    {/* Fake Movie List Skeletons */}
                    <View style={{ marginTop: 30, paddingHorizontal: 20 }}>
                        <View style={{ borderRadius: 6, overflow: 'hidden', width: 150, height: 24, marginBottom: 16, backgroundColor: currentColors.primary + '15' }}>
                            <View style={{ flex: 1, backgroundColor: currentColors.primary + '30' }} />
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ overflow: 'visible' }}>
                            {[...Array(4)].map((_, i) => (
                                <View key={i} style={{ marginRight: 12 }}>
                                    <MovieCardSkeleton />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                    
                    <View style={{ marginTop: 30, paddingHorizontal: 20 }}>
                        <View style={{ borderRadius: 6, overflow: 'hidden', width: 180, height: 24, marginBottom: 16, backgroundColor: currentColors.primary + '15' }}>
                            <View style={{ flex: 1, backgroundColor: currentColors.primary + '30' }} />
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ overflow: 'visible' }}>
                            {[...Array(4)].map((_, i) => (
                                <View key={i} style={{ marginRight: 12 }}>
                                    <MovieCardSkeleton />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </ScrollView>
            </View>
        );
    }

    // Fallback: no addons at all (should not happen since TMDB is built-in)
    if (addons.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="film-outline" size={64} color={currentColors.textSecondary} style={{ marginBottom: 16 }} />
                <Text style={{ color: currentColors.text, fontSize: 18, fontFamily: 'Outfit_600SemiBold', textAlign: 'center' }}>
                    Please choose Any Provider to Explore
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
            {/* Header Overlay */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: insets.top }}>
                <CinemaSearchBar
                    showFilter={!!(addonConfig?.settings?.showfilter && cinemaFilters)}
                    onToggleFilter={toggleFilter}
                />

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
            </View>

            <View style={{ flex: 1 }}>

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
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                        <View style={{ height: 10 }} />
                        {sections.map((item) => (
                            <React.Fragment key={item.id}>
                                {renderSection({ item })}
                            </React.Fragment>
                        ))}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}

export default function CinemaScreen() {
    return <Cinema />;
}

const styles = StyleSheet.create({
    // Keep styles equivalent to original file
    container: { flex: 1 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 12 },
    headerEyebrow: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 2.5, marginBottom: 1, opacity: 0.7 },
    titleDot: { width: 7, height: 7, borderRadius: 3.5, marginLeft: 5 },
    providerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        maxWidth: 160,
    },
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
