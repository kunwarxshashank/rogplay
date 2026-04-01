import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, TextInput, Alert, ActivityIndicator, ScrollView, Platform, BackHandler, RefreshControl } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAddonsStore } from '@/store/addonsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { BrowserAddonSkeleton } from '@/components/Skeleton';
import { AddonsFTUE } from '@/components/addons/AddonsFTUE';


const FILTERS = ['All', 'Live TV', 'Stremio', 'Cinema', 'Movies', 'NSFW', 'Others'];

function useAddonsLogic() {
    const { addons, loadAddons, addAddon, removeAddon, isLoading } = useAddonsStore();
    const theme = useSettingsStore(state => state.theme);
    const activeColors = Colors[theme] || Colors.dark;
    const { user } = useAuthStore();
    const isPremium = user?.isPremium || false;

    const [modalVisible, setModalVisible] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [adding, setAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('All');
    const router = useRouter();

    // Check for deep link on mount
    useEffect(() => {
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

    // Refresh addons on focus for cross-device sync
    useFocusEffect(
        useCallback(() => {
            loadAddons();
        }, [])
    );

    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = async () => {
        setRefreshing(true);
        await loadAddons();
        setRefreshing(false);
    };

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

    const handleOpenAddon = (item: any) => {
        if (item.manifest) {
            router.push({
                pathname: '/stremio-browser',
                params: {
                    url: item.url,
                    title: item.title,
                    manifest: JSON.stringify(item.manifest)
                }
            });
            return;
        }

        if (item.type === 'cinema') {
            Alert.alert('Cinema Addon', "You can't directly access this addon. It is accessible via the Cinema section.");
            return;
        }

        // Navigate to Browser
        // @ts-ignore
        router.push({
            pathname: '/addon-browser',
            params: {
                url: item.url,
                title: item.title,
                type: item.type
            }
        });
    };

    const hasSeenAddonFTUE = useSettingsStore(state => state.hasSeenAddonFTUE);
    const setHasSeenAddonFTUE = useSettingsStore(state => state.setHasSeenAddonFTUE);

    return {
        addons, activeColors, modalVisible, setModalVisible, newUrl, setNewUrl, adding, setAdding,
        searchQuery, setSearchQuery, selectedFilter, setSelectedFilter, router, isLoading, filteredAddons,
        handleAdd, handleOpenAddon, removeAddon, theme, isPremium, hasSeenAddonFTUE, setHasSeenAddonFTUE,
        refreshing, onRefresh
    };
}

export function AddonsMobile() {
    const {
        addons, activeColors, modalVisible, setModalVisible, newUrl, setNewUrl, adding,
        searchQuery, setSearchQuery, selectedFilter, setSelectedFilter, isLoading, filteredAddons,
        handleAdd, handleOpenAddon, removeAddon, theme, isPremium, hasSeenAddonFTUE, setHasSeenAddonFTUE,
        refreshing, onRefresh
    } = useAddonsLogic();

    const isFtueVisible = !hasSeenAddonFTUE && Platform.OS !== 'web';

    useEffect(() => {
        if (!isFtueVisible || Platform.OS !== 'android') return;

        const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
            setHasSeenAddonFTUE(true);
            return true;
        });

        return () => backSubscription.remove();
    }, [isFtueVisible, setHasSeenAddonFTUE]);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}
            onPress={() => handleOpenAddon(item)}
            activeOpacity={0.8}
        >
            <View style={styles.logoContainer}>
                <Image
                    source={{ uri: item.logo || 'https://via.placeholder.com/60' }}
                    style={styles.logo}
                />
                {item.type === 'nsfw' && (
                    <View style={styles.nsfwOverlay}>
                        <MaterialIcons name="explicit" size={16} color="#fff" />
                    </View>
                )}
            </View>
            <View style={styles.info}>
                <Text style={[styles.name, { color: activeColors.text }]}>{item.title}</Text>
                <Text style={[styles.desc, { color: activeColors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
                <View style={[styles.badge,
                item.type === 'livetv' ? { backgroundColor: 'rgba(234, 179, 8, 0.15)' } :
                    item.type === 'movie' ? { backgroundColor: 'rgba(59, 130, 246, 0.15)' } :
                        item.type === 'cinema' ? { backgroundColor: 'rgba(139, 92, 246, 0.15)' } :
                            item.type === 'stremio' ? { backgroundColor: 'rgba(236, 72, 153, 0.15)' } :
                                { backgroundColor: 'rgba(148, 163, 184, 0.15)' }
                ]}>
                    <Text style={[styles.badgeText,
                    item.type === 'livetv' ? { color: '#eab308' } :
                        item.type === 'movie' ? { color: '#3b82f6' } :
                            item.type === 'cinema' ? { color: '#8b5cf6' } :
                                item.type === 'stremio' ? { color: '#ec4899' } :
                                    { color: activeColors.textSecondary }
                    ]}>{item.type?.toUpperCase() || 'OTHER'}</Text>
                </View>
            </View>
            <TouchableOpacity onPress={() => removeAddon(item.source)} style={styles.deleteBtn}>
                <MaterialIcons name="delete-outline" size={24} color={activeColors.error} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <View style={styles.titleRow}>
                        <Text style={[styles.headerTitle, { color: activeColors.text }]}>Addons</Text>
                        <View style={[styles.titleDot, { backgroundColor: activeColors.primary }]} />
                    </View>
                    <Text style={[styles.headerSubtitle, { color: activeColors.textSecondary }]}>{addons.length} Extensions Installed</Text>
                    {isPremium && (
                        <View style={styles.syncIndicator}>
                            <MaterialIcons name="cloud-done" size={14} color={activeColors.success} />
                            <Text style={[styles.syncText, { color: activeColors.success }]}>Cloud Sync Active</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: activeColors.primary, shadowColor: activeColors.primary }]}
                    onPress={() => setModalVisible(true)}
                >
                    <MaterialIcons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.toolbar}>
                <View style={[styles.searchBar, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                    <MaterialIcons name="search" size={20} color={activeColors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: activeColors.text }]}
                        placeholder="Search addons..."
                        placeholderTextColor={activeColors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <View style={{ height: 48, marginBottom: 8 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {FILTERS.map(filter => (
                        <TouchableOpacity
                            key={filter}
                            style={[
                                styles.filterChip,
                                { backgroundColor: activeColors.surface, borderColor: activeColors.border },
                                selectedFilter === filter && { backgroundColor: activeColors.primary + '15', borderColor: activeColors.primary }
                            ]}
                            onPress={() => setSelectedFilter(filter)}
                        >
                            <Text style={[
                                styles.filterText,
                                { color: activeColors.textSecondary },
                                selectedFilter === filter && { color: activeColors.primary }
                            ]}>{filter}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {isLoading && addons.length === 0 ? (
                <ScrollView contentContainerStyle={styles.list}>
                    {Array.from({ length: 5 }).map((_, index) => (
                        <BrowserAddonSkeleton key={index} />
                    ))}
                </ScrollView>
            ) : (
                <FlatList
                    data={filteredAddons}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `${item.source}-${index}`}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[activeColors.primary]}
                            tintColor={activeColors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialIcons name="extension-off" size={64} color={activeColors.textSecondary + '40'} />
                            <Text style={[styles.emptyText, { color: activeColors.textSecondary }]}>No addons found</Text>
                            <TouchableOpacity
                                style={[styles.emptyBtn, { borderColor: activeColors.primary }]}
                                onPress={() => setModalVisible(true)}
                            >
                                <Text style={{ color: activeColors.primary, fontWeight: '600' }}>Install Addon</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            <Modal visible={modalVisible} transparent animationType="fade">
                <BlurView intensity={30} tint={theme.includes('light') ? 'light' : 'dark'} style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: activeColors.text }]}>Add Addon</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <MaterialIcons name="close" size={20} color={activeColors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={[styles.input, { backgroundColor: activeColors.background, color: activeColors.text, borderColor: activeColors.border }]}
                            placeholder="Enter Addon URL (JSON)"
                            placeholderTextColor={activeColors.textSecondary}
                            value={newUrl}
                            onChangeText={setNewUrl}
                            autoFocus
                            autoCapitalize="none"
                        />
                        <Text style={[styles.hint, { color: activeColors.textSecondary }]}>Supported: JSON links, rogplay:// links</Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: activeColors.primary }]} onPress={handleAdd} disabled={adding}>
                                {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Install Expansion</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </BlurView>
            </Modal>

            {isFtueVisible && (
                <Modal
                    visible
                    transparent
                    animationType="none"
                    onRequestClose={() => setHasSeenAddonFTUE(true)}
                >
                    <AddonsFTUE onDismiss={() => setHasSeenAddonFTUE(true)} />
                </Modal>
            )}
        </SafeAreaView>
    );
}



export default function AddonsScreen() {
    return <AddonsMobile />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#060912',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    titleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginLeft: 4,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Outfit_700Bold',
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        marginTop: 2,
    },
    syncIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    syncText: {
        fontSize: 11,
        fontFamily: 'Outfit_600SemiBold',
        marginLeft: 4,
    },
    addBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    toolbar: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f1424',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        fontFamily: 'Outfit_500Medium',
    },
    filterScroll: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        backgroundColor: '#0f1424',
    },
    filterText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
    },
    list: {
        padding: 20,
        paddingBottom: 120,
    },
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        backgroundColor: '#0f1424',
    },
    logoContainer: {
        width: 60,
        height: 60,
        position: 'relative',
    },
    logo: {
        width: 60,
        height: 60,
        borderRadius: 14,
        backgroundColor: '#1a1a1a',
    },
    nsfwOverlay: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#ef4444',
        borderRadius: 8,
        padding: 2,
        borderWidth: 2,
        borderColor: '#000',
    },
    info: {
        flex: 1,
        marginLeft: 16,
    },
    name: {
        fontSize: 18,
        fontFamily: 'Outfit_600SemiBold',
    },
    desc: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4,
        fontFamily: 'Inter_400Regular',
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 10,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.5,
    },
    deleteBtn: {
        padding: 8,
        marginLeft: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontFamily: 'Outfit_600SemiBold',
        marginTop: 16,
        textAlign: 'center',
    },
    emptyBtn: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        backgroundColor: '#0f1424',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        padding: 16,
        borderRadius: 16,
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
        borderWidth: 1,
        marginBottom: 12,
        backgroundColor: '#1a1f35',
    },
    hint: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
        marginBottom: 24,
    },
    modalActions: {
        width: '100%',
    },
    confirmBtn: {
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
    }
});

