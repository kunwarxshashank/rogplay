import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Platform, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { TVFocusable } from '@/components/TVFocusable';
import { MovieCardSkeleton } from '@/components/Skeleton';
import MovieCard from './MovieCard';
import { useTheme } from '@/hooks/useTheme';

interface MovieListProps {
    title: string;
    fetchFunction: (page?: number) => Promise<any[] | { results: any[], total_pages?: number }>;
    type?: 'movie' | 'tv' | 'all';
    mode?: 'horizontal' | 'grid';
    paginated?: boolean;
    addonType?: string;
    catalogRawType?: string | undefined;
}

function MovieList({ title, fetchFunction, type, mode = 'horizontal', paginated = false, addonType, catalogRawType }: MovieListProps) {
    const { colors: currentColors } = useTheme();

    // Keep a ref to the latest fetchFunction so reference changes from
    // parent re-renders don't trigger a reload.
    const fetchFunctionRef = React.useRef(fetchFunction);
    useEffect(() => {
        fetchFunctionRef.current = fetchFunction;
    });

    const {
        data: queryData,
        error: queryError,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        status,
    } = useInfiniteQuery({
        queryKey: ['movieList', title, type, addonType, catalogRawType],
        queryFn: async ({ pageParam = 1 }) => {
            const result = await fetchFunctionRef.current(pageParam);
            if (Array.isArray(result)) {
                return { results: result, total_pages: 1, page: pageParam };
            }
            return {
                results: result.results || [],
                total_pages: result.total_pages || 1,
                page: pageParam
            };
        },
        getNextPageParam: (lastPage) => {
            if (!paginated) return undefined;
            if (lastPage.page < lastPage.total_pages) {
                return lastPage.page + 1;
            }
            return undefined;
        },
        initialPageParam: 1,
        staleTime: 1000 * 60 * 5, // 5 mins
    });

    const data = useMemo(() => {
        if (!queryData) return [];
        const combined = queryData.pages.flatMap((page) => page.results);
        const seen = new Set();
        return combined.filter(item => {
            const id = item.id?.toString();
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [queryData]);

    const isGrid = mode === 'grid';
    const numColumns = Platform.isTV ? 5 : 3;
    const cardWidth = Platform.isTV ? 240 : 130;
    const itemSpacing = Platform.isTV ? 20 : 16;

    const itemStyle = useMemo(
        () => (isGrid ? { flex: 1 / numColumns, margin: 6 } : { marginRight: itemSpacing }),
        [isGrid, numColumns, itemSpacing]
    );

    const listContentStyle = useMemo(
        () => [styles.list, isGrid && { paddingHorizontal: 16 }],
        [isGrid]
    );

    const getItemLayout = useCallback(
        (_: any, index: number) => ({
            length: cardWidth + itemSpacing,
            offset: (cardWidth + itemSpacing) * index,
            index,
        }),
        [cardWidth, itemSpacing]
    );

    const handleLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const renderItem = useCallback(
        ({ item }: { item: any }) => (
                <MovieCard
                    item={item}
                    type={(item.media_type || type) as 'movie' | 'tv'}
                    addonType={addonType}
                    catalogTypeRaw={catalogRawType}
                    width={isGrid ? undefined : cardWidth}
                    style={itemStyle}
                />
        ),
        [cardWidth, isGrid, itemStyle, type, addonType, catalogRawType]
    );

    const renderFooter = useCallback(() => {
        if (!paginated || !hasNextPage) return <View style={{ height: 20 }} />;

        return (
            <View style={styles.footerContainer}>
                {isFetchingNextPage && <MovieCardSkeleton width={cardWidth} />}
            </View>
        );
    }, [paginated, hasNextPage, isFetchingNextPage, cardWidth]);

    if (status === 'pending' && !isFetchingNextPage) {
        return (
            <View style={[styles.container, isGrid && { flex: 1 }]}>
                <View style={[styles.header, isGrid && { paddingHorizontal: 24 }]}>
                    <Text style={[styles.title, { color: currentColors.text }]}>{title}</Text>
                </View>
                {isGrid ? (
                    <View style={[styles.gridSkeletonContainer, { paddingHorizontal: 16 }]}>
                        {Array.from({ length: numColumns * 2 }).map((_, index) => (
                            <View key={index} style={{ flex: 1 / numColumns, margin: 8 }}>
                                <MovieCardSkeleton width="100%" />
                            </View>
                        ))}
                    </View>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
                        {Array.from({ length: 6 }).map((_, index) => (
                            <MovieCardSkeleton key={index} width={140} />
                        ))}
                    </ScrollView>
                )}
            </View>
        );
    }

    if (status === 'error') {
        return (
            <View style={[styles.container, isGrid && { flex: 1 }]}>
                <View style={[styles.header, isGrid && { paddingHorizontal: 24 }]}>
                    <Text style={[styles.title, { color: currentColors.text }]}>{title}</Text>
                </View>
                <View style={styles.centerContent}>
                    <Text style={[styles.errorText, { color: currentColors.error }]}>Failed to load content.</Text>
                </View>
            </View>
        );
    }

    if (data.length === 0) return null;

    return (
        <View style={[styles.container, isGrid && { flex: 1 }]}>
            <View style={[styles.header, isGrid && { paddingHorizontal: 24 }]}>
                <View style={styles.titleSection}>
                    {!Platform.isTV && <View style={[styles.titleBar, { backgroundColor: currentColors.primary }]} />}
                    <Text style={[styles.title, { color: currentColors.text }]}>{title}</Text>
                    {Platform.isTV && <View style={[styles.indicator, { backgroundColor: currentColors.primary }]} />}
                </View>
                {!isGrid && (
                    <TouchableOpacity style={[styles.moreBtn, { backgroundColor: currentColors.primary + '18' }]} activeOpacity={0.7}>
                        <Text style={[styles.moreText, { color: currentColors.primary }]}>See all</Text>
                        <MaterialIcons name="chevron-right" size={16} color={currentColors.primary} />
                    </TouchableOpacity>
                )}
            </View>
            <FlatList
                key={isGrid ? `grid-${numColumns}` : 'horizontal'}
                data={data}
                renderItem={renderItem}
                keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                horizontal={!isGrid}
                numColumns={isGrid ? numColumns : 1}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={listContentStyle}
                style={isGrid ? { flex: 1 } : null}
                scrollEnabled={true}
                nestedScrollEnabled={true}
                initialNumToRender={isGrid ? numColumns * 2 : 6}
                maxToRenderPerBatch={isGrid ? numColumns * 2 : 6}
                windowSize={5}
                removeClippedSubviews={true}
                getItemLayout={!isGrid ? getItemLayout : undefined}
                ListFooterComponent={renderFooter}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Platform.isTV ? 40 : 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Platform.isTV ? 40 : 16,
        marginBottom: Platform.isTV ? 20 : 16,
    },
    titleSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    titleBar: {
        width: 4,
        height: 20,
        borderRadius: 2,
    },
    title: {
        fontSize: Platform.isTV ? 26 : 20,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: -0.5,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 12,
        marginTop: 4,
    },
    moreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingLeft: 12,
        paddingRight: 8,
        paddingVertical: 5,
        borderRadius: 999,
    },
    moreText: {
        fontSize: 12.5,
        fontFamily: 'Outfit_600SemiBold',
    },
    list: {
        paddingHorizontal: Platform.isTV ? 40 : 16,
    },
    gridSkeletonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    loadingText: {
        fontSize: 14,
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    errorText: {
        fontSize: 14,
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    footerContainer: {
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    loadMoreBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        minWidth: 140,
        alignItems: 'center',
    },
    loadMoreText: {
        fontSize: 15,
        fontFamily: 'Outfit_600SemiBold',
    }
});

export default React.memo(MovieList);
