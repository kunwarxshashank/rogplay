import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    Image,
    Alert,
    Modal,
    ActivityIndicator,
    ScrollView,
    Pressable,
    useWindowDimensions,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAddonsStore } from '@/store/addonsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useRouter, useFocusEffect } from 'expo-router';
import { TVFocusable } from '@/components/TVFocusable';
import { TVSearchBar } from '@/components/tv/TVSearchBar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useAuthStore } from '@/store/authStore';

const hexAlpha = (hex: string, alpha: number) => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return hex + a;
};

const FILTERS = ['All', 'Live TV', 'Stremio', 'Cinema', 'Movies', 'NSFW', 'Others'];

// Type color mapping
const TYPE_COLORS: Record<string, { color: string; gradient: [string, string]; icon: string }> = {
    livetv: { color: '#eab308', gradient: ['#eab308', '#fbbf24'], icon: 'live-tv' },
    live: { color: '#eab308', gradient: ['#eab308', '#fbbf24'], icon: 'live-tv' },
    movie: { color: '#3b82f6', gradient: ['#3b82f6', '#60a5fa'], icon: 'movie' },
    cinema: { color: '#8b5cf6', gradient: ['#8b5cf6', '#a78bfa'], icon: 'theaters' },
    stremio: { color: '#ec4899', gradient: ['#ec4899', '#f472b6'], icon: 'extension' },
    nsfw: { color: '#ef4444', gradient: ['#ef4444', '#f87171'], icon: 'explicit' },
    default: { color: '#64748b', gradient: ['#64748b', '#94a3b8'], icon: 'widgets' },
};

const getTypeConfig = (type?: string) => {
    if (!type) return TYPE_COLORS.default;
    const key = type.toLowerCase();
    return TYPE_COLORS[key] || TYPE_COLORS.default;
};

// Filter icon mapping
const FILTER_ICONS: Record<string, string> = {
    'All': 'apps',
    'Live TV': 'live-tv',
    'Stremio': 'extension',
    'Cinema': 'theaters',
    'Movies': 'movie',
    'NSFW': 'explicit',
    'Others': 'widgets',
};

export default function TVAddonsScreen() {
    const { addons, loadAddons, addAddon, removeAddon, isLoading, setActiveCinemaAddon } = useAddonsStore();
    const { theme } = useSettingsStore();
    const c = Colors[theme] || Colors.dark;
    const gradients = c.gradients || { primary: [c.primary, c.primary] };
    const router = useRouter();
    const { user } = useAuthStore();
    const isPremium = user?.isPremium || false;

    const [modalVisible, setModalVisible] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [adding, setAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('All');

    const { width: SCREEN_W } = useWindowDimensions();
    const SIDEBAR_W = 86;
    const H_PAD = 44;
    const GAP = 16;
    const COLS = 3;
    const usableW = SCREEN_W - SIDEBAR_W - H_PAD * 2;
    const CARD_W = (usableW - GAP * (COLS - 1)) / COLS;

    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadAddons();
        }, [])
    );

    const manualRefresh = async () => {
        setRefreshing(true);
        await loadAddons();
        setRefreshing(false);
    };

    useEffect(() => {
        loadAddons();
        const handleDeepLink = (event: { url: string }) => {
            let data = Linking.parse(event.url);
            if (data.path) {
                setNewUrl(`https://${data.path}`);
                setModalVisible(true);
            }
        };
        const sub = Linking.addEventListener('url', handleDeepLink);
        return () => sub.remove();
    }, []);

    const handleAdd = async () => {
        if (!newUrl) return;
        setAdding(true);
        try {
            await addAddon(newUrl);
            setModalVisible(false);
            setNewUrl('');
        } catch (error) {
            Alert.alert("Error", (error as Error).message);
        } finally {
            setAdding(false);
        }
    };

    const handleOpenAddon = (item: any) => {
        setActiveCinemaAddon(item.url || item.source);
        router.push('/');
    };

    const filteredAddons = useMemo(() => {
        return addons.filter(item => {
            const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase());
            const type = item.type?.toLowerCase() || 'others';
            let matchesFilter = true;

            if (selectedFilter !== 'All') {
                if (selectedFilter === 'Live TV') matchesFilter = type.includes('tv') || type.includes('live');
                else if (selectedFilter === 'Stremio') matchesFilter = type === 'stremio' || !!item.manifest;
                else if (selectedFilter === 'Cinema') matchesFilter = type.includes('cinema');
                else if (selectedFilter === 'Movies') matchesFilter = type.includes('movie');
                else if (selectedFilter === 'NSFW') matchesFilter = type.includes('nsfw');
                else if (selectedFilter === 'Others') {
                    const isKnown = type.includes('tv') || type.includes('live') || type === 'stremio' ||
                        !!item.manifest || type.includes('cinema') || type.includes('movie') ||
                        type.includes('nsfw');
                    matchesFilter = !isKnown;
                }
            }

            return matchesSearch && matchesFilter;
        });
    }, [addons, searchQuery, selectedFilter]);

    /* ── Addon Card ─────────────────────── */
    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const typeConfig = getTypeConfig(item.type);
        return (
            <View style={[styles.cardOuter, { width: CARD_W }]}>
                {/* Main card area — focusable */}
                <TVFocusable
                    style={styles.cardFocusWrap}
                    onPress={() => handleOpenAddon(item)}
                    onLongPress={() => Alert.alert('Remove Addon?', `Remove ${item.title}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', onPress: () => removeAddon(item.source) }
                    ])}
                    nativeID={`tv-addon-${index}`}
                    focusedBorderColor={typeConfig.color}
                    focusedScale={1.04}
                >
                    {({ focused }) => (
                        <View style={[styles.card, {
                            backgroundColor: focused ? hexAlpha(typeConfig.color, 0.06) : 'rgba(255,255,255,0.025)',
                            borderColor: focused ? typeConfig.color : 'rgba(255,255,255,0.06)',
                        }]}>
                            {/* Top accent bar */}
                            <LinearGradient
                                colors={typeConfig.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.cardAccentBar}
                            />

                            {/* Subtle glow */}
                            <View style={[styles.cardGlow, { backgroundColor: hexAlpha(typeConfig.color, 0.05) }]} />

                            <View style={styles.cardBody}>
                                {/* Logo */}
                                <View style={[styles.logoWrap, { borderColor: hexAlpha(typeConfig.color, 0.2) }]}>
                                    {item.logo ? (
                                        <Image
                                            source={{ uri: item.logo }}
                                            style={styles.logo}
                                        />
                                    ) : (
                                        <View style={[styles.logoPlaceholder, { backgroundColor: hexAlpha(typeConfig.color, 0.12) }]}>
                                            <MaterialIcons name={typeConfig.icon as any} size={28} color={typeConfig.color} />
                                        </View>
                                    )}
                                    {item.type === 'nsfw' && (
                                        <View style={styles.nsfwBadge}>
                                            <Text style={styles.nsfwText}>18+</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Title + type badge */}
                                <View style={styles.cardBottom}>
                                    <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    {item.description ? (
                                        <Text style={[styles.cardDesc, { color: c.textSecondary }]} numberOfLines={1}>
                                            {item.description}
                                        </Text>
                                    ) : null}
                                    <View style={styles.cardFooter}>
                                        <View style={[styles.typeBadge, { backgroundColor: hexAlpha(typeConfig.color, 0.12) }]}>
                                            <MaterialIcons name={typeConfig.icon as any} size={11} color={typeConfig.color} />
                                            <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>
                                                {item.type?.toUpperCase() || 'OTHER'}
                                            </Text>
                                        </View>
                                        <View style={styles.openIndicator}>
                                            <MaterialIcons name="open-in-new" size={13} color={c.textSecondary} />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </TVFocusable>

                {/* Delete button — independently focusable */}
                <TVFocusable
                    style={styles.deleteBtn}
                    onPress={() => Alert.alert('Remove Addon?', `Remove ${item.title}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', onPress: () => removeAddon(item.source) }
                    ])}
                    nativeID={`tv-addon-del-${index}`}
                    focusedBackgroundColor={hexAlpha(c.error || '#f43f5e', 0.15)}
                    focusedScale={1.08}
                    autoFlex={false}
                >
                    {({ focused: delFocused }) => (
                        <View style={[styles.deleteBtnInner, {
                            backgroundColor: delFocused ? hexAlpha(c.error || '#f43f5e', 0.12) : 'rgba(255,255,255,0.04)',
                            borderColor: delFocused ? (c.error || '#f43f5e') : 'rgba(255,255,255,0.06)',
                        }]}>
                            <MaterialIcons name="delete-outline" size={16} color={delFocused ? c.error : c.textSecondary} />
                        </View>
                    )}
                </TVFocusable>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* ── Header ──────────────────────────────── */}
            <View style={[styles.header, { paddingHorizontal: H_PAD }]}>
                <View style={styles.headerLeft}>
                    <View style={styles.headerIconWrap}>
                        <LinearGradient
                            colors={gradients.primary as any}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <MaterialIcons name="extension" size={22} color="#fff" />
                    </View>
                    <View>
                        <Text style={[styles.headerTitle, { color: c.text }]}>Addons</Text>
                        <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
                            Extend your streaming capabilities
                        </Text>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    <TVFocusable
                        onPress={manualRefresh}
                        style={styles.refreshBtnWrap}
                        nativeID="tv-addon-refresh"
                        focusedScale={1.1}
                        autoFlex={false}
                    >
                        {({ focused }) => (
                            <View style={[styles.refreshBtn, { backgroundColor: focused ? hexAlpha(c.primary, 0.15) : 'rgba(255,255,255,0.04)' }]}>
                                {refreshing ? (
                                    <ActivityIndicator size="small" color={c.primary} />
                                ) : (
                                    <MaterialIcons name="refresh" size={20} color={focused ? c.primary : c.textSecondary} />
                                )}
                            </View>
                        )}
                    </TVFocusable>

                    {isPremium && (
                        <View style={[styles.headerBadge, { backgroundColor: hexAlpha(c.success || '#10b981', 0.1) }]}>
                            <MaterialIcons name="cloud-done" size={14} color={c.success || '#10b981'} />
                            <Text style={[styles.headerBadgeText, { color: c.success || '#10b981' }]}>
                                Cloud Sync
                            </Text>
                        </View>
                    )}

                    {/* Search bar in header */}
                    <View style={styles.searchBox}>
                        <TVSearchBar
                            onSearch={setSearchQuery}
                            value={searchQuery}
                            placeholder="Search addons..."
                            containerStyle={styles.searchBarOverride}
                            nativeID="tv-addon-search"
                        />
                    </View>
                </View>
            </View>

            {/* ── Filter Chips + Add Addon Row ─────────── */}
            <View style={[styles.filtersRow, { paddingHorizontal: H_PAD }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent} style={styles.filtersScroll}>
                    {FILTERS.map((filter, index) => {
                        const isActive = selectedFilter === filter;
                        return (
                            <TVFocusable
                                key={filter}
                                style={[
                                    styles.filterChip,
                                    isActive
                                        ? { backgroundColor: c.primary, borderColor: c.primary }
                                        : { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' }
                                ]}
                                onPress={() => setSelectedFilter(filter)}
                                nativeID={`tv-filter-${index}`}
                                hasTVPreferredFocus={index === 0}
                                focusedBackgroundColor={isActive ? c.primary : hexAlpha(c.primary, 0.12)}
                                focusedScale={1.02}
                                autoFlex={false}
                            >
                                <View style={styles.filterChipContent}>
                                    <MaterialIcons
                                        name={FILTER_ICONS[filter] as any}
                                        size={13}
                                        color={isActive ? '#fff' : c.textSecondary}
                                    />
                                    <Text style={[
                                        styles.filterText,
                                        { color: isActive ? '#fff' : c.textSecondary }
                                    ]}>{filter}</Text>
                                </View>
                            </TVFocusable>
                        );
                    })}
                </ScrollView>

                {/* Add Addon button — right side of filters */}
                <TVFocusable
                    style={styles.addBtnWrap}
                    onPress={() => setModalVisible(true)}
                    nativeID="tv-addon-add"
                    focusedScale={1.05}
                    autoFlex={false}
                >
                    {({ focused }) => (
                        <View style={[styles.addBtnOuter, {
                            backgroundColor: focused ? c.primary : 'rgba(255,255,255,0.04)',
                            borderColor: focused ? c.primary : 'rgba(255,255,255,0.08)',
                        }]}>
                            <MaterialIcons name="add" size={16} color={focused ? '#fff' : c.textSecondary} />
                            <Text style={[styles.addBtnText, { color: focused ? '#fff' : c.textSecondary }]}>Add Addons</Text>
                        </View>
                    )}
                </TVFocusable>
            </View>

            {/* ── Content Grid ─────────────────────────── */}
            <View style={styles.gridArea}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <View style={[styles.loadingCard, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                            <ActivityIndicator size="large" color={c.primary} />
                            <Text style={[styles.loadingTitle, { color: c.text }]}>Loading Addons</Text>
                            <Text style={[styles.loadingSubtitle, { color: c.textSecondary }]}>
                                Fetching your installed addon data...
                            </Text>
                        </View>
                    </View>
                ) : (
                    <FlatList
                        data={filteredAddons}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => `${item.source}-${index}`}
                        numColumns={COLS}
                        key={`grid-${COLS}`}
                        contentContainerStyle={[styles.gridContent, { paddingHorizontal: H_PAD }]}
                        columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <View style={[styles.emptyIconCircle, { backgroundColor: hexAlpha(c.primary, 0.08) }]}>
                                    <LinearGradient
                                        colors={gradients.primary as any}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[StyleSheet.absoluteFill, { borderRadius: 50, opacity: 0.15 }]}
                                    />
                                    <MaterialIcons name="extension" size={48} color={c.primary} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: c.text }]}>No Addons Found</Text>
                                <Text style={[styles.emptySubtitle, { color: c.textSecondary }]}>
                                    {searchQuery
                                        ? 'Try a different search or filter'
                                        : 'Tap the "Add Addon" button to install your first addon'}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* ── Add Addon Modal ──────────────────────── */}
            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <Pressable style={[styles.modalCard, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => { }}>
                        {/* Modal header */}
                        <View style={styles.modalHeaderRow}>
                            <View style={[styles.modalIconWrap, { backgroundColor: hexAlpha(c.primary, 0.12) }]}>
                                <MaterialIcons name="add-circle-outline" size={22} color={c.primary} />
                            </View>
                            <View>
                                <Text style={[styles.modalTitle, { color: c.text }]}>Add New Addon</Text>
                                <Text style={[styles.modalSubtitle, { color: c.textSecondary }]}>
                                    Enter a JSON or Stremio manifest URL
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.modalDivider, { backgroundColor: c.border }]} />

                        {/* URL Input */}
                        <View style={styles.inputWrapper}>
                            <View style={[styles.inputContainer, {
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                borderColor: 'rgba(255,255,255,0.1)',
                            }]}>
                                <MaterialIcons name="link" size={20} color={c.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: c.text }]}
                                    placeholder="https://example.com/addon.json"
                                    placeholderTextColor={c.textSecondary}
                                    value={newUrl}
                                    onChangeText={setNewUrl}
                                    autoFocus
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                {newUrl.length > 0 && (
                                    <Pressable onPress={() => setNewUrl('')}>
                                        <MaterialIcons name="close" size={18} color={c.textSecondary} />
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        {/* Action buttons */}
                        <View style={styles.modalActions}>
                            <TVFocusable
                                style={styles.modalActionBtn}
                                onPress={() => setModalVisible(false)}
                                focusedBackgroundColor="rgba(255,255,255,0.08)"
                                focusedScale={1.0}
                                autoFlex={false}
                                nativeID="tv-addon-cancel"
                            >
                                {({ focused }) => (
                                    <View style={[styles.cancelBtn, {
                                        backgroundColor: focused ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                                        borderColor: focused ? c.textSecondary : 'rgba(255,255,255,0.08)',
                                    }]}>
                                        <Text style={[styles.cancelBtnText, { color: c.textSecondary }]}>Cancel</Text>
                                    </View>
                                )}
                            </TVFocusable>

                            <TVFocusable
                                style={styles.modalActionBtn}
                                onPress={handleAdd}
                                hasTVPreferredFocus
                                focusedScale={1.02}
                                autoFlex={false}
                                nativeID="tv-addon-install"
                            >
                                {({ focused }) => (
                                    <View style={styles.installBtnOuter}>
                                        <LinearGradient
                                            colors={focused ? gradients.primary as any : [c.primary, c.primary]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                                        />
                                        {adding ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <View style={styles.installBtnContent}>
                                                <MaterialIcons name="download" size={18} color="#fff" />
                                                <Text style={styles.installBtnText}>Install Addon</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </TVFocusable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },

    /* ── Header ────────────────────────────── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    headerSubtitle: {
        fontSize: 13,
        marginTop: 2,
        opacity: 0.7,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10,
    },
    headerBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    addBtnWrap: {
        borderRadius: 10,
    },
    addBtnOuter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    addBtnText: {
        fontSize: 11,
        fontWeight: '700',
    },
    refreshBtnWrap: {
        borderRadius: 10,
    },
    refreshBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },

    /* ── Search Box (in header) ─────────── */
    searchBox: {
        width: 300,
    },
    searchBarOverride: {
        paddingHorizontal: 0,
        marginVertical: 0,
        width: '100%',
    },

    /* ── Filter Chips ───────────────────── */
    filtersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 12,
        gap: 10,
    },
    filtersScroll: {
        flex: 1,
    },
    filtersContent: {
        gap: 6,
        paddingRight: 10,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    filterChipContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    filterText: {
        fontSize: 11,
        fontWeight: '700',
    },

    /* ── Grid ──────────────────────────────── */
    gridArea: {
        flex: 1,
    },
    gridContent: {
        paddingTop: 4,
        paddingBottom: 40,
    },

    /* ── Addon Card ──────────────────── */
    cardOuter: {
        position: 'relative',
    },
    cardFocusWrap: {
        borderRadius: 20,
    },
    card: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    cardAccentBar: {
        height: 3,
        width: '100%',
    },
    cardGlow: {
        position: 'absolute',
        top: -30,
        left: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    cardBody: {
        flex: 1,
        padding: 18,
        justifyContent: 'space-between',
    },
    logoWrap: {
        width: 52,
        height: 52,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    logoPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nsfwBadge: {
        position: 'absolute',
        top: -3,
        right: -3,
        backgroundColor: '#ef4444',
        borderRadius: 6,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    nsfwText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '900',
    },
    deleteBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        borderRadius: 10,
        zIndex: 10,
    },
    deleteBtnInner: {
        width: 32,
        height: 32,
        borderRadius: 10,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardBottom: {
        marginTop: 16,
        gap: 4,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    cardDesc: {
        fontSize: 12,
        opacity: 0.6,
        lineHeight: 16,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    openIndicator: {
        opacity: 0.5,
    },

    /* ── Loading ───────────────────────────── */
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingCard: {
        alignItems: 'center',
        paddingHorizontal: 50,
        paddingVertical: 40,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    loadingTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginTop: 20,
        letterSpacing: 0.3,
    },
    loadingSubtitle: {
        fontSize: 13,
        marginTop: 8,
        opacity: 0.7,
    },

    /* ── Empty State ───────────────────────── */
    emptyContainer: {
        paddingTop: 80,
        alignItems: 'center',
    },
    emptyIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '800',
        marginTop: 20,
        letterSpacing: 0.2,
    },
    emptySubtitle: {
        fontSize: 14,
        marginTop: 8,
        opacity: 0.6,
        textAlign: 'center',
        maxWidth: 400,
    },

    /* ── Modal ─────────────────────────────── */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.88)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        width: 520,
        borderRadius: 24,
        borderWidth: 1,
        paddingVertical: 30,
        paddingHorizontal: 32,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 22,
    },
    modalIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    modalSubtitle: {
        fontSize: 12,
        marginTop: 2,
        opacity: 0.7,
    },
    modalDivider: {
        height: 1,
        width: '100%',
        marginBottom: 20,
        opacity: 0.4,
    },
    inputWrapper: {
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 14,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        paddingVertical: 14,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalActionBtn: {
        flex: 1,
        borderRadius: 14,
    },
    cancelBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
    installBtnOuter: {
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    installBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    installBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
