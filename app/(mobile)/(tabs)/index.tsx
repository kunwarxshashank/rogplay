import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, RefreshControl, Platform, Modal, TextInput, Image, Pressable, ActivityIndicator, BackHandler
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ListItemSkeleton, FolderSkeleton, GridSkeleton } from '@/components/Skeleton';
import { useHomeLogic, VideoWithThumbnail, FolderType } from '@/hooks/useHomeLogic';
import BottomMediaPill from '@/components/BottomMediaPill';
import { useFocusEffect } from 'expo-router';

// Stable hash for mock size
const getMockSize = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const size = (Math.abs(hash % 480) + 20) / 10;
    return `${size.toFixed(1)}MB`;
};

// Dynamic Greetings
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
};

// Pastel colors for folder glow
const FOLDER_COLORS = ['#FF9A9E', '#FECFEF', '#A18CD1', '#FBC2EB', '#84FAB0', '#8FD3F4', '#FFC3A0'];

const VideoItem = React.memo(({
    item, onPress, onLongPress, currentColors
}: {
    item: VideoWithThumbnail, onPress: (uri: string, filename: string) => void, onLongPress: (item: VideoWithThumbnail) => void, currentColors: any
}) => {
    const sizeMb = getMockSize(item.id);

    return (
        <TouchableOpacity
            style={styles.videoListItem}
            onPress={() => onPress(item.uri, item.filename)}
            onLongPress={() => onLongPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.videoThumbWrapper}>
                {item.uri ? (
                    <Image source={{ uri: item.uri }} style={styles.videoThumb} />
                ) : (
                    <View style={[styles.videoThumbPlaceholder, { backgroundColor: currentColors.surface }]}>
                        <MaterialIcons name="videocam" size={32} color={currentColors.textSecondary} />
                    </View>
                )}
                <View style={styles.videoDurationBadge}>
                    <Text style={styles.videoDurationText}>
                        {Math.floor(item.duration / 60)}:{Math.floor(item.duration % 60).toString().padStart(2, '0')}
                    </Text>
                </View>
                <View style={styles.videoProgressBarBg}>
                    <View style={[styles.videoProgressBarFill, { width: '40%', backgroundColor: currentColors.primary }]} />
                </View>
            </View>
            <View style={styles.videoListItemInfo}>
                <View style={styles.videoListTitleRow}>
                    <Text style={[styles.videoListFilename, { color: currentColors.text }]} numberOfLines={2}>{item.filename}</Text>
                    <TouchableOpacity onPress={() => onLongPress(item)}>
                        <MaterialIcons name="more-vert" size={22} color={currentColors.textSecondary} />
                    </TouchableOpacity>
                </View>
                <Text style={[styles.videoListMeta, { color: currentColors.textSecondary }]}>{sizeMb} • {new Date(item.modificationTime * 1000).toLocaleDateString()}</Text>
            </View>
        </TouchableOpacity>
    );
});

const FolderItem = React.memo(({
    item, index, onPress, currentColors
}: {
    item: FolderType, index: number, onPress: (folder: FolderType) => void, currentColors: any
}) => {
    return (
        <TouchableOpacity
            style={[styles.premiumFolderCard, { backgroundColor: currentColors.surface, borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }]}
            onPress={() => onPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.premiumFolderIconHeader}>
                <View style={[styles.premiumFolderIconWrapper, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                    <Ionicons name="folder-open" size={26} color={currentColors.primary} />
                </View>
            </View>

            <View style={styles.premiumFolderInfo}>
                <Text style={[styles.premiumFolderName, { color: currentColors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.premiumFolderMeta, { color: currentColors.textSecondary }]}>{item.count} files</Text>
            </View>
        </TouchableOpacity>
    );
});

export function Home() {
    const logic = useHomeLogic();
    const {
        theme, currentColors, videos, filteredVideos, loading, refreshing, deviceStorage, searchQuery, setSearchQuery, showSearch, setShowSearch,
        selectedVideo, showOptionsModal, setShowOptionsModal, showRenameModal, setShowRenameModal, newFilename, setNewFilename,
        showInfoModal, setShowInfoModal, selectedVideoSize, viewMode, setViewMode, folders, selectedFolder, setSelectedFolder,
        sortBy, setSortBy, sortOrder, setSortOrder, showSortModal, setShowSortModal,
        router, onRefresh, handlePlay, showOptions, handleDelete, handleRename, confirmRename, showInfo, formatDuration,
        hasNextPage, isFetchingNextPage, loadMoreVideos, foldersLoading
    } = logic;

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (selectedFolder) {
                    setSelectedFolder(null);
                    return true;
                }
                return false;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [selectedFolder])
    );

    // Greeting
    const greeting = useMemo(() => getGreeting(), []);

    // Storage formatting
    const totalGB = (deviceStorage.total / (1024 ** 3)).toFixed(1);
    const freeGB = (deviceStorage.free / (1024 ** 3)).toFixed(1);
    const usedGB = (Number(totalGB) - Number(freeGB)).toFixed(1);
    const usedPercentage = Math.min((Number(usedGB) / Number(totalGB)) * 100, 100);

    const memoizedHandlePlay = useCallback((uri: string, filename: string) => { handlePlay(uri, filename); }, [handlePlay]);
    const memoizedShowOptions = useCallback((item: VideoWithThumbnail) => { showOptions(item); }, [showOptions]);
    const memoizedSetSelectedFolder = useCallback((folder: FolderType) => { setSelectedFolder(folder); }, [setSelectedFolder]);

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.headerTopRow}>
                <View>
                    <Text style={[styles.headerGreeting, { color: currentColors.textSecondary }]}>{greeting}</Text>
                    <Text style={[styles.headerTitle, { color: currentColors.text }]}>My Media</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={[styles.iconButton, { backgroundColor: currentColors.surface }]}>
                        <Ionicons name="search" size={22} color={currentColors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/settings')} style={[styles.iconButton, { backgroundColor: currentColors.surface }]}>
                        <Ionicons name="settings-outline" size={22} color={currentColors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {showSearch && (
                <View style={[styles.searchBar, { backgroundColor: currentColors.surface }]}>
                    <Ionicons name="search" size={20} color={currentColors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[styles.searchInput, { color: currentColors.text }]}
                        placeholder="Search videos..."
                        placeholderTextColor={currentColors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                </View>
            )}

            <View style={[styles.togglePillContainer, { backgroundColor: currentColors.surface }]}>
                <TouchableOpacity
                    style={[styles.togglePill, viewMode === 'folder' && { backgroundColor: currentColors.primary }]}
                    onPress={() => { setViewMode('folder'); setSelectedFolder(null); }}
                >
                    <Text style={[styles.togglePillText, viewMode === 'folder' ? { color: '#fff' } : { color: currentColors.textSecondary }]}>Folders</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.togglePill, viewMode === 'video' && { backgroundColor: currentColors.primary }]}
                    onPress={() => { setViewMode('video'); setSelectedFolder(null); }}
                >
                    <Text style={[styles.togglePillText, viewMode === 'video' ? { color: '#fff' } : { color: currentColors.textSecondary }]}>Videos</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStorageCard = () => (
        <View style={[styles.storageCard, { backgroundColor: currentColors.surface }]}>
            <LinearGradient colors={['rgba(255,255,255,0.05)', 'transparent']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.storageHeader}>
                <View style={styles.storageIconWrapper}>
                    <Ionicons name="server" size={24} color={currentColors.primary} />
                </View>
                <View style={styles.storageTextWrapper}>
                    <Text style={[styles.storageTitle, { color: currentColors.text }]}>Device Storage</Text>
                    <Text style={[styles.storageSubtitle, { color: currentColors.textSecondary }]}>{usedGB} GB of {totalGB} GB Used</Text>
                </View>
                <TouchableOpacity onPress={() => setShowSortModal(true)} style={[styles.iconButton, { backgroundColor: 'transparent' }]}>
                    <Ionicons name="filter" size={22} color={currentColors.textSecondary} />
                </TouchableOpacity>
            </View>
            <View style={styles.storageProgressBarBg}>
                <View style={[styles.storageProgressBarFill, { width: `${usedPercentage}%`, backgroundColor: currentColors.primary }]} />
            </View>
        </View>
    );

    const renderItem = useCallback(({ item, index }: { item: any, index: number }) => {
        if (viewMode === 'folder' && !selectedFolder) {
            return <FolderItem item={item} index={index} onPress={memoizedSetSelectedFolder} currentColors={currentColors} />;
        }
        return <VideoItem item={item} onPress={memoizedHandlePlay} onLongPress={memoizedShowOptions} currentColors={currentColors} />;
    }, [viewMode, selectedFolder, memoizedSetSelectedFolder, memoizedHandlePlay, memoizedShowOptions, currentColors]);

    const listData = viewMode === 'folder' && !selectedFolder ? folders : filteredVideos;
    const isFolderView = viewMode === 'folder' && !selectedFolder;

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background }]}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {renderHeader()}

                {selectedFolder && (
                    <TouchableOpacity onPress={() => setSelectedFolder(null)} style={[styles.breadcrumb, { backgroundColor: currentColors.surface }]}>
                        <Ionicons name="folder-open" size={18} color={currentColors.primary} />
                        <Text style={[styles.breadcrumbText, { color: currentColors.text }]}>{selectedFolder.name}</Text>
                        <Ionicons name="close-circle" size={20} color={currentColors.textSecondary} />
                    </TouchableOpacity>
                )}

                <FlashList
                    key={isFolderView ? `2-col-${foldersLoading}` : `1-col-${loading}`}
                    data={(isFolderView ? foldersLoading : loading) ? Array.from({ length: 8 }).map((_, i) => ({ isSkeleton: true, id: `skel-${i}` })) as any : listData as any}
                    renderItem={({ item, index }) => {
                        if (item.isSkeleton) {
                            return isFolderView ? <View style={{ padding: 8 }}><FolderSkeleton /></View> : <View style={{ padding: 8, paddingHorizontal: 16 }}><ListItemSkeleton /></View>;
                        }
                        if (viewMode === 'folder' && !selectedFolder) {
                            return <FolderItem item={item} index={index} onPress={memoizedSetSelectedFolder} currentColors={currentColors} />;
                        }
                        return <VideoItem item={item} onPress={memoizedHandlePlay} onLongPress={memoizedShowOptions} currentColors={currentColors} />;
                    }}
                    keyExtractor={(item: any) => item.id || item.uri}
                    contentContainerStyle={styles.listContent}
                    numColumns={isFolderView ? 2 : 1}
                    estimatedItemSize={isFolderView ? 160 : 100}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={(!selectedFolder && viewMode === 'folder') ? renderStorageCard : null}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentColors.primary} />}
                    onEndReached={loadMoreVideos}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={isFetchingNextPage ? <View style={{ padding: 20 }}><ActivityIndicator size="small" color={currentColors.primary} /></View> : null}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="videocam-outline" size={64} color={currentColors.textSecondary} />
                            <Text style={[styles.emptyStateText, { color: currentColors.text }]}>No Media Found</Text>
                        </View>
                    }
                />
            </SafeAreaView>

            {/* Modals are shared but here duplicated for cleaner separation if desired, or can be extracted */}
            <Modal visible={showOptionsModal} transparent animationType="fade" onRequestClose={() => setShowOptionsModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowOptionsModal(false)}>
                    <View style={[styles.modalContent, { backgroundColor: currentColors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: currentColors.text }]} numberOfLines={1}>{selectedVideo?.filename}</Text>
                            <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                                <MaterialIcons name="close" size={24} color={currentColors.text} />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.modalOption} onPress={() => { setShowOptionsModal(false); if (selectedVideo) handlePlay(selectedVideo.uri, selectedVideo.filename); }}>
                            <MaterialIcons name="play-arrow" size={24} color={currentColors.primary} />
                            <Text style={[styles.modalOptionText, { color: currentColors.text }]}>Play Video</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalOption} onPress={handleRename}>
                            <MaterialIcons name="edit" size={24} color={currentColors.accent} />
                            <Text style={[styles.modalOptionText, { color: currentColors.text }]}>Rename</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalOption} onPress={showInfo}>
                            <MaterialIcons name="info-outline" size={24} color="#4FC3F7" />
                            <Text style={[styles.modalOptionText, { color: currentColors.text }]}>Information</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalOption} onPress={() => { setShowOptionsModal(false); if (selectedVideo) Sharing.shareAsync(selectedVideo.uri); }}>
                            <MaterialIcons name="share" size={24} color="#00C851" />
                            <Text style={[styles.modalOptionText, { color: currentColors.text }]}>Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalOption} onPress={() => selectedVideo && handleDelete(selectedVideo)}>
                            <MaterialIcons name="delete" size={24} color="#FF6B6B" />
                            <Text style={[styles.modalOptionText, styles.modalOptionDangerText]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            {/* Rename Modal */}
            <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowRenameModal(false)}>
                    <View style={[styles.modalContent, { backgroundColor: currentColors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: currentColors.text }]}>Rename Video</Text>
                            <TouchableOpacity onPress={() => setShowRenameModal(false)}>
                                <MaterialIcons name="close" size={24} color={currentColors.text} />
                            </TouchableOpacity>
                        </View>
                        <TextInput style={[styles.renameInput, { backgroundColor: currentColors.background, color: currentColors.text }]} value={newFilename} onChangeText={setNewFilename} placeholder="Enter new filename" placeholderTextColor={currentColors.textSecondary} autoFocus />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: currentColors.background }]} onPress={() => setShowRenameModal(false)}>
                                <Text style={[styles.modalButtonText, { color: currentColors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.modalButtonConfirm]} onPress={confirmRename}>
                                <Text style={styles.modalButtonText}>Rename</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>

            {/* Information Modal */}
            <Modal visible={showInfoModal} transparent animationType="fade" onRequestClose={() => setShowInfoModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowInfoModal(false)}>
                    <View style={[styles.modalContent, { backgroundColor: currentColors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: currentColors.text }]}>Video Information</Text>
                            <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                                <MaterialIcons name="close" size={24} color={currentColors.text} />
                            </TouchableOpacity>
                        </View>

                        {selectedVideo && (
                            <View style={styles.infoContainer}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Filename</Text>
                                    <Text style={[styles.infoValue, { color: currentColors.text }]}>{selectedVideo.filename}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Duration</Text>
                                    <Text style={[styles.infoValue, { color: currentColors.text }]}>{formatDuration(selectedVideo.duration)}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>File Size</Text>
                                    <Text style={[styles.infoValue, { color: currentColors.text }]}>{selectedVideoSize}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Resolution</Text>
                                    <Text style={[styles.infoValue, { color: currentColors.text }]}>{selectedVideo.width} x {selectedVideo.height}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Modified</Text>
                                    <Text style={[styles.infoValue, { color: currentColors.text }]}>
                                        {selectedVideo.modificationTime ? new Date(selectedVideo.modificationTime * 1000).toLocaleString() : 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Location</Text>
                                    <Text style={[styles.infoValue, { color: currentColors.text }]} numberOfLines={2}>{selectedVideo.uri}</Text>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalButtonConfirm, { marginTop: 10 }]}
                            onPress={() => setShowInfoModal(false)}
                        >
                            <Text style={styles.modalButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            {/* Sort Modal */}
            <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
                    <View style={[styles.modalContent, { backgroundColor: currentColors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: currentColors.text }]}>Sort By</Text>
                            <TouchableOpacity onPress={() => setShowSortModal(false)}>
                                <MaterialIcons name="close" size={24} color={currentColors.text} />
                            </TouchableOpacity>
                        </View>
                        {[
                            { label: 'Name', value: 'filename', icon: 'sort-by-alpha' },
                            { label: 'Date', value: 'modificationTime', icon: 'date-range' },
                            { label: 'Duration', value: 'duration', icon: 'timer' },
                            { label: 'Size', value: 'size', icon: 'storage' },
                        ].map((item) => (
                            <TouchableOpacity
                                key={item.value}
                                style={styles.modalOption}
                                onPress={() => { setSortBy(item.value as any); setShowSortModal(false); }}
                            >
                                <MaterialIcons
                                    name={item.icon as any}
                                    size={24}
                                    color={sortBy === item.value ? currentColors.primary : currentColors.textSecondary}
                                />
                                <Text style={[styles.modalOptionText, sortBy === item.value ? { color: currentColors.primary } : { color: currentColors.text }]}>
                                    {item.label}
                                </Text>
                                {sortBy === item.value && <MaterialIcons name="check" size={20} color={currentColors.primary} />}
                            </TouchableOpacity>
                        ))}
                        <View style={styles.divider} />
                        <TouchableOpacity
                            style={styles.modalOption}
                            onPress={() => { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setShowSortModal(false); }}
                        >
                            <MaterialIcons
                                name={sortOrder === 'asc' ? "arrow-upward" : "arrow-downward"}
                                size={24}
                                color={currentColors.primary}
                            />
                            <Text style={[styles.modalOptionText, { color: currentColors.text }]}>
                                Order: {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            <BottomMediaPill activeTab="videos" />
        </View>
    );
}

export default function HomeScreen() {
    return <Home />;
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    headerContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    headerGreeting: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', letterSpacing: 0.5, marginBottom: 2 },
    headerTitle: { fontSize: 28, fontFamily: 'Outfit_700Bold' },
    headerActions: { flexDirection: 'row', gap: 10 },
    iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, height: 50, marginBottom: 20 },
    searchInput: { flex: 1, fontFamily: 'Outfit_500Medium', fontSize: 15 },
    togglePillContainer: { flexDirection: 'row', borderRadius: 20, padding: 4 },
    togglePill: { flex: 1, paddingVertical: 10, borderRadius: 16, alignItems: 'center' },
    togglePillText: { fontFamily: 'Outfit_600SemiBold', fontSize: 14 },

    listContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Storage Card
    storageCard: { borderRadius: 24, padding: 20, marginBottom: 20, overflow: 'hidden' },
    storageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    storageIconWrapper: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    storageTextWrapper: { flex: 1 },
    storageTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', marginBottom: 2 },
    storageSubtitle: { fontSize: 13, fontFamily: 'Inter_500Medium' },
    storageProgressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
    storageProgressBarFill: { height: '100%', borderRadius: 4 },

    // Original Video Item Layout
    videoListItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: 'transparent' },
    videoThumbWrapper: { width: 140, height: 80, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', position: 'relative' },
    videoThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
    videoThumbPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    videoDurationBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    videoDurationText: { color: '#fff', fontSize: 10, fontFamily: 'Outfit_600SemiBold' },
    videoProgressBarBg: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
    videoProgressBarFill: { height: '100%' },
    videoListItemInfo: { flex: 1, paddingLeft: 14, justifyContent: 'center' },
    videoListTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    videoListFilename: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', flex: 1, marginRight: 8, marginBottom: 4 },
    videoListMeta: { fontSize: 12, fontFamily: 'Inter_500Medium' },

    // Premium Folder Card
    premiumFolderCard: { flex: 1, margin: 6, padding: 16, borderRadius: 20, overflow: 'hidden', height: 140 },
    premiumFolderIconHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    premiumFolderIconWrapper: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    premiumFolderInfo: { flex: 1, justifyContent: 'flex-end' },
    premiumFolderName: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', marginBottom: 4 },
    premiumFolderMeta: { fontSize: 13, fontFamily: 'Inter_500Medium' },

    breadcrumb: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 16, padding: 12, borderRadius: 16, gap: 8 },
    breadcrumbText: { flex: 1, fontSize: 15, fontFamily: 'Outfit_600SemiBold' },

    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    emptyStateText: { fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginTop: 16 },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', flex: 1, marginRight: 16 },
    modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 16 },
    modalOptionText: { fontSize: 16, fontFamily: 'Outfit_500Medium' },
    modalOptionDangerText: { color: '#ff4b4b' },
    renameInput: { borderRadius: 12, padding: 16, fontSize: 16, fontFamily: 'Outfit_500Medium', marginBottom: 24 },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalButton: { flex: 1, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    modalButtonConfirm: { backgroundColor: '#6366f1' },
    modalButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
    infoContainer: { marginBottom: 24 },
    infoRow: { marginBottom: 16 },
    infoLabel: { color: '#64748b', fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 4, textTransform: 'uppercase' },
    infoValue: { fontSize: 15, fontFamily: 'Outfit_500Medium' },
    divider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', width: '100%', marginVertical: 10 },
});
