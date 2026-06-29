import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { getMoviesByProvider, getTVByProvider } from '@/services/tmdb';
import { MovieCardSkeleton, GridSkeleton } from '@/components/Skeleton';

export default function ProviderScreen() {
    const { providerId, name } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();
    const [movies, setMovies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState<'movie' | 'tv'>('movie');
    const numColumns = 3;

    useEffect(() => {
        loadContent(1, true);
    }, [providerId, activeTab]);

    const loadContent = async (pageNum: number, reset = false) => {
        if (!providerId) return;
        setLoading(true);
        try {
            let res;
            if (activeTab === 'movie') {
                res = await getMoviesByProvider(Number(providerId), pageNum);
            } else {
                res = await getTVByProvider(Number(providerId), pageNum);
            }

            if (reset) {
                setMovies(res);
            } else {
                setMovies(prev => [...prev, ...res]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        if (!loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadContent(nextPage);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/details/[type]/[id]', params: { type: activeTab, id: item.id } })}
        >
            <Image
                source={{ uri: `${process.env.EXPO_PUBLIC_TMDB_BASEPOSTER}${item.poster_path}` }}
                style={styles.poster}
            />
            <Text style={styles.title} numberOfLines={1}>{item.title || item.name}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{name} - {activeTab === 'movie' ? 'Movies' : 'TV Shows'}</Text>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, { backgroundColor: colors.card }, activeTab === 'movie' && { backgroundColor: colors.primary }]}
                    onPress={() => { setActiveTab('movie'); setPage(1); }}
                >
                    <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'movie' && styles.activeTabText]}>Movies</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, { backgroundColor: colors.card }, activeTab === 'tv' && { backgroundColor: colors.primary }]}
                    onPress={() => { setActiveTab('tv'); setPage(1); }}
                >
                    <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'tv' && styles.activeTabText]}>TV Shows</Text>
                </TouchableOpacity>
            </View>

            {loading && page === 1 ? (
                <GridSkeleton
                    count={numColumns * 4}
                    columns={numColumns}
                    itemWidth={`${100 / numColumns - 2}%`}
                    renderItem={() => <MovieCardSkeleton width="100%" />}
                />
            ) : (
                <FlatList
                    data={movies}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={3}
                    contentContainerStyle={styles.list}
                    onEndReached={handleLoadMore}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    tabs: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    tabText: {
        fontWeight: '600',
    },
    activeTabText: {
        color: '#fff',
    },
    list: {
        padding: 8,
    },
    card: {
        flex: 1 / 3,
        margin: 4,
        marginBottom: 16,
    },
    poster: {
        width: '100%',
        aspectRatio: 2 / 3,
        borderRadius: 8,
        marginBottom: 8,
    },
    title: {
        color: '#fff',
        fontSize: 12,
        textAlign: 'center',
    }
});
