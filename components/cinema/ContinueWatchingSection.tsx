import React from 'react';
import { View, Text, StyleSheet, FlatList, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useSettingsStore } from '@/store/settingsStore';
import { ContinueWatchingItem, useContinueWatchingStore } from '@/store/continueWatchingStore';
import { TVFocusable } from '@/components/TVFocusable';
import MovieCard from './MovieCard';

const decodeSafe = (value?: string) => {
    if (!value) return '';
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

function ContinueWatchingSection() {
    const router = useRouter();
    const theme = useSettingsStore((state) => state.theme);
    const currentColors = React.useMemo(() => Colors[theme] || Colors.dark, [theme]);
    const items = useContinueWatchingStore(state => state.items);
    const clearAll = useContinueWatchingStore(state => state.clearAll);
    const cardWidth = Platform.isTV ? 240 : 130;
    const cardGap = Platform.isTV ? 20 : 16;

    const openItem = React.useCallback((item: ContinueWatchingItem) => {
        const pathname = Platform.isTV ? '/(tv)/player' : '/player';
        router.push({
            pathname,
            params: {
                url: item.url,
                title: item.title,
                headers: item.headers ? (typeof item.headers === 'string' ? item.headers : JSON.stringify(item.headers)) : undefined,
                userAgent: item.userAgent,
                referer: item.referer,
                origin: item.origin,
                cookie: item.cookie,
                drmkeys: item.drmkeys,
                drmtype: item.drmtype,
                sourceType: 'cinema',
                poster: item.poster,
                backdrop: item.backdrop,
                contentType: item.contentType,
                tmdbId: item.tmdbId,
                season: item.season,
                episode: item.episode,
                resumeMs: String(item.positionMs),
            },
        });
    }, [router]);

    const renderCard = React.useCallback(
        ({ item, index }: { item: ContinueWatchingItem; index: number }) => {
            const ratio = item.durationMs > 0 ? Math.min(1, item.positionMs / item.durationMs) : 0;
            const cardItem = {
                id: item.id,
                title: decodeSafe(item.title) || 'Untitled',
                name: decodeSafe(item.title) || 'Untitled',
                poster_path: item.poster,
                backdrop_path: item.backdrop,
                media_type: item.contentType || 'movie',
                vote_average: 0,
            };

            return (
                <View style={[styles.cardWrap, { width: cardWidth, marginRight: cardGap }]}>
                    <MovieCard
                        item={cardItem}
                        type={(item.contentType || 'movie') as 'movie' | 'tv'}
                        width={cardWidth}
                        onPress={() => openItem(item)}
                    />
                    <View style={styles.progressWrap}>
                        <View style={[styles.progressBg, { backgroundColor: currentColors.border }]}>
                            <View style={[styles.progressFill, { width: `${ratio * 100}%`, backgroundColor: currentColors.primary }]} />
                        </View>
                    </View>
                </View>
            );
        },
        [cardWidth, cardGap, currentColors.border, currentColors.primary, openItem]
    );

    if (!items.length) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={[styles.headerTitle, { color: currentColors.text }]}>Continue Watching</Text>
                    {Platform.isTV && <View style={[styles.dot, { backgroundColor: currentColors.primary }]} />}
                </View>
                {Platform.isTV ? (
                    <TVFocusable
                        style={[styles.clearBtn, { borderColor: currentColors.border, backgroundColor: currentColors.card }]}
                        onPress={clearAll}
                    >
                        <Text style={[styles.clearBtnText, { color: currentColors.textSecondary }]}>Clear</Text>
                    </TVFocusable>
                ) : (
                    <TouchableOpacity
                        style={[styles.clearBtn, { borderColor: currentColors.border, backgroundColor: currentColors.card }]}
                        onPress={clearAll}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.clearBtnText, { color: currentColors.textSecondary }]}>Clear</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={items}
                horizontal
                keyExtractor={(item) => item.id}
                renderItem={renderCard}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                initialNumToRender={6}
                maxToRenderPerBatch={6}
                windowSize={5}
                removeClippedSubviews={true}
                getItemLayout={(_, index) => ({
                    length: cardWidth + cardGap,
                    offset: (cardWidth + cardGap) * index,
                    index,
                })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Platform.isTV ? 34 : 26,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Platform.isTV ? 40 : 16,
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: Platform.isTV ? 26 : 20,
        fontFamily: 'Outfit_700Bold',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 12,
        marginTop: 4,
    },
    clearBtn: {
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
    },
    clearBtnText: {
        fontSize: Platform.isTV ? 15 : 13,
        fontFamily: 'Outfit_600SemiBold',
    },
    listContent: {
        paddingHorizontal: Platform.isTV ? 40 : 16,
    },
    cardWrap: {
        paddingBottom: 2,
    },
    progressWrap: {
        marginTop: Platform.isTV ? -4 : 0,
        paddingHorizontal: 2,
    },
    progressBg: {
        width: '100%',
        height: 5,
        borderRadius: 999,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 999,
    },
});

export default React.memo(ContinueWatchingSection);
