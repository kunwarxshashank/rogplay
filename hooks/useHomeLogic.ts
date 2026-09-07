import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Alert,
    Platform,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { storage } from '@/store/mmkv';
export interface VideoWithThumbnail extends MediaLibrary.Asset {
    thumbnailUri?: string;
}

export interface FolderType {
    id: string;
    name: string;
    count: number;
}

export interface FolderType {
    id: string;
    name: string;
    count: number;
}

export function useHomeLogic() {
    const { colors: currentColors, theme } = useTheme();
    const [videos, setVideos] = useState<VideoWithThumbnail[]>([]);
    const [filteredVideos, setFilteredVideos] = useState<VideoWithThumbnail[]>([]);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
    const [loading, setLoading] = useState(true);
    const [foldersLoading, setFoldersLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [deviceStorage, setDeviceStorage] = useState({ free: 0, total: 1 });
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<VideoWithThumbnail | null>(null);
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [newFilename, setNewFilename] = useState('');
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [selectedVideoSize, setSelectedVideoSize] = useState<string>('Unknown');
    const [viewMode, setViewMode] = useState<'video' | 'folder'>('folder');
    const [folders, setFolders] = useState<FolderType[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
    const [sortBy, setSortBy] = useState<'filename' | 'modificationTime' | 'duration' | 'size'>('modificationTime');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showSortModal, setShowSortModal] = useState(false);
    const router = useRouter();
    const mountedRef = useRef(true);
    const thumbTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        mountedRef.current = true;
        loadData();
        return () => {
            mountedRef.current = false;
            if (thumbTimeoutRef.current) {
                clearTimeout(thumbTimeoutRef.current);
                thumbTimeoutRef.current = null;
            }
        };
    }, [permissionResponse]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            let list = [...videos];

            // Apply Sorting
            list.sort((a, b) => {
                let valA: any = a[sortBy as keyof VideoWithThumbnail];
                let valB: any = b[sortBy as keyof VideoWithThumbnail];

                if (sortBy === 'filename') {
                    valA = a.filename.toLowerCase();
                    valB = b.filename.toLowerCase();
                }

                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });

            if (searchQuery.trim() === '') {
                setFilteredVideos(list);
            } else {
                const lowerQuery = searchQuery.toLowerCase();
                const filtered = list.filter(video =>
                    video.filename.toLowerCase().includes(lowerQuery)
                );
                setFilteredVideos(filtered);
            }
        }, 50); // Small debounce to keep UI responsive

        return () => clearTimeout(timeoutId);
    }, [searchQuery, videos, selectedFolder, sortBy, sortOrder]);

    const loadFolders = async () => {
        try {
            if (!permissionResponse || permissionResponse.status !== 'granted') return;

            // --- INSTANT CACHE LOAD ---
            let hasCache = false;
            try {
                const cachedString = storage?.getString('cached_local_folders');
                if (cachedString) {
                    const cachedFolders = JSON.parse(cachedString);
                    if (Array.isArray(cachedFolders) && cachedFolders.length > 0) {
                        setFolders(cachedFolders);
                        setFoldersLoading(false);
                        hasCache = true;
                    }
                }
            } catch (e) { }

            if (!hasCache) {
                setFoldersLoading(true);
            }

            const allAlbums = await MediaLibrary.getAlbumsAsync();
            const videoFolders: FolderType[] = [];

            await Promise.all(allAlbums.map(async (album) => {
                const media = await MediaLibrary.getAssetsAsync({
                    mediaType: MediaLibrary.MediaType.video,
                    album: album.id,
                    first: 0,
                });
                if (media.totalCount > 0) {
                    videoFolders.push({
                        id: album.id,
                        name: album.title,
                        count: media.totalCount,
                    });
                }
            }));

            videoFolders.sort((a, b) => a.name.localeCompare(b.name));
            setFolders(videoFolders);

            try {
                if (storage && videoFolders.length > 0) {
                    storage.set('cached_local_folders', JSON.stringify(videoFolders));
                }
            } catch (e) { }
        } catch (error) {
            console.error('Error loading folders:', error);
        } finally {
            setFoldersLoading(false);
        }
    };

    const loadData = async () => {
        setEndCursor(undefined);
        setHasNextPage(true);
        await Promise.all([
            loadVideos(selectedFolder?.id),
            loadFolders(),
            getStorageInfo()
        ]);
    };

    const firstLoadRef = useRef(true);
    useEffect(() => {
        if (!mountedRef.current) return;
        if (firstLoadRef.current) {
            firstLoadRef.current = false;
            return;
        }
        setEndCursor(undefined);
        setHasNextPage(true);
        setVideos([]);
        setLoading(true);
        loadVideos(selectedFolder?.id);
    }, [selectedFolder]);

    const getStorageInfo = async () => {
        try {
            const free = await FileSystem.getFreeDiskStorageAsync();
            const total = await FileSystem.getTotalDiskCapacityAsync();
            setDeviceStorage({ free, total });
        } catch (e) {
            setDeviceStorage({ free: 1000000000, total: 32000000000 });
        }
    };

    const loadVideos = async (albumId?: string) => {
        try {
            if (!permissionResponse || permissionResponse.status !== 'granted') {
                const perm = await requestPermission();
                if (perm.status !== 'granted') {
                    setLoading(false);
                    setFoldersLoading(false);
                    return;
                }
            }

            // --- INSTANT CACHE LOAD ---
            try {
                const cachedString = storage?.getString('cached_local_videos');
                if (cachedString) {
                    const cachedVideos = JSON.parse(cachedString);
                    if (Array.isArray(cachedVideos) && cachedVideos.length > 0) {
                        setVideos(cachedVideos);
                        // setFilteredVideos(cachedVideos); // useEffect handles this now
                        setLoading(false);
                    } else {
                        setLoading(true);
                    }
                } else {
                    setLoading(true);
                }
            } catch (e) {
                setLoading(true);
            }

            // --- PAGINATED BACKGROUND FETCH ---
            const media: MediaLibrary.PagedInfo<MediaLibrary.Asset> = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.video,
                first: 30, // Fetch in batches
                sortBy: MediaLibrary.SortBy.modificationTime,
                ...(albumId ? { album: albumId } : {})
            });

            setHasNextPage(media.hasNextPage);
            setEndCursor(media.endCursor);

            const instantVideos = media.assets;

            // Atomically update state
            setVideos(instantVideos);

            setLoading(false); // UI ready after first batch

            // Save final full list to cache for next time
            try {
                if (storage && instantVideos.length > 0) {
                    storage.set('cached_local_videos', JSON.stringify(instantVideos));
                }
            } catch (e) { }

        } catch (error) {
            console.error('Error loading videos:', error);
            setLoading(false);
        }
    };

    const loadMoreVideos = async () => {
        if (!hasNextPage || isFetchingNextPage || loading) return;

        setIsFetchingNextPage(true);
        try {
            const media: MediaLibrary.PagedInfo<MediaLibrary.Asset> = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.video,
                first: 50,
                sortBy: MediaLibrary.SortBy.modificationTime,
                after: endCursor,
                ...(selectedFolder?.id ? { album: selectedFolder.id } : {})
            });

            setHasNextPage(media.hasNextPage);
            setEndCursor(media.endCursor);

            const newVideos = media.assets;

            setVideos(prev => {
                return [...prev, ...newVideos];
            });

        } catch (error) {
            console.error('Error loading more videos:', error);
        } finally {
            setIsFetchingNextPage(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    const handlePlay = (uri: string, filename?: string) => {
        router.push({
            pathname: '/player',
            params: {
                url: encodeURIComponent(uri),
                title: encodeURIComponent(filename || 'Local Video')
            }
        });
    };

    const showOptions = (item: VideoWithThumbnail) => {
        setSelectedVideo(item);
        setShowOptionsModal(true);
    };

    const handleDelete = async (item: VideoWithThumbnail) => {
        Alert.alert(
            'Delete Video',
            `Are you sure you want to delete "${item.filename}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await MediaLibrary.deleteAssetsAsync([item]);
                            setVideos(prev => prev.filter(v => v.id !== item.id));
                            setShowOptionsModal(false);
                            Alert.alert('Success', 'Video deleted successfully');
                        } catch (err) {
                            Alert.alert("Permission Required", "Allow RogPlay to modify files to delete.");
                        }
                    }
                }
            ]
        );
    };

    const handleRename = () => {
        if (!selectedVideo) return;
        setNewFilename(selectedVideo.filename.replace(/\.[^/.]+$/, ''));
        setShowOptionsModal(false);
        setShowRenameModal(true);
    };

    const confirmRename = async () => {
        if (!selectedVideo || !newFilename.trim()) {
            Alert.alert('Error', 'Please enter a valid filename');
            return;
        }

        try {
            const extension = selectedVideo.filename.split('.').pop();
            const newFullFilename = `${newFilename.trim()}.${extension}`;

            // Get detailed asset info to get the local path
            const assetInfo = await MediaLibrary.getAssetInfoAsync(selectedVideo.id);
            const currentUri = assetInfo.localUri || selectedVideo.uri;

            if (currentUri) {
                // Determine the folder path correctly
                const lastSlashIndex = currentUri.lastIndexOf('/');
                const folderPath = currentUri.substring(0, lastSlashIndex + 1);
                const newUri = folderPath + newFullFilename;

                // Move the physical file
                await FileSystem.moveAsync({
                    from: currentUri,
                    to: newUri
                });

                // Update Media Library: Create a new asset entry
                await MediaLibrary.createAssetAsync(newUri);

                // Try to remove the old asset entry from the media store
                // Note: Since the file at currentUri is already moved, this might only remove the DB entry
                try {
                    await MediaLibrary.deleteAssetsAsync([selectedVideo.id]);
                } catch (e) {
                    console.log('Old asset cleanup info (ignorable):', e);
                }

                await loadVideos();
                setShowRenameModal(false);
                Alert.alert('Success', 'Video renamed successfully');
            } else {
                Alert.alert('Error', 'Could not locate the file on device.');
            }
        } catch (err) {
            console.error('Rename error:', err);
            Alert.alert('Error', 'Failed to rename video. Permission to modify files may be required.');
        }
    };

    const showInfo = async () => {
        if (!selectedVideo) return;

        setShowOptionsModal(false);
        setShowInfoModal(true);
        setSelectedVideoSize('Calculating...');

        try {
            const assetInfo = await MediaLibrary.getAssetInfoAsync(selectedVideo.id);
            const uri = assetInfo.localUri || selectedVideo.uri;
            if (uri) {
                const info = await FileSystem.getInfoAsync(uri);
                if (info.exists) {
                    const sizeInMb = (info.size / (1024 * 1024)).toFixed(2);
                    setSelectedVideoSize(`${sizeInMb} MB`);
                } else {
                    setSelectedVideoSize('Unknown');
                }
            }
        } catch (e) {
            console.error('Error getting file info:', e);
            setSelectedVideoSize('Unknown');
        }
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    return {
        theme, currentColors, videos, filteredVideos, loading, refreshing, deviceStorage, searchQuery, setSearchQuery,
        showSearch, setShowSearch, selectedVideo, showOptionsModal, setShowOptionsModal, showRenameModal, setShowRenameModal,
        newFilename, setNewFilename, showInfoModal, setShowInfoModal, viewMode, setViewMode, folders, selectedFolder, setSelectedFolder,
        sortBy, setSortBy, sortOrder, setSortOrder, showSortModal, setShowSortModal, router,
        selectedVideoSize, hasNextPage, isFetchingNextPage, loadMoreVideos, foldersLoading,
        onRefresh, handlePlay, showOptions, handleDelete, handleRename, confirmRename, showInfo, formatDuration
    };
}
