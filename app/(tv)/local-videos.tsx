import React, { useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    ActivityIndicator,
    Modal,
    Pressable,
    useWindowDimensions,
    Platform,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { TVFocusable } from '@/components/TVFocusable';
import { TVSearchBar } from '@/components/tv/TVSearchBar';
import { useHomeLogic, VideoWithThumbnail } from '@/hooks/useHomeLogic';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';

const hexAlpha = (hex: string, alpha: number) => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return hex + a;
};

// Folder gradient palette for visual variety
const FOLDER_GRADIENTS: [string, string][] = [
    ['#6366f1', '#a855f7'],
    ['#3b82f6', '#06b6d4'],
    ['#f43f5e', '#fb7185'],
    ['#f59e0b', '#fbbf24'],
    ['#10b981', '#34d399'],
    ['#ec4899', '#d946ef'],
    ['#8b5cf6', '#c084fc'],
    ['#14b8a6', '#2dd4bf'],
];

const TVFolderItem = React.memo(({
    item,
    index,
    onPress,
    CARD_W,
    c
}: {
    item: { name: string, count: number, uri: string },
    index: number,
    onPress: (uri: string) => void,
    CARD_W: number,
    c: any
}) => {
    const grad = FOLDER_GRADIENTS[index % FOLDER_GRADIENTS.length];
    return (
        <TVFocusable
            style={{ width: CARD_W, borderRadius: 18 }}
            onPress={() => onPress(item.uri)}
            nativeID={`tv-folder-${index}`}
            focusedBorderColor={grad[0]}
            focusedScale={1.04}
        >
            {({ focused }: { focused: boolean }) => (
                <View style={[styles.folderCard, {
                    backgroundColor: focused ? hexAlpha(grad[0], 0.08) : 'rgba(255,255,255,0.025)',
                    borderColor: focused ? grad[0] : 'rgba(255,255,255,0.06)',
                }]}>
                    <LinearGradient
                        colors={[grad[0], grad[1]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.folderAccentBar}
                    />
                    <View style={[styles.folderGlow, { backgroundColor: hexAlpha(grad[0], 0.06) }]} />
                    <View style={styles.folderBody}>
                        <View style={[styles.folderIconCircle, { backgroundColor: hexAlpha(grad[0], 0.15) }]}>
                            <MaterialCommunityIcons name="folder-play" size={42} color={grad[0]} />
                        </View>
                        <Text style={[styles.folderName, { color: c.text }]} numberOfLines={2}>{item.name}</Text>
                        <View style={styles.folderMetaRow}>
                            <View style={[styles.folderCountBadge, { backgroundColor: hexAlpha(grad[0], 0.12) }]}>
                                <MaterialIcons name="videocam" size={13} color={grad[0]} />
                                <Text style={[styles.folderCountText, { color: grad[0] }]}>{item.count}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </TVFocusable>
    );
});

const TVVideoItem = React.memo(({
    item,
    index,
    onPress,
    onLongPress,
    CARD_W,
    THUMB_H,
    c,
    formatDuration,
    getMockSize
}: {
    item: VideoWithThumbnail,
    index: number,
    onPress: (uri: string, filename: string) => void,
    onLongPress: (item: VideoWithThumbnail) => void,
    CARD_W: number,
    THUMB_H: number,
    c: any,
    formatDuration: (s: number) => string,
    getMockSize: (id: string) => string
}) => (
    <TVFocusable
        style={{ width: CARD_W, borderRadius: 18 }}
        onPress={() => onPress(item.uri, item.filename)}
        onLongPress={() => onLongPress(item)}
        nativeID={`tv-video-${index}`}
        focusedBorderColor={c.primary}
        focusedScale={1.04}
    >
        {({ focused }: { focused: boolean }) => (
            <View style={[styles.videoCard, {
                backgroundColor: focused ? hexAlpha(c.primary, 0.06) : 'rgba(255,255,255,0.025)',
                borderColor: focused ? c.primary : 'rgba(255,255,255,0.06)',
            }]}>
                <View style={[styles.thumbWrapper, { height: THUMB_H }]}>
                    {item.thumbnailUri ? (
                        <Image source={{ uri: item.thumbnailUri }} style={styles.thumbImage} />
                    ) : (
                        <View style={styles.thumbPlaceholder}>
                            <LinearGradient
                                colors={['#0f1520', '#1a1f2e']}
                                style={StyleSheet.absoluteFill}
                            />
                            <MaterialIcons name="videocam" size={40} color="rgba(255,255,255,0.15)" />
                        </View>
                    )}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.85)']}
                        style={styles.thumbGradient}
                    />
                    <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
                    </View>
                    {focused && (
                        <View style={styles.playOverlay}>
                            <View style={[styles.playCircle, { backgroundColor: hexAlpha(c.primary, 0.9) }]}>
                                <MaterialIcons name="play-arrow" size={28} color="#fff" />
                            </View>
                        </View>
                    )}
                </View>
                <View style={styles.videoInfo}>
                    <Text style={[styles.videoTitle, { color: c.text }]} numberOfLines={2}>
                        {item.filename}
                    </Text>
                    <View style={styles.videoMetaRow}>
                        <View style={styles.videoMetaItem}>
                            <MaterialIcons name="sd-storage" size={12} color={c.textSecondary} />
                            <Text style={[styles.videoMetaText, { color: c.textSecondary }]}>
                                {getMockSize(item.id)}
                            </Text>
                        </View>
                        <MaterialIcons name="more-horiz" size={16} color={c.textSecondary} />
                    </View>
                </View>
            </View>
        )}
    </TVFocusable>
));

export default function TVLocalVideosScreen() {
    const logic = useHomeLogic();
    const {
        currentColors, videos, filteredVideos, loading, storage, searchQuery, setSearchQuery,
        showOptionsModal, setShowOptionsModal, viewMode, setViewMode, folders, selectedFolder, setSelectedFolder,
        sortBy, setSortBy, sortOrder, setSortOrder, showSortModal, setShowSortModal, selectedVideo,
        showInfoModal, setShowInfoModal,
        handlePlay, showOptions, handleDelete, showInfo, formatDuration
    } = logic;

    const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();

    const c = currentColors;
    const gradients = c.gradients || { primary: [c.primary, c.primary] };

    // Layout calculations
    const SIDEBAR_W = 86;
    const H_PAD = 44;
    const GAP = 18;
    const COLS = viewMode === 'folder' && !selectedFolder ? 4 : 4;
    const usableW = SCREEN_W - SIDEBAR_W - H_PAD * 2;
    const CARD_W = (usableW - GAP * (COLS - 1)) / COLS;
    const THUMB_H = Math.round(CARD_W * 0.56); // 16:9 ratio

    // Derived mock size
    const getMockSize = (id: string) => {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const size = (Math.abs(hash % 480) + 20) / 10;
        return `${size.toFixed(1)} MB`;
    };

    const storageUsage = useMemo(() => {
        const used = storage.total - storage.free;
        const usedGB = (used / (1024 * 1024 * 1024)).toFixed(1);
        const totalGB = (storage.total / (1024 * 1024 * 1024)).toFixed(1);
        const percent = Math.min(100, (used / storage.total) * 100);
        return { usedGB, totalGB, percent };
    }, [storage]);

    const totalVideoCount = videos.length;
    const displayCount = filteredVideos.length;

    /* ── Folder Card ────────────────────────────── */
    const memoizedHandlePlay = useCallback((uri: string, filename: string) => {
        handlePlay(uri, filename);
    }, [handlePlay]);

    const memoizedShowOptions = useCallback((item: VideoWithThumbnail) => {
        showOptions(item);
    }, [showOptions]);

    const memoizedSetSelectedFolder = useCallback((uri: string) => {
        setSelectedFolder(uri);
    }, [setSelectedFolder]);

    const renderFolderItem = useCallback(({ item, index }: { item: { name: string, count: number, uri: string }, index: number }) => (
        <TVFolderItem
            item={item}
            index={index}
            onPress={memoizedSetSelectedFolder}
            CARD_W={CARD_W}
            c={c}
        />
    ), [memoizedSetSelectedFolder, CARD_W, c]);

    const renderVideoItem = useCallback(({ item, index }: { item: VideoWithThumbnail, index: number }) => (
        <TVVideoItem
            item={item}
            index={index}
            onPress={memoizedHandlePlay}
            onLongPress={memoizedShowOptions}
            CARD_W={CARD_W}
            THUMB_H={THUMB_H}
            c={c}
            formatDuration={formatDuration}
            getMockSize={getMockSize}
        />
    ), [memoizedHandlePlay, memoizedShowOptions, CARD_W, THUMB_H, c, formatDuration, getMockSize]);

    const SORT_OPTIONS = [
        { label: 'Name', value: 'filename', icon: 'sort-by-alpha' },
        { label: 'Date Added', value: 'modificationTime', icon: 'date-range' },
        { label: 'Duration', value: 'duration', icon: 'timer' },
        { label: 'File Size', value: 'size', icon: 'storage' },
    ];

    const isShowingFolders = viewMode === 'folder' && !selectedFolder;

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
                        <MaterialCommunityIcons name="folder-play" size={22} color="#fff" />
                    </View>
                    <View>
                        <Text style={[styles.headerTitle, { color: c.text }]}>
                            {selectedFolder ? selectedFolder.split('/').pop() : 'Local Videos'}
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
                            Browse and play your local media files
                        </Text>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    {/* Stats badges */}
                    <View style={styles.statsBadgeRow}>
                        <View style={[styles.statBadge, { backgroundColor: hexAlpha(c.primary, 0.1) }]}>
                            <MaterialIcons name="videocam" size={14} color={c.primary} />
                            <Text style={[styles.statBadgeText, { color: c.primary }]}>
                                {totalVideoCount} videos
                            </Text>
                        </View>
                        <View style={[styles.statBadge, { backgroundColor: hexAlpha(c.primary, 0.1) }]}>
                            <MaterialIcons name="folder" size={14} color={c.primary} />
                            <Text style={[styles.statBadgeText, { color: c.primary }]}>
                                {folders.length} folders
                            </Text>
                        </View>
                    </View>

                    {/* Storage indicator */}
                    <View style={styles.storageRow}>
                        <MaterialIcons name="storage" size={13} color={c.textSecondary} />
                        <Text style={[styles.storageText, { color: c.textSecondary }]}>
                            {storageUsage.usedGB} / {storageUsage.totalGB} GB
                        </Text>
                        <View style={styles.storageBar}>
                            <LinearGradient
                                colors={gradients.primary as any}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.storageBarFill, { width: `${storageUsage.percent}%` as any }]}
                            />
                        </View>
                    </View>
                </View>
            </View>

            {/* ── Toolbar: Search + Filters ─────────── */}
            <View style={[styles.toolbar, { paddingHorizontal: H_PAD }]}>
                <View style={styles.toolbarLeft}>
                    {selectedFolder ? (
                        <TVFocusable
                            style={[styles.backBtn, { backgroundColor: hexAlpha(c.primary, 0.1) }]}
                            onPress={() => setSelectedFolder(null)}
                            nativeID="tv-back-btn"
                            focusedBackgroundColor={hexAlpha(c.primary, 0.2)}
                            focusedScale={1.03}
                            autoFlex={false}
                        >
                            <View style={styles.backBtnContent}>
                                <MaterialIcons name="arrow-back" size={20} color={c.primary} />
                                <Text style={[styles.backBtnText, { color: c.primary }]}>All Folders</Text>
                            </View>
                        </TVFocusable>
                    ) : (
                        <View style={styles.modeToggleRow}>
                            <TVFocusable
                                onPress={() => setViewMode('folder')}
                                style={[
                                    styles.modeBtn,
                                    viewMode === 'folder'
                                        ? { backgroundColor: c.primary, borderColor: c.primary }
                                        : { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }
                                ]}
                                nativeID="tv-mode-folder"
                                focusedBackgroundColor={viewMode === 'folder' ? c.primary : hexAlpha(c.primary, 0.15)}
                                focusedScale={1.03}
                                autoFlex={false}
                            >
                                <View style={styles.modeBtnContent}>
                                    <MaterialIcons name="folder" size={18} color={viewMode === 'folder' ? '#fff' : c.textSecondary} />
                                    <Text style={[styles.modeBtnText, { color: viewMode === 'folder' ? '#fff' : c.textSecondary }]}>Folders</Text>
                                </View>
                            </TVFocusable>
                            <TVFocusable
                                onPress={() => setViewMode('video')}
                                style={[
                                    styles.modeBtn,
                                    viewMode === 'video'
                                        ? { backgroundColor: c.primary, borderColor: c.primary }
                                        : { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }
                                ]}
                                nativeID="tv-mode-video"
                                focusedBackgroundColor={viewMode === 'video' ? c.primary : hexAlpha(c.primary, 0.15)}
                                focusedScale={1.03}
                                autoFlex={false}
                            >
                                <View style={styles.modeBtnContent}>
                                    <MaterialIcons name="videocam" size={18} color={viewMode === 'video' ? '#fff' : c.textSecondary} />
                                    <Text style={[styles.modeBtnText, { color: viewMode === 'video' ? '#fff' : c.textSecondary }]}>All Videos</Text>
                                </View>
                            </TVFocusable>
                        </View>
                    )}
                </View>

                <View style={styles.toolbarRight}>
                    <View style={styles.searchBox}>
                        <TVSearchBar
                            onSearch={setSearchQuery}
                            value={searchQuery}
                            placeholder="Search videos..."
                            containerStyle={styles.searchBarOverride}
                            nativeID="tv-video-search"
                        />
                    </View>
                    <TVFocusable
                        style={[styles.sortBtn, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }]}
                        onPress={() => setShowSortModal(true)}
                        nativeID="tv-video-sort"
                        focusedBackgroundColor={hexAlpha(c.primary, 0.15)}
                        focusedScale={1.05}
                        autoFlex={false}
                    >
                        {({ focused }) => (
                            <View style={styles.sortBtnContent}>
                                <MaterialIcons name="sort" size={22} color={focused ? c.primary : c.textSecondary} />
                                <Text style={[styles.sortBtnLabel, { color: focused ? c.primary : c.textSecondary }]}>Sort</Text>
                            </View>
                        )}
                    </TVFocusable>
                </View>
            </View>

            {/* ── Result count ────────────────────────── */}
            {!loading && !isShowingFolders && searchQuery.trim() !== '' && (
                <View style={[styles.resultCountRow, { paddingHorizontal: H_PAD }]}>
                    <Text style={[styles.resultCountText, { color: c.textSecondary }]}>
                        {displayCount} result{displayCount !== 1 ? 's' : ''} found
                    </Text>
                </View>
            )}

            {/* ── Content Grid ────────────────────────── */}
            <View style={styles.gridArea}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <View style={[styles.loadingCard, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                            <ActivityIndicator size="large" color={c.primary} />
                            <Text style={[styles.loadingTitle, { color: c.text }]}>Scanning Storage</Text>
                            <Text style={[styles.loadingSubtitle, { color: c.textSecondary }]}>
                                Looking for video files on your device...
                            </Text>
                        </View>
                    </View>
                ) : (
                    <FlatList
                        data={(isShowingFolders ? folders : filteredVideos) as any}
                        renderItem={(isShowingFolders ? renderFolderItem : renderVideoItem) as any}
                        keyExtractor={(item: any) => item.id || item.uri}
                        numColumns={COLS}
                        key={`grid-${COLS}`}
                        contentContainerStyle={[styles.gridContent, { paddingHorizontal: H_PAD }]}
                        columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={8}
                        maxToRenderPerBatch={8}
                        windowSize={3}
                        removeClippedSubviews={Platform.OS === 'android'}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <View style={[styles.emptyIconCircle, { backgroundColor: hexAlpha(c.primary, 0.08) }]}>
                                    <LinearGradient
                                        colors={gradients.primary as any}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[StyleSheet.absoluteFill, { borderRadius: 50, opacity: 0.15 }]}
                                    />
                                    <Ionicons name="videocam-outline" size={56} color={c.primary} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: c.text }]}>No Videos Found</Text>
                                <Text style={[styles.emptySubtitle, { color: c.textSecondary }]}>
                                    {searchQuery ? 'Try a different search term' : 'Make sure the app has permission to access your files'}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* ── Sort Modal ──────────────────────────── */}
            <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
                    <Pressable style={[styles.modalCard, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => { }}>
                        {/* Modal header */}
                        <View style={styles.modalHeaderRow}>
                            <View style={[styles.modalIconWrap, { backgroundColor: hexAlpha(c.primary, 0.12) }]}>
                                <MaterialIcons name="sort" size={22} color={c.primary} />
                            </View>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Sort By</Text>
                        </View>

                        <View style={[styles.modalDivider, { backgroundColor: c.border }]} />

                        {/* Sort options */}
                        {SORT_OPTIONS.map((item, index) => (
                            <TVFocusable
                                key={item.value}
                                style={styles.sortOptionItem}
                                onPress={() => { setSortBy(item.value as any); setShowSortModal(false); }}
                                nativeID={`tv-sort-opt-${index}`}
                                hasTVPreferredFocus={sortBy === item.value}
                                focusedBackgroundColor={hexAlpha(c.primary, 0.12)}
                                focusedScale={1.0}
                                autoFlex={false}
                            >
                                {({ focused }) => (
                                    <View style={styles.sortOptionRow}>
                                        <View style={[styles.sortOptionIconBox, {
                                            backgroundColor: sortBy === item.value ? hexAlpha(c.primary, 0.15) : 'rgba(255,255,255,0.05)'
                                        }]}>
                                            <MaterialIcons
                                                name={item.icon as any}
                                                size={22}
                                                color={sortBy === item.value ? c.primary : c.textSecondary}
                                            />
                                        </View>
                                        <Text style={[
                                            styles.sortOptionLabel,
                                            { color: sortBy === item.value ? c.primary : c.text },
                                            focused && { fontWeight: '800' }
                                        ]}>
                                            {item.label}
                                        </Text>
                                        {sortBy === item.value && (
                                            <View style={[styles.sortCheckCircle, { backgroundColor: c.primary }]}>
                                                <MaterialIcons name="check" size={16} color="#fff" />
                                            </View>
                                        )}
                                    </View>
                                )}
                            </TVFocusable>
                        ))}

                        <View style={[styles.modalDivider, { backgroundColor: c.border, marginTop: 8 }]} />

                        {/* Sort order toggle */}
                        <TVFocusable
                            style={styles.sortOptionItem}
                            onPress={() => { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setShowSortModal(false); }}
                            focusedBackgroundColor={hexAlpha(c.primary, 0.12)}
                            focusedScale={1.0}
                            autoFlex={false}
                        >
                            <View style={styles.sortOptionRow}>
                                <View style={[styles.sortOptionIconBox, { backgroundColor: hexAlpha(c.primary, 0.15) }]}>
                                    <MaterialIcons
                                        name={sortOrder === 'asc' ? "arrow-upward" : "arrow-downward"}
                                        size={22}
                                        color={c.primary}
                                    />
                                </View>
                                <Text style={[styles.sortOptionLabel, { color: c.text }]}>
                                    {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                                </Text>
                                <View style={[styles.orderToggleBadge, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                                    <Text style={[styles.orderToggleBadgeText, { color: c.textSecondary }]}>
                                        {sortOrder === 'asc' ? 'A → Z' : 'Z → A'}
                                    </Text>
                                </View>
                            </View>
                        </TVFocusable>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── Options Modal ───────────────────────── */}
            <Modal visible={showOptionsModal} transparent animationType="fade" onRequestClose={() => setShowOptionsModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowOptionsModal(false)}>
                    <Pressable style={[styles.modalCard, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => { }}>
                        {/* Video info header */}
                        <View style={styles.optionsHeader}>
                            <View style={[styles.optionsThumb, { backgroundColor: '#0f1520' }]}>
                                {selectedVideo?.thumbnailUri ? (
                                    <Image source={{ uri: selectedVideo.thumbnailUri }} style={styles.optionsThumbImg} />
                                ) : (
                                    <MaterialIcons name="videocam" size={28} color="rgba(255,255,255,0.2)" />
                                )}
                            </View>
                            <View style={styles.optionsInfo}>
                                <Text style={[styles.optionsFilename, { color: c.text }]} numberOfLines={2}>
                                    {selectedVideo?.filename}
                                </Text>
                                {selectedVideo && (
                                    <View style={styles.optionsMetaRow}>
                                        <Text style={[styles.optionsMetaText, { color: c.textSecondary }]}>
                                            {formatDuration(selectedVideo.duration)}
                                        </Text>
                                        <View style={[styles.optionsMetaDot, { backgroundColor: c.textSecondary }]} />
                                        <Text style={[styles.optionsMetaText, { color: c.textSecondary }]}>
                                            {getMockSize(selectedVideo.id)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={[styles.modalDivider, { backgroundColor: c.border }]} />

                        {/* Action buttons */}
                        {[
                            {
                                icon: 'play-circle-filled' as const,
                                label: 'Play Video',
                                subtitle: 'Start playback now',
                                color: c.primary,
                                onPress: () => { setShowOptionsModal(false); if (selectedVideo) handlePlay(selectedVideo.uri, selectedVideo.filename); }
                            },
                            {
                                icon: 'info-outline' as const,
                                label: 'File Info',
                                subtitle: 'View file details',
                                color: c.info || '#3b82f6',
                                onPress: () => showInfo(),
                            },
                            {
                                icon: 'share' as const,
                                label: 'Share Video',
                                subtitle: 'Send to another device',
                                color: c.success || '#10b981',
                                onPress: () => { setShowOptionsModal(false); if (selectedVideo) Sharing.shareAsync(selectedVideo.uri); }
                            },
                            {
                                icon: 'delete-outline' as const,
                                label: 'Delete Video',
                                subtitle: 'Remove from device',
                                color: c.error || '#f43f5e',
                                onPress: () => selectedVideo && handleDelete(selectedVideo),
                            }
                        ].map((action, idx) => (
                            <TVFocusable
                                key={action.label}
                                style={styles.actionOptionItem}
                                onPress={action.onPress}
                                hasTVPreferredFocus={idx === 0}
                                focusedBackgroundColor={hexAlpha(action.color, 0.1)}
                                focusedScale={1.0}
                                autoFlex={false}
                                nativeID={`tv-opt-action-${idx}`}
                            >
                                {({ focused }) => (
                                    <View style={styles.actionOptionRow}>
                                        <View style={[styles.actionOptionIconBox, { backgroundColor: hexAlpha(action.color, 0.12) }]}>
                                            <MaterialIcons name={action.icon} size={24} color={action.color} />
                                        </View>
                                        <View style={styles.actionOptionTexts}>
                                            <Text style={[styles.actionOptionLabel, {
                                                color: action.label === 'Delete Video' ? action.color : c.text,
                                            }]}>
                                                {action.label}
                                            </Text>
                                            <Text style={[styles.actionOptionSub, { color: c.textSecondary }]}>
                                                {action.subtitle}
                                            </Text>
                                        </View>
                                        <MaterialIcons name="chevron-right" size={22} color={focused ? action.color : c.textSecondary} />
                                    </View>
                                )}
                            </TVFocusable>
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── File Info Modal ─────────────────────── */}
            <Modal visible={showInfoModal} transparent animationType="fade" onRequestClose={() => setShowInfoModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowInfoModal(false)}>
                    <Pressable style={[styles.modalCard, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => { }}>
                        {/* Header */}
                        <View style={styles.modalHeaderRow}>
                            <View style={[styles.modalIconWrap, { backgroundColor: hexAlpha(c.info || '#3b82f6', 0.12) }]}>
                                <MaterialIcons name="info-outline" size={22} color={c.info || '#3b82f6'} />
                            </View>
                            <Text style={[styles.modalTitle, { color: c.text }]}>File Information</Text>
                        </View>

                        <View style={[styles.modalDivider, { backgroundColor: c.border }]} />

                        {selectedVideo && (
                            <View style={styles.infoList}>
                                {[
                                    { label: 'File Name', value: selectedVideo.filename, icon: 'insert-drive-file' as const },
                                    { label: 'Duration', value: formatDuration(selectedVideo.duration), icon: 'timer' as const },
                                    { label: 'File Size', value: getMockSize(selectedVideo.id), icon: 'sd-storage' as const },
                                    { label: 'Resolution', value: `${selectedVideo.width} × ${selectedVideo.height}`, icon: 'aspect-ratio' as const },
                                    { label: 'Location', value: selectedVideo.uri.split('/').slice(0, -1).join('/'), icon: 'folder-open' as const },
                                    { label: 'Modified', value: selectedVideo.modificationTime ? new Date(selectedVideo.modificationTime * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown', icon: 'calendar-today' as const },
                                ].map((info, idx) => (
                                    <View key={info.label} style={[styles.infoRow, idx > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' }]}>
                                        <View style={styles.infoRowLeft}>
                                            <View style={[styles.infoIconBox, { backgroundColor: hexAlpha(c.primary, 0.08) }]}>
                                                <MaterialIcons name={info.icon} size={18} color={c.primary} />
                                            </View>
                                            <Text style={[styles.infoLabel, { color: c.textSecondary }]}>{info.label}</Text>
                                        </View>
                                        <Text style={[styles.infoValue, { color: c.text }]} numberOfLines={2}>
                                            {info.value}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={{ marginTop: 16 }}>
                            <TVFocusable
                                style={styles.infoCloseBtn}
                                onPress={() => setShowInfoModal(false)}
                                hasTVPreferredFocus
                                focusedBackgroundColor={hexAlpha(c.primary, 0.2)}
                                focusedScale={1.0}
                                autoFlex={false}
                                nativeID="tv-info-close"
                            >
                                {({ focused }) => (
                                    <View style={[styles.infoCloseBtnInner, {
                                        backgroundColor: focused ? hexAlpha(c.primary, 0.15) : 'rgba(255,255,255,0.04)',
                                        borderColor: focused ? c.primary : 'rgba(255,255,255,0.08)',
                                    }]}>
                                        <Text style={[styles.infoCloseBtnText, { color: focused ? c.primary : c.text }]}>Close</Text>
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
        alignItems: 'flex-end',
        gap: 8,
    },
    statsBadgeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10,
    },
    statBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    storageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    storageText: {
        fontSize: 11,
        fontWeight: '500',
    },
    storageBar: {
        width: 100,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    storageBarFill: {
        height: '100%',
        borderRadius: 2,
    },

    /* ── Toolbar ───────────────────────────── */
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 14,
    },
    toolbarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toolbarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    backBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    backBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    modeToggleRow: {
        flexDirection: 'row',
        gap: 10,
    },
    modeBtn: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    modeBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modeBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    searchBox: {
        width: 280,
    },
    searchBarOverride: {
        paddingHorizontal: 0,
        marginVertical: 0,
        width: '100%',
    },
    sortBtn: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    sortBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sortBtnLabel: {
        fontSize: 13,
        fontWeight: '700',
    },

    /* ── Result count ──────────────────────── */
    resultCountRow: {
        paddingBottom: 8,
    },
    resultCountText: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.7,
    },

    /* ── Grid ──────────────────────────────── */
    gridArea: {
        flex: 1,
    },
    gridContent: {
        paddingTop: 4,
        paddingBottom: 40,
    },

    /* ── Folder Card ───────────────────────── */
    folderCard: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    folderAccentBar: {
        height: 3,
        width: '100%',
    },
    folderGlow: {
        position: 'absolute',
        top: -30,
        left: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    folderBody: {
        padding: 22,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 170,
    },
    folderIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    folderName: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    folderMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    folderCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    folderCountText: {
        fontSize: 12,
        fontWeight: '700',
    },

    /* ── Video Card ────────────────────────── */
    videoCard: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
    },
    thumbWrapper: {
        width: '100%',
        backgroundColor: '#000',
        position: 'relative',
        overflow: 'hidden',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    thumbPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbGradient: {
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
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    durationText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    playCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoInfo: {
        padding: 14,
    },
    videoTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 6,
        lineHeight: 19,
        letterSpacing: 0.1,
    },
    videoMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    videoMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    videoMetaText: {
        fontSize: 11,
        fontWeight: '500',
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
        maxWidth: 360,
    },

    /* ── Modal (shared) ─────────────────────── */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.88)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        width: 520,
        maxHeight: '85%',
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
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    modalDivider: {
        height: 1,
        width: '100%',
        marginBottom: 16,
        opacity: 0.4,
    },

    /* ── Sort Modal items ──────────────────── */
    sortOptionItem: {
        borderRadius: 14,
        marginBottom: 4,
        minHeight: 56,
    },
    sortOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        minHeight: 56,
    },
    sortOptionIconBox: {
        width: 42,
        height: 42,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sortOptionLabel: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
    },
    sortCheckCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    orderToggleBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
    },
    orderToggleBadgeText: {
        fontSize: 13,
        fontWeight: '700',
    },

    /* ── Options Modal actions ─────────────── */
    actionOptionItem: {
        borderRadius: 14,
        marginBottom: 4,
        minHeight: 60,
    },
    actionOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        minHeight: 60,
    },
    actionOptionIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionOptionTexts: {
        flex: 1,
    },
    actionOptionLabel: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    actionOptionSub: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
        opacity: 0.7,
    },

    /* ── File Info Modal ───────────────────── */
    infoList: {
        gap: 0,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        gap: 12,
    },
    infoRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minWidth: 150,
    },
    infoIconBox: {
        width: 32,
        height: 32,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    infoValue: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'right',
    },
    infoCloseBtn: {
        borderRadius: 14,
    },
    infoCloseBtnInner: {
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoCloseBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },

    /* ── Options Modal header ──────────────── */
    optionsHeader: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    optionsThumb: {
        width: 80,
        height: 56,
        borderRadius: 10,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionsThumbImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    optionsInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    optionsFilename: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    optionsMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    optionsMetaText: {
        fontSize: 12,
        fontWeight: '500',
    },
    optionsMetaDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        opacity: 0.5,
    },
});
