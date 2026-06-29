import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TVSearchBar } from './tv/TVSearchBar';
import { TVFocusable } from './TVFocusable';
import { GridSkeleton, MovieCardSkeleton } from './Skeleton';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { useTheme } from '@/hooks/useTheme';

// ─── Types ─────────────────────────────────────────────

export interface BrowserCategory {
    id: string;
    name: string;
}

export interface BrowserItem {
    id: string;
    title: string;
    imageUrl?: string;
    subtitle?: string;
    isLive?: boolean;
}

export interface CatalogBrowserProps {
    /** Page title shown in the header */
    title: string;
    /** Optional subtitle under the title */
    subtitle?: string;
    /** Optional background image URL */
    backgroundImage?: string;
    /** Called when the back button is pressed */
    onBack: () => void;

    /** Category tabs to display (pass empty array for none) */
    categories: BrowserCategory[];
    /** ID of the currently selected category */
    selectedCategoryId?: string | null;
    /** Called when a category tab is tapped */
    onSelectCategory?: (category: BrowserCategory) => void;

    /** Items to display in the grid */
    items: BrowserItem[];
    /** Whether data is loading */
    loading: boolean;

    /** Current search text */
    searchQuery: string;
    /** Called when search text changes */
    onSearch: (text: string) => void;
    /** Placeholder for the search bar */
    searchPlaceholder?: string;

    /** Called when an item card is pressed */
    onItemPress: (item: BrowserItem) => void;
    /** Optional: called when favourite button is pressed */
    onToggleFavorite?: (item: BrowserItem) => void;
    /** Optional: check if item is already favourite */
    isItemFavorite?: (item: BrowserItem) => boolean;

    /** Called when the user scrolls near the end (for pagination) */
    onEndReached?: () => void;
    /** Whether more items are being loaded (for pagination) */
    loadingMore?: boolean;
    /** Whether items are live channels (affects card style) */
    isLiveMode?: boolean;
    /** Extra children rendered above the grid (e.g. modals/overlays) */
    children?: React.ReactNode;
}

// ─── Component ─────────────────────────────────────────

export default function CatalogBrowser({
    title,
    subtitle,
    backgroundImage,
    onBack,
    categories,
    selectedCategoryId,
    onSelectCategory,
    items,
    loading,
    searchQuery,
    onSearch,
    searchPlaceholder = 'Search...',
    onItemPress,
    onToggleFavorite,
    isItemFavorite,
    onEndReached,
    loadingMore,
    isLiveMode = false,
    children,
}: CatalogBrowserProps) {
    const { colors: activeColors } = useTheme();

    // ─── Category Tab ──────────────────────────────────
    const renderCategoryTab = useCallback(({ item }: { item: BrowserCategory }) => {
        const isSelected = selectedCategoryId === item.id;
        return (
            <TVFocusable
                style={styles.categoryTabWrapper}
                onPress={() => onSelectCategory?.(item)}
                autoFlex={false}
            >
                <View
                    style={[
                        styles.categoryTabContent,
                        { backgroundColor: activeColors.card, borderColor: activeColors.border },
                        isSelected && { backgroundColor: activeColors.primary, borderColor: activeColors.primary },
                    ]}
                >
                    <Text
                        style={[
                            styles.categoryTabText,
                            { color: activeColors.text },
                            isSelected && { color: '#fff' },
                        ]}
                    >
                        {item.name}
                    </Text>
                </View>
            </TVFocusable>
        );
    }, [selectedCategoryId, onSelectCategory, activeColors]);

    // ─── Item Card ─────────────────────────────────────
    const renderItem = useCallback(({ item }: { item: BrowserItem }) => {
        const isLive = item.isLive || isLiveMode;
        const favorite = isItemFavorite?.(item) || false;

        const cardInner = (
            <View style={styles.posterContainer}>
                {item.imageUrl ? (
                    <OptimizedImage
                        source={{ uri: item.imageUrl }}
                        style={isLive ? styles.channelLogo : styles.poster}
                        resizeMode={isLive ? 'contain' : 'cover'}
                    />
                ) : (
                    <View style={[styles.fallbackIcon, { backgroundColor: activeColors.surface }]}>
                        <MaterialIcons
                            name={isLive ? 'tv' : 'movie'}
                            size={40}
                            color={activeColors.primary}
                        />
                    </View>
                )}
                {activeColors.isAmoled ? (
                    <View style={styles.gradient} />
                ) : (
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.95)']}
                        style={styles.gradient}
                    />
                )}
                <View style={styles.infoOverlay}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                    </Text>
                    {item.subtitle ? (
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                            {item.subtitle}
                        </Text>
                    ) : null}
                </View>
                {isLive && (
                    <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                )}
            </View>
        );

        return (
            <TVFocusable style={styles.card} onPress={() => onItemPress(item)}>
                {cardInner}
                {onToggleFavorite ? (
                    <TouchableOpacity
                        onPress={() => onToggleFavorite(item)}
                        style={styles.favoriteButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialIcons
                            name={favorite ? 'favorite' : 'favorite-border'}
                            size={20}
                            color={favorite ? '#ef4444' : '#fff'}
                        />
                    </TouchableOpacity>
                ) : null}
            </TVFocusable>
        );
    }, [onItemPress, onToggleFavorite, isItemFavorite, isLiveMode, activeColors]);

    // ─── Render ────────────────────────────────────────
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]}>
            {/* Optional background image */}
            {backgroundImage ? (
                <View style={StyleSheet.absoluteFill}>
                    <OptimizedImage
                        source={{ uri: backgroundImage }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                    />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]} />
                </View>
            ) : null}

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack}>
                    <MaterialIcons name="arrow-back" size={24} color={activeColors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={[styles.headerTitle, { color: activeColors.text }]} numberOfLines={1}>
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text style={[styles.headerSubtitle, { color: activeColors.textSecondary }]} numberOfLines={1}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
            </View>

            {/* Category Tabs */}
            {categories.length > 0 && (
                <View style={styles.categorySelector}>
                    <FlashList
                        horizontal
                        data={categories}
                        renderItem={renderCategoryTab}
                        keyExtractor={(item) => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryList}
                        estimatedItemSize={120}
                    />
                </View>
            )}

            {/* Search Bar */}
            <View style={styles.toolbar}>
                {Platform.isTV ? (
                    <TVSearchBar
                        onSearch={onSearch}
                        value={searchQuery}
                        placeholder={searchPlaceholder}
                        containerStyle={styles.tvSearchBar}
                    />
                ) : (
                    <View style={[styles.searchBar, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                        <MaterialIcons name="search" size={20} color={activeColors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: activeColors.text }]}
                            placeholder={searchPlaceholder}
                            placeholderTextColor={activeColors.textSecondary}
                            value={searchQuery}
                            onChangeText={onSearch}
                        />
                    </View>
                )}
            </View>

            {/* Grid */}
            {loading && items.length === 0 ? (
                <GridSkeleton
                    count={12}
                    columns={3}
                    itemWidth="32%"
                    renderItem={() =>
                        <MovieCardSkeleton width="100%" />
                    }
                />
            ) : (
                <View style={{ flex: 1, width: '100%' }}>
                    <FlashList
                        data={items}
                        keyExtractor={(item, index) => item.id || index.toString()}
                        renderItem={renderItem}
                        numColumns={3}
                        contentContainerStyle={styles.list}
                        onEndReached={onEndReached}
                        estimatedItemSize={250}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            loadingMore ? (
                                <View style={{ paddingVertical: 20 }}>
                                    <ActivityIndicator color={activeColors.primary} size="large" />
                                </View>
                            ) : null
                        }
                        ListEmptyComponent={
                            !loading ? (
                                <View style={styles.emptyContainer}>
                                    <MaterialIcons name="search-off" size={64} color={activeColors.border} />
                                    <Text style={[styles.emptyText, { color: activeColors.text }]}>No content found</Text>
                                    <Text style={[styles.emptySubtitle, { color: activeColors.textSecondary }]}>
                                        Try a different category or search query
                                    </Text>
                                </View>
                            ) : null
                        }
                    />
                </View>
            )}

            {/* Extra content (modals, overlays, etc.) */}
            {children}
        </SafeAreaView>
    );
}

// ─── Styles ────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    // Category tabs
    categorySelector: {
        marginBottom: 8,
    },
    categoryList: {
        paddingHorizontal: 20,
        gap: 12,
        paddingBottom: 4,
    },
    categoryTabWrapper: {
        marginRight: 10,
    },
    categoryTabContent: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1.5,
        minWidth: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryTabText: {
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
        textAlign: 'center',
    },
    // Search bar
    toolbar: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    tvSearchBar: {
        paddingHorizontal: 0,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
    },
    // Grid
    list: {
        padding: 8,
    },
    // Cards
    card: {
        flex: 1 / 3,
        aspectRatio: Platform.isTV ? 16 / 9 : 0.68,
        margin: 6,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: '#0f1424',
    },
    posterContainer: {
        width: '100%',
        height: '100%',
    },
    poster: {
        width: '100%',
        height: '100%',
    },
    channelLogo: {
        width: '100%',
        height: '70%',
        marginTop: '5%',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
    },
    infoOverlay: {
        position: 'absolute',
        bottom: 8,
        left: 10,
        right: 10,
    },
    cardTitle: {
        color: '#fff',
        fontSize: Platform.isTV ? 16 : 14,
        fontFamily: 'Outfit_700Bold',
    },
    cardSubtitle: {
        fontSize: 11,
        color: '#94a3b8',
        fontFamily: 'Inter_400Regular',
        marginTop: 2,
    },
    fallbackIcon: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    liveIndicator: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 0, 0, 0.8)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
        marginRight: 6,
    },
    liveText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Outfit_700Bold',
    },
    favoriteButton: {
        position: 'absolute',
        top: 10,
        left: 10,
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        gap: 12,
    },
    emptyText: {
        fontSize: 20,
        fontFamily: 'Outfit_700Bold',
        marginTop: 12,
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
