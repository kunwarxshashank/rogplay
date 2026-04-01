import React, { useMemo, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useSettingsStore } from '@/store/settingsStore';
import TVHeroSlider from '@/components/tv/TVHeroSlider';
import OTTSection from '@/components/cinema/OTTSection';
import MovieList from '@/components/cinema/MovieList';
import { getLatestMovies, getPopularTV, getAnime, getOnAirTV, getKDrama, getBollywoodMovies } from '@/services/tmdb';
import { useRouter } from 'expo-router';
import ContinueWatchingSection from '@/components/cinema/ContinueWatchingSection';

export default function TVHomeScreen() {
    const theme = useSettingsStore((state) => state.theme);
    const currentColors = useMemo(() => Colors[theme] || Colors.dark, [theme]);
    const router = useRouter();

    const handleOTTSelect = useCallback((providerId: number, name: string) => {
        router.push({ pathname: '/(tv)/details', params: { providerId, name } });
    }, [router]);

    const sections = useMemo(
        () => [
            { key: 'latest', title: 'Latest Movies', fetchFunction: getLatestMovies, type: 'movie' as const },
            { key: 'popular', title: 'Popular Series', fetchFunction: getPopularTV, type: 'tv' as const },
            { key: 'anime', title: 'Trending Anime', fetchFunction: getAnime, type: 'tv' as const },
            { key: 'onAir', title: 'On The Air', fetchFunction: getOnAirTV, type: 'tv' as const },
            { key: 'kdrama', title: 'K-Drama', fetchFunction: getKDrama, type: 'tv' as const },
            { key: 'bollywood', title: 'Bollywood Hits', fetchFunction: getBollywoodMovies, type: 'movie' as const },
        ],
        []
    );

    const renderSection = useCallback(
        ({ item }) => (
            <MovieList
                title={item.title}
                fetchFunction={item.fetchFunction}
                type={item.type}
                paginated
            />
        ),
        []
    );

    const ListHeader = useCallback(() => (
        <>
            <TVHeroSlider />
            <ContinueWatchingSection />
            <View style={styles.section}>
                <OTTSection onSelect={handleOTTSelect} />
            </View>
        </>
    ), [handleOTTSelect]);

    return (
        <View style={[styles.container]}>
            <FlatList
                data={sections}
                renderItem={renderSection}
                keyExtractor={(item) => item.key}
                ListHeaderComponent={ListHeader}
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
});
