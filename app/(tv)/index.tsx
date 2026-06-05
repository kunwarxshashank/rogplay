import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useSettingsStore } from '@/store/settingsStore';
import TVHeroSlider from '@/components/tv/TVHeroSlider';
import OTTSection from '@/components/cinema/OTTSection';
import MovieList from '@/components/cinema/MovieList';
import { useRouter } from 'expo-router';
import ContinueWatchingSection from '@/components/cinema/ContinueWatchingSection';
import { Ionicons } from '@expo/vector-icons';
import { useCinemaAddon, fetchAddonCatalog } from '@/hooks/useCinemaAddon';
import { useAddonsStore } from '@/store/addonsStore';

export default function TVHomeScreen() {
    const theme = useSettingsStore((state) => state.theme);
    const currentColors = useMemo(() => Colors[theme] || Colors.dark, [theme]);
    const router = useRouter();

    const [showAddonPicker, setShowAddonPicker] = useState(false);

    const { addons, activeCinemaAddon, setActiveCinemaAddon, isLoading, isHydrated } = useAddonsStore();
    const addonConfig = useCinemaAddon();

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

    const handleOTTSelect = useCallback((providerId: number, name: string) => {
        router.push({ pathname: '/(tv)/details', params: { providerId, name } });
    }, [router]);

    const sections = useMemo(() => {
        if (!addonConfig) return [];
        const { catalogs, addontype } = addonConfig;

        let list: any[] = [];
        if (catalogs && catalogs.length > 0) {
            list = catalogs.map((c: any, index: number) => ({
                key: `catalog_${index}_${c.name}`,
                title: c.name,
                type: c.type === 'series' || c.type === 'tv' ? 'tv' : 'movie',
                addonType: addontype,
                catalogRawType: c.type,
                fetchFunction: (page?: number) => {
                    const p = page || 1;
                    const url = (p > 1 && c.paginationurl) ? c.paginationurl : c.url;
                    return fetchAddonCatalog(url, p, addontype, { url: c._addonUrl, manifestStr: c._addonManifestStr });
                }
            }));
        }
        return list;
    }, [addonConfig]);

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

    const ListHeader = useCallback(() => (
        <>
            {addonConfig?.settings?.showslider && <TVHeroSlider />}

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

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 40, marginTop: 20, marginBottom: 10 }}>
                <Text style={{ fontSize: 36, fontFamily: 'Outfit_700Bold', color: currentColors.text }}>Cinema</Text>

                <TouchableOpacity onPress={() => setShowAddonPicker(!showAddonPicker)} style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, backgroundColor: currentColors.card, borderWidth: 1, borderColor: currentColors.border }}>
                    <Text style={{ color: currentColors.primary, fontFamily: 'Outfit_500Medium', marginRight: 8, fontSize: 16 }}>
                        {addonConfig?.addon?.title || 'Providers'}
                    </Text>
                    <Ionicons name={showAddonPicker ? "chevron-up" : "chevron-down"} size={20} color={currentColors.primary} />
                </TouchableOpacity>
            </View>

            <ContinueWatchingSection />

            {addonConfig?.settings?.showottsection && (
                <View style={styles.section}>
                    <OTTSection onSelect={handleOTTSelect} />
                </View>
            )}
        </>
    ), [handleOTTSelect, addonConfig, showAddonPicker, addons, activeCinemaAddon, currentColors, setActiveCinemaAddon]);

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
                ListFooterComponent={<View style={styles.bottomSpacer} />}
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
        marginBottom: 20, // increased spacing
        marginTop: 10,
    },
    bottomSpacer: {
        height: 60,
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
