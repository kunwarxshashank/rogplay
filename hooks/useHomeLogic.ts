import React, { useEffect, useState, useCallback } from 'react';
import {
    Alert,
    Platform,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';

export interface VideoWithThumbnail extends MediaLibrary.Asset {
    thumbnailUri?: string;
}

const THUMB_CACHE_DIR = `${FileSystem.cacheDirectory}rogplay_thumbnails/`;

export function useHomeLogic() {
    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;
    const [videos, setVideos] = useState<VideoWithThumbnail[]>([]);
    const [filteredVideos, setFilteredVideos] = useState<VideoWithThumbnail[]>([]);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [storage, setStorage] = useState({ free: 0, total: 1 });
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<VideoWithThumbnail | null>(null);
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [newFilename, setNewFilename] = useState('');
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [selectedVideoSize, setSelectedVideoSize] = useState<string>('Unknown');
    const [viewMode, setViewMode] = useState<'video' | 'folder'>('video');
    const [folders, setFolders] = useState<{ name: string, count: number, uri: string }[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'filename' | 'modificationTime' | 'duration' | 'size'>('modificationTime');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showSortModal, setShowSortModal] = useState(false);
    const router = useRouter();

    useEffect(() => {
        loadData();
    }, [permissionResponse]);

    useEffect(() => {
        let list = [...videos];
        if (selectedFolder) {
            list = list.filter(v => {
                const parts = v.uri.split('/');
                const folderPath = parts.slice(0, -1).join('/');
                return folderPath === selectedFolder;
            });
        }

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
            const filtered = list.filter(video =>
                video.filename.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredVideos(filtered);
        }
    }, [searchQuery, videos, selectedFolder, sortBy, sortOrder]);

    useEffect(() => {
        const folderMap = new Map<string, { name: string, count: number, uri: string }>();
        videos.forEach(video => {
            const parts = video.uri.split('/');
            const folderPath = parts.slice(0, -1).join('/');
            const folderName = parts[parts.length - 2] || 'Root';

            if (folderMap.has(folderPath)) {
                const current = folderMap.get(folderPath)!;
                folderMap.set(folderPath, { ...current, count: current.count + 1 });
            } else {
                folderMap.set(folderPath, { name: folderName, count: 1, uri: folderPath });
            }
        });
        setFolders(Array.from(folderMap.values()));
    }, [videos]);

    const loadData = async () => {
        await loadVideos();
        await getStorageInfo();
    };

    const getStorageInfo = async () => {
        try {
            const free = await FileSystem.getFreeDiskStorageAsync();
            const total = await FileSystem.getTotalDiskCapacityAsync();
            setStorage({ free, total });
        } catch (e) {
            setStorage({ free: 1000000000, total: 32000000000 });
        }
    };

    const ensureCacheDir = async () => {
        const info = await FileSystem.getInfoAsync(THUMB_CACHE_DIR);
        if (!info.exists) {
            await FileSystem.makeDirectoryAsync(THUMB_CACHE_DIR, { intermediates: true });
        }
    };

    const getCachedThumbnail = async (assetId: string): Promise<string | undefined> => {
        const cacheFile = `${THUMB_CACHE_DIR}thumb_${assetId}.jpg`;
        const info = await FileSystem.getInfoAsync(cacheFile);
        return info.exists ? cacheFile : undefined;
    };

    const generateThumbnail = async (uri: string, assetId: string): Promise<string | undefined> => {
        try {
            // Check cache first
            const cached = await getCachedThumbnail(assetId);
            if (cached) return cached;

            await ensureCacheDir();
            const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(uri, {
                time: 1000,
                quality: 0.3,
            });

            const cacheFile = `${THUMB_CACHE_DIR}thumb_${assetId}.jpg`;
            await FileSystem.copyAsync({
                from: thumbnailUri,
                to: cacheFile
            });

            return cacheFile;
        } catch (e) {
            console.error('Thumbnail generation failed:', e);
            return undefined;
        }
    };

    const loadVideos = async () => {
        try {
            if (!permissionResponse || permissionResponse.status !== 'granted') {
                const perm = await requestPermission();
                if (perm.status !== 'granted') {
                    setLoading(false);
                    return;
                }
            }

            setLoading(true);
            const media = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.video,
                first: 100, // You can increase this if needed
                sortBy: MediaLibrary.SortBy.modificationTime,
            });

            // Initial load: Try to find existing cached thumbnails instantly
            await ensureCacheDir();
            const initialVideos = await Promise.all(media.assets.map(async (asset) => {
                const cached = await getCachedThumbnail(asset.id);
                return { ...asset, thumbnailUri: cached };
            }));

            setVideos(initialVideos);
            setFilteredVideos(initialVideos);
            setLoading(false);

            // Background generation for missing thumbnails
            const batchSize = 4;
            let currentVideos = [...initialVideos];
            let needsUpdate = false;

            for (let i = 0; i < currentVideos.length; i += batchSize) {
                const batch = currentVideos.slice(i, i + batchSize);
                const results = await Promise.all(
                    batch.map(async (video) => {
                        if (video.thumbnailUri) return video;
                        const thumbnailUri = await generateThumbnail(video.uri, video.id);
                        if (thumbnailUri) {
                            needsUpdate = true;
                            return { ...video, thumbnailUri };
                        }
                        return video;
                    })
                );

                // Update the array with new results
                for (let j = 0; j < results.length; j++) {
                    currentVideos[i + j] = results[j];
                }

                // Update UI every few batches or if we found new ones
                if (needsUpdate && (i + batchSize >= currentVideos.length || i % (batchSize * 3) === 0)) {
                    setVideos([...currentVideos]);
                    needsUpdate = false;
                }
            }
        } catch (error) {
            console.error('Error loading videos:', error);
        } finally {
            setLoading(false);
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
        theme, currentColors, videos, filteredVideos, loading, refreshing, storage, searchQuery, setSearchQuery,
        showSearch, setShowSearch, selectedVideo, showOptionsModal, setShowOptionsModal, showRenameModal, setShowRenameModal,
        newFilename, setNewFilename, showInfoModal, setShowInfoModal, viewMode, setViewMode, folders, selectedFolder, setSelectedFolder,
        sortBy, setSortBy, sortOrder, setSortOrder, showSortModal, setShowSortModal, router,
        selectedVideoSize,
        onRefresh, handlePlay, showOptions, handleDelete, handleRename, confirmRename, showInfo, formatDuration
    };
}
