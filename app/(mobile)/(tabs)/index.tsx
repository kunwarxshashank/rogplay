import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Platform,
    Modal,
    TextInput,
    Image,
    Pressable,
    ScrollView
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
// @ts-ignore
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ListItemSkeleton, FolderSkeleton } from '@/components/Skeleton';

import { useHomeLogic, VideoWithThumbnail } from '@/hooks/useHomeLogic';

// Stable hash for mock size
const getMockSize = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const size = (Math.abs(hash % 480) + 20) / 10;
    return `${size.toFixed(1)}MB`;
};

const VideoItem = React.memo(({
    item,
    onPress,
    onLongPress,
    currentColors
}: {
    item: VideoWithThumbnail,
    onPress: (uri: string, filename: string) => void,
    onLongPress: (item: VideoWithThumbnail) => void,
    currentColors: any
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
                {item.thumbnailUri ? (
                    <Image source={{ uri: item.thumbnailUri }} style={styles.videoThumb} />
                ) : (
                    <View style={[styles.videoThumbPlaceholder, { backgroundColor: '#1e2025' }]}>
                        <MaterialIcons name="videocam" size={32} color="#444" />
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
                    <Text style={styles.videoListFilename} numberOfLines={1}>{item.filename}</Text>
                    <TouchableOpacity onPress={() => onLongPress(item)}>
                        <MaterialIcons name="more-vert" size={22} color="#64748b" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.videoListMeta}>{sizeMb}</Text>
            </View>
        </TouchableOpacity>
    );
});

const FolderItem = React.memo(({
    item,
    onPress,
    currentColors
}: {
    item: { name: string, count: number, uri: string },
    onPress: (uri: string) => void,
    currentColors: any
}) => {
    return (
        <TouchableOpacity
            style={styles.folderListItem}
            onPress={() => onPress(item.uri)}
            activeOpacity={0.7}
        >
            <View style={styles.folderIconWrapper}>
                <MaterialIcons name="folder" size={40} color={currentColors.primary} />
            </View>
            <View style={styles.folderInfo}>
                <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.folderMeta}>{item.count} videos</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#64748b" />
        </TouchableOpacity>
    );
});

// ----------------------- Mobile Component LOCAL VIDEO ----------------------- ---
export function Home() {
    const logic = useHomeLogic();
    const {
        theme, currentColors, videos, filteredVideos, loading, refreshing, storage, searchQuery, setSearchQuery, showSearch, setShowSearch,
        selectedVideo, showOptionsModal, setShowOptionsModal, showRenameModal, setShowRenameModal, newFilename, setNewFilename,
        showInfoModal, setShowInfoModal, selectedVideoSize, viewMode, setViewMode, folders, selectedFolder, setSelectedFolder,
        sortBy, setSortBy, sortOrder, setSortOrder, showSortModal, setShowSortModal,
        router, onRefresh, handlePlay, showOptions, handleDelete, handleRename, confirmRename, showInfo, formatDuration
    } = logic;

    const renderHeader = () => {
        return (
            <View style={styles.headerArea}>
                <View style={styles.headerMain}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.mainTitle}>VIDEOS</Text>
                        <View style={styles.playCircle}>
                            <Image source={require('@/assets/images/icon.png')} style={{ width: 25, height: 25 }} />
                        </View>
                    </View>
                    <View style={styles.headerRightIcons}>
                        <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.headerIconButton}>
                            <MaterialIcons name="search" size={28} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.headerIconButton}>
                            <MaterialIcons name="more-vert" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {showSearch && (
                    <View style={styles.searchBarContainer}>
                        <TextInput
                            style={styles.searchBarInput}
                            placeholder="Search videos..."
                            placeholderTextColor="#64748b"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                    </View>
                )}

                <View style={styles.subHeader}>
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            onPress={() => { setViewMode('folder'); setSelectedFolder(null); }}
                            style={[styles.toggleBtn, viewMode === 'folder' && { backgroundColor: currentColors.primary }]}
                        >
                            <Text style={[styles.toggleText, viewMode === 'folder' && styles.toggleTextActive]}>Folder</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { setViewMode('video'); setSelectedFolder(null); }}
                            style={[styles.toggleBtn, viewMode === 'video' && { backgroundColor: currentColors.primary }]}
                        >
                            <Text style={[styles.toggleText, viewMode === 'video' && styles.toggleTextActive]}>Video</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.viewActions}>
                        <TouchableOpacity style={styles.actionIcon} onPress={() => setShowSortModal(true)}>
                            <MaterialIcons name="sort" size={24} color={showSortModal ? currentColors.primary : "#fff"} />
                        </TouchableOpacity>
                    </View>
                </View>

                {selectedFolder && (
                    <TouchableOpacity onPress={() => setSelectedFolder(null)} style={styles.breadcrumb}>
                        <MaterialIcons name="folder" size={20} color={currentColors.primary} />
                        <Text style={styles.breadcrumbText}>{selectedFolder.split('/').pop()}</Text>
                        <MaterialIcons name="close" size={16} color="#64748b" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const memoizedHandlePlay = useCallback((uri: string, filename: string) => {
        handlePlay(uri, filename);
    }, [handlePlay]);

    const memoizedShowOptions = useCallback((item: VideoWithThumbnail) => {
        showOptions(item);
    }, [showOptions]);

    const memoizedSetSelectedFolder = useCallback((uri: string) => {
        setSelectedFolder(uri);
    }, [setSelectedFolder]);

    const renderVideoItem = useCallback(({ item }: { item: VideoWithThumbnail }) => (
        <VideoItem
            item={item}
            onPress={memoizedHandlePlay}
            onLongPress={memoizedShowOptions}
            currentColors={currentColors}
        />
    ), [memoizedHandlePlay, memoizedShowOptions, currentColors]);

    const renderFolderItem = useCallback(({ item }: { item: { name: string, count: number, uri: string } }) => (
        <FolderItem
            item={item}
            onPress={memoizedSetSelectedFolder}
            currentColors={currentColors}
        />
    ), [memoizedSetSelectedFolder, currentColors]);

    return (
        <View style={[styles.container, { backgroundColor: '#000' }]}>
            {/* Dark Luxury Gradient */}
            <LinearGradient
                colors={[currentColors.primary + '30', '#000000FA', '#000000']}
                locations={[0, 0.25, 1]}
                style={StyleSheet.absoluteFill}
            />
            {/* Subtle light flares for premium aesthetic */}
            <View style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: currentColors.primary + '15', transform: [{ scale: 2 }] }} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {renderHeader()}

                {loading ? (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContainer}>
                        {Array.from({ length: 8 }).map((_, i) => (
                            viewMode === 'folder' && !selectedFolder ? (
                                <FolderSkeleton key={i} />
                            ) : (
                                <ListItemSkeleton key={i} />
                            )
                        ))}
                    </ScrollView>
                ) : (
                    <FlatList
                        data={(viewMode === 'folder' && !selectedFolder ? folders : filteredVideos) as any}
                        renderItem={(viewMode === 'folder' && !selectedFolder ? renderFolderItem : renderVideoItem) as any}
                        keyExtractor={(item: any) => item.id || item.uri}
                        contentContainerStyle={styles.listContainer}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={Platform.OS === 'android'}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentColors.primary} />
                        }
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="videocam-outline" size={80} color="#1e293b" />
                                <Text style={styles.emptyText}>No content found</Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>

            {/* Modals are shared but here duplicated for cleaner separation if desired, or can be extracted */}
            <Modal visible={showOptionsModal} transparent animationType="fade" onRequestClose={() => setShowOptionsModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowOptionsModal(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle} numberOfLines={1}>{selectedVideo?.filename}</Text>
                            <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                                <MaterialIcons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.modalOption} onPress={() => { setShowOptionsModal(false); if (selectedVideo) handlePlay(selectedVideo.uri, selectedVideo.filename); }}>
                            <MaterialIcons name="play-arrow" size={24} color={currentColors.primary} />
                            <Text style={styles.modalOptionText}>Play Video</Text>
                        </TouchableOpacity>
                        {/* More options... */}
                        <TouchableOpacity style={styles.modalOption} onPress={handleRename}>
                            <MaterialIcons name="edit" size={24} color={currentColors.accent} />
                            <Text style={styles.modalOptionText}>Rename</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalOption} onPress={showInfo}>
                            <MaterialIcons name="info-outline" size={24} color="#4FC3F7" />
                            <Text style={styles.modalOptionText}>Information</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalOption} onPress={() => { setShowOptionsModal(false); if (selectedVideo) Sharing.shareAsync(selectedVideo.uri); }}>
                            <MaterialIcons name="share" size={24} color="#00C851" />
                            <Text style={styles.modalOptionText}>Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalOption} onPress={() => selectedVideo && handleDelete(selectedVideo)}>
                            <MaterialIcons name="delete" size={24} color="#FF6B6B" />
                            <Text style={[styles.modalOptionText, styles.modalOptionDangerText]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            {/* Other modals (Rename, Info) similar to original */}
            {/* Rename Modal */}
            <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowRenameModal(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Rename Video</Text>
                            <TouchableOpacity onPress={() => setShowRenameModal(false)}>
                                <MaterialIcons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <TextInput style={styles.renameInput} value={newFilename} onChangeText={setNewFilename} placeholder="Enter new filename" placeholderTextColor={Colors.dark.textSecondary} autoFocus />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowRenameModal(false)}>
                                <Text style={styles.modalButtonText}>Cancel</Text>
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
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Video Information</Text>
                            <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                                <MaterialIcons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {selectedVideo && (
                            <View style={styles.infoContainer}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Filename</Text>
                                    <Text style={styles.infoValue}>{selectedVideo.filename}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Duration</Text>
                                    <Text style={styles.infoValue}>{formatDuration(selectedVideo.duration)}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>File Size</Text>
                                    <Text style={styles.infoValue}>{selectedVideoSize}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Resolution</Text>
                                    <Text style={styles.infoValue}>{selectedVideo.width} x {selectedVideo.height}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Modified</Text>
                                    <Text style={styles.infoValue}>
                                        {selectedVideo.modificationTime ? new Date(selectedVideo.modificationTime * 1000).toLocaleString() : 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Location</Text>
                                    <Text style={styles.infoValue} numberOfLines={2}>{selectedVideo.uri}</Text>
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
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sort By</Text>
                            <TouchableOpacity onPress={() => setShowSortModal(false)}>
                                <MaterialIcons name="close" size={24} color="#fff" />
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
                                    color={sortBy === item.value ? currentColors.primary : "#64748b"}
                                />
                                <Text style={[styles.modalOptionText, sortBy === item.value && { color: currentColors.primary }]}>
                                    {item.label}
                                </Text>
                                {sortBy === item.value && <MaterialIcons name="check" size={20} color={currentColors.primary} />}
                            </TouchableOpacity>
                        ))}
                        <View style={[styles.divider, { marginVertical: 10 }]} />
                        <TouchableOpacity
                            style={styles.modalOption}
                            onPress={() => { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setShowSortModal(false); }}
                        >
                            <MaterialIcons
                                name={sortOrder === 'asc' ? "arrow-upward" : "arrow-downward"}
                                size={24}
                                color={currentColors.primary}
                            />
                            <Text style={styles.modalOptionText}>
                                Order: {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}



export default function HomeScreen() {
    return <Home />;
}



const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#060912',
    },
    safeArea: {
        flex: 1,
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    greeting: {
        fontSize: 32,
        fontFamily: 'Outfit_700Bold',
        color: '#fff',
    },
    subGreeting: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: '#94a3b8',
        marginTop: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f1424',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        gap: 10,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Outfit_500Medium',
        padding: 0,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        width: '100%',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#0f1424',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skeletonContainer: {
        flex: 1,
    },
    headerComponent: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    storageFocusable: {
        marginBottom: 32,
        borderRadius: 24,
    },
    storageCard: {
        borderRadius: 24,
        padding: 24,
    },
    storageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    storageIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    storageTitle: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
        fontSize: 18,
    },
    storageSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        marginTop: 2,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
        color: '#fff',
    },
    videoCount: {
        color: '#64748b',
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
    },
    list: {
        paddingBottom: 120,
    },
    row: {
        paddingHorizontal: 20,
        justifyContent: 'space-between',
    },
    card: {
        marginBottom: 20,
        backgroundColor: '#0f1424',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        overflow: 'hidden',
    },
    thumbnailContainer: {
        height: 120,
        backgroundColor: '#000',
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    thumbGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreButton: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    cardGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
    },
    durationBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    durationText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Inter_600SemiBold',
    },
    info: {
        padding: 12,
    },
    filename: {
        color: '#f8fafc',
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: 4,
    },
    timeAgo: {
        color: '#64748b',
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
    },
    empty: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: '#fff',
        fontSize: 20,
        fontFamily: 'Outfit_700Bold',
        marginTop: 20,
    },
    emptySubtext: {
        color: '#94a3b8',
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
        paddingHorizontal: 40,
        marginTop: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0f1424',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
        color: '#fff',
        flex: 1,
        marginRight: 16,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 16,
    },
    modalOptionText: {
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
        color: '#f1f5f9',
    },
    modalOptionDangerText: {
        color: '#ff4b4b',
    },
    renameInput: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalButtonCancel: {
        backgroundColor: '#1e293b',
    },
    modalButtonConfirm: {
        backgroundColor: '#6366f1',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
    },
    infoContainer: {
        marginBottom: 24,
    },
    infoRow: {
        marginBottom: 16,
    },
    infoLabel: {
        color: '#64748b',
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    infoValue: {
        color: '#f1f5f9',
        fontSize: 15,
        fontFamily: 'Outfit_500Medium',
    },
    // New Styles inspired by image
    headerArea: {
        paddingTop: 10,
    },
    headerMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mainTitle: {
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
        color: '#fff',
        letterSpacing: 1,
    },
    playCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRightIcons: {
        flexDirection: 'row',
        gap: 16,
    },
    headerIconButton: {
        padding: 4,
    },
    subHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 25,
        padding: 4,
    },
    toggleBtn: {
        paddingHorizontal: 24,
        paddingVertical: 8,
        borderRadius: 21,
    },
    toggleText: {
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
        color: '#94a3b8',
    },
    toggleTextActive: {
        color: '#fff',
    },
    viewActions: {
        flexDirection: 'row',
        gap: 16,
    },
    actionIcon: {
        padding: 4,
    },
    listContainer: {
        paddingBottom: 100,
    },
    loadingArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoListItem: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        marginHorizontal: 12,
        marginBottom: 8,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    videoThumbWrapper: {
        width: 120,
        height: 70,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    videoThumb: {
        width: '100%',
        height: '100%',
    },
    videoThumbPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoDurationBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    videoDurationText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Inter_600SemiBold',
    },
    videoProgressBarBg: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    videoProgressBarFill: {
        height: '100%',
    },
    videoListItemInfo: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    videoListTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    videoListFilename: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
        fontFamily: 'Outfit_600SemiBold',
        marginRight: 8,
    },
    videoListMeta: {
        fontSize: 13,
        color: '#64748b',
        fontFamily: 'Inter_400Regular',
        marginTop: 4,
    },
    folderListItem: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        marginHorizontal: 12,
        marginBottom: 8,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    folderIconWrapper: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    folderInfo: {
        flex: 1,
        marginLeft: 16,
    },
    folderName: {
        fontSize: 17,
        color: '#fff',
        fontFamily: 'Outfit_600SemiBold',
    },
    folderMeta: {
        fontSize: 13,
        color: '#94a3b8',
        fontFamily: 'Inter_400Regular',
        marginTop: 2,
    },
    breadcrumb: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        gap: 8,
    },
    breadcrumbText: {
        color: '#fff',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        flex: 1,
    },
    searchBarContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    searchBarInput: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        color: '#fff',
        fontFamily: 'Outfit_500Medium',
        flex: 1,
        fontSize: 16,
    }
});
