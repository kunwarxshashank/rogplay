import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, Text, ActivityIndicator, TouchableOpacity, ScrollView, Animated, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import TVHeroSlider from '@/components/tv/TVHeroSlider';
import OTTSection from '@/components/cinema/OTTSection';
import MovieList from '@/components/cinema/MovieList';
import { useRouter } from 'expo-router';
import ContinueWatchingSection from '@/components/cinema/ContinueWatchingSection';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCinemaAddon, fetchAddonCatalog } from '@/hooks/useCinemaAddon';
import { useAddonsStore } from '@/store/addonsStore';
import { useThemeStore, HOME_LAYOUT_CONFIG, POSTER_STYLES } from '@/store/themeStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

export default function TVHomeScreen() {
    const { colors: currentColors } = useTheme();
    const themeStore = useThemeStore();
    const router = useRouter();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const [showAddonPicker, setShowAddonPicker] = useState(false);

    const { addons, activeCinemaAddon, setActiveCinemaAddon, isLoading, isHydrated } = useAddonsStore();
    const addonConfig = useCinemaAddon();

    const layoutConfig = HOME_LAYOUT_CONFIG[themeStore.homeBuilder.layout];
    const posterConfig = POSTER_STYLES[themeStore.posterStyle];

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, [themeStore.themePalette]);

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

    const handleOTTSelect = useCallback((providerId: number, name: string) => {
        router.push({ pathname: '/(tv)/details', params: { providerId, name } });
    }, [router]);

    const sections = useMemo(() => {
        if (!addonConfig) return [];
        const { catalogs, addontype } = addonConfig;

        const visibleSectionIds = themeStore.homeBuilder.sections
            .filter(s => !themeStore.hiddenSections.includes(s.id))
            .map(s => s.id);

        const sectionOrder = themeStore.sectionOrder.length > 0
            ? themeStore.sectionOrder
            : themeStore.homeBuilder.sections.map(s => s.id);

        let allSections: any[] = [];

        // Map addon catalogs to sections
        if (catalogs && catalogs.length > 0) {
            const catalogSections = catalogs.map((c: any, index: number) => ({
                key: `catalog_${index}_${c.name}`,
                title: c.name,
                type: c.type === 'series' || c.type === 'tv' ? 'tv' : 'movie',
                addonType: addontype,
                catalogRawType: c.type,
                sectionId: `catalog_${c.name.toLowerCase().replace(/\s+/g, '_')}`,
                fetchFunction: (page?: number) => {
                    const p = page || 1;
                    const url = (p > 1 && c.paginationurl) ? c.paginationurl : c.url;
                    return fetchAddonCatalog(url, p, addontype, { url: c._addonUrl, manifestStr: c._addonManifestStr });
                }
            }));
            allSections = [...allSections, ...catalogSections];
        }

        // Filter visible sections (only hide if explicitly in hiddenSections)
        const filtered = allSections.filter(s => !themeStore.hiddenSections.includes(s.sectionId));

        // Sort by custom order if available
        if (sectionOrder.length > 0) {
            filtered.sort((a, b) => {
                const aIdx = sectionOrder.indexOf(a.sectionId);
                const bIdx = sectionOrder.indexOf(b.sectionId);
                return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
            });
        }

        return filtered;
    }, [addonConfig, themeStore.homeBuilder.sections, themeStore.hiddenSections, themeStore.sectionOrder]);

    const renderSection = useCallback(
        ({ item }: { item: any }) => (
            <MovieList
                title={item.title}
                fetchFunction={item.fetchFunction}
                type={item.type}
                paginated
                addonType={item.addonType}
                catalogRawType={item.catalogRawType}
            />
        ),
        []
    );

    const layoutStyle = useMemo(() => ({
        sectionSpacing: layoutConfig.sectionSpacing,
        titleSize: layoutConfig.titleStyle === 'large' ? 26 : layoutConfig.titleStyle === 'compact' ? 20 : 18,
    }), [layoutConfig]);

    const ListHeader = useCallback(() => (
        <Animated.View style={{ opacity: fadeAnim }}>
            {/* Hero Banner */}
            {themeStore.homeBuilder.showHeroBanner && addonConfig?.settings?.showslider && (
                <TVHeroSlider variant={themeStore.homeBuilder.heroBannerStyle} />
            )}

            {/* Addon Picker */}
            {showAddonPicker && (
                <View style={[styles.addonPicker, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                        {addons.map((a, i) => {
                            const addSource = a.source || a.url;
                            const isSelected = activeCinemaAddon === addSource;
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 10,
                                        borderRadius: 20,
                                        borderWidth: 2,
                                        borderColor: isSelected ? currentColors.primary : currentColors.border,
                                        backgroundColor: isSelected ? currentColors.primary + '20' : 'transparent',
                                    }}
                                    onPress={() => {
                                        setActiveCinemaAddon(addSource);
                                        setShowAddonPicker(false);
                                    }}
                                >
                                    <Text style={{ color: isSelected ? currentColors.primary : currentColors.text, fontFamily: 'Outfit_500Medium', fontSize: 16 }}>
                                        {a.title || 'Addon'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Header */}
            <View style={[styles.headerRow, { marginBottom: layoutConfig.sectionSpacing / 2 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={[styles.pageTitle, { color: currentColors.text, fontSize: layoutConfig.titleStyle === 'large' ? 36 : 28 }]}>
                        {layoutConfig.titleStyle === 'large' ? 'Cinema' : 'Browse'}
                    </Text>
                    <View style={[styles.titleDot, { backgroundColor: currentColors.primary }]} />
                </View>

                <TouchableOpacity
                    onPress={() => setShowAddonPicker(!showAddonPicker)}
                    style={[styles.providerBtn, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
                >
                    <Text style={{ color: currentColors.primary, fontFamily: 'Outfit_500Medium', marginRight: 8, fontSize: 16 }}>
                        {addonConfig?.addon?.title || 'Providers'}
                    </Text>
                    <Ionicons name={showAddonPicker ? "chevron-up" : "chevron-down"} size={20} color={currentColors.primary} />
                </TouchableOpacity>
            </View>

            {/* Layout-specific decorations */}
            {layoutConfig.heroStyle === 'immersive' && (
                currentColors.isAmoled ? (
                    <View style={{ height: 200, marginBottom: -100, marginHorizontal: -44, backgroundColor: '#000' }} />
                ) : (
                    <LinearGradient
                        colors={[currentColors.primary + '20', 'transparent']}
                        style={{ height: 200, marginBottom: -100, marginHorizontal: -44 }}
                    />
                )
            )}

            {/* Continue Watching */}
            <ContinueWatchingSection />

            {/* OTT Platforms */}
            {addonConfig?.settings?.showottsection && (
                <View style={[styles.section, { marginBottom: layoutConfig.sectionSpacing }]}>
                    <OTTSection onSelect={handleOTTSelect} />
                </View>
            )}
        </Animated.View>
    ), [handleOTTSelect, addonConfig, showAddonPicker, addons, activeCinemaAddon, currentColors, setActiveCinemaAddon, themeStore.homeBuilder.showHeroBanner, themeStore.homeBuilder.heroBannerStyle, layoutConfig, fadeAnim]);

    if (!isHydrated || isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: currentColors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={currentColors.primary} />
            </View>
        );
    }

    if (addons.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: currentColors.background }]}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Ionicons name="film-outline" size={80} color={currentColors.textSecondary} style={{ marginBottom: 16 }} />
                    <Text style={{ color: currentColors.text, fontSize: 32, fontFamily: 'Outfit_600SemiBold', textAlign: 'center', marginBottom: 16 }}>No Addons Added</Text>
                    <Text style={{ color: currentColors.textSecondary, fontSize: 20, fontFamily: 'Outfit_400Regular', textAlign: 'center', marginBottom: 32 }}>
                        Please add an addon in settings to view TV content.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container]}>
            <FlatList
                data={sections}
                renderItem={renderSection}
                keyExtractor={(item) => item.key}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={!activeCinemaAddon || !addonConfig || !addonConfig.catalogs || addonConfig.catalogs.length === 0 ? (
                    <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
                        <Ionicons name="film-outline" size={64} color={currentColors.textSecondary} style={{ marginBottom: 16 }} />
                        <Text style={{ color: currentColors.text, fontSize: 18, fontFamily: 'Outfit_600SemiBold', textAlign: 'center' }}>
                            Please choose Any Provider to Explore
                        </Text>
                    </View>
                ) : null}
                ListFooterComponent={<View style={{ height: layoutConfig.sectionSpacing * 2 }} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                scrollEventThrottle={16}
                windowSize={5}
                removeClippedSubviews={true}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 60,
    },
    section: {
        marginBottom: 20,
        marginTop: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 40,
        marginTop: 20,
        marginBottom: 10,
    },
    pageTitle: {
        fontFamily: 'Outfit_700Bold',
    },
    titleDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 6,
        marginTop: 4,
    },
    providerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    addonPicker: {
        marginTop: 20,
        marginHorizontal: 40,
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 16,
        borderWidth: 1
    }
});
