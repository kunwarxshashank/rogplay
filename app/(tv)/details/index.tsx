import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { getMoviesByProvider, getTVByProvider } from '@/services/tmdb';
import MovieList from '@/components/cinema/MovieList';
import { TVFocusable } from '@/components/TVFocusable';
import { PROVIDER_LOGOS } from '@/constants/Providers';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export default function TVProviderDetailsScreen() {
    const { colors: currentColors } = useTheme();
    const { providerId, name } = useLocalSearchParams();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'movie' | 'tv'>('movie');

    const fetchContent = useCallback(async () => {
        if (!providerId) return [];
        if (activeTab === 'movie') {
            return await getMoviesByProvider(Number(providerId), 1);
        } else {
            return await getTVByProvider(Number(providerId), 1);
        }
    }, [providerId, activeTab]);

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background }]}>
            <View style={styles.header}>
                <TVFocusable
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <MaterialIcons name="arrow-back" size={28} color="#fff" />
                </TVFocusable>
                <View style={styles.headerInfo}>
                    <View style={styles.titleRow}>
                        {PROVIDER_LOGOS[Number(providerId)] && (
                            <Image
                                source={PROVIDER_LOGOS[Number(providerId)]}
                                style={styles.providerLogo}
                            />
                        )}
                        <Text style={[styles.headerTitle, { color: currentColors.text }]}>{name}</Text>
                    </View>
                    <Text style={[styles.headerSubtitle, { color: currentColors.textSecondary }]}>
                        {activeTab === 'movie' ? 'Watch Movies' : 'Watch TV Series'}
                    </Text>
                </View>

                <View style={styles.tabContainer}>
                    <TVFocusable
                        onPress={() => setActiveTab('movie')}
                        style={[
                            styles.tabItem,
                            activeTab === 'movie' && { backgroundColor: currentColors.primary }
                        ]}
                    >
                        <View style={styles.tabContent}>
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === 'movie' ? '#fff' : currentColors.textSecondary }
                            ]}>Movies</Text>
                        </View>
                    </TVFocusable>
                    <TVFocusable
                        onPress={() => setActiveTab('tv')}
                        style={[
                            styles.tabItem,
                            activeTab === 'tv' && { backgroundColor: currentColors.primary }
                        ]}
                    >
                        <View style={styles.tabContent}>
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === 'tv' ? '#fff' : currentColors.textSecondary }
                            ]}>Series</Text>
                        </View>
                    </TVFocusable>
                </View>
            </View>

            <View style={styles.contentContainer}>
                <MovieList
                    key={`${activeTab}-${providerId}`}
                    title=""
                    fetchFunction={fetchContent}
                    type={activeTab}
                    mode="grid"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginBottom: 30,
        gap: 20,
    },
    backButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        fontFamily: 'Outfit_700Bold',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    providerLogo: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#000',
    },
    headerSubtitle: {
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 6,
        borderRadius: 30,
        gap: 8,
    },
    tabItem: {
        paddingHorizontal: 24,
        height: 50,
        justifyContent: 'center',
        borderRadius: 25,
        minWidth: 140,
        alignItems: 'center',
    },
    tabText: {
        fontSize: 18,
        fontFamily: 'Outfit_600SemiBold',
    },
    tabContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    contentContainer: {
        flex: 1,
        paddingBottom: 100,
    },
});
