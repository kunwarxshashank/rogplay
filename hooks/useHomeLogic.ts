import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { useThemeStore, computeThemeColors } from '@/store/themeStore';

export interface VideoWithThumbnail extends MediaLibrary.Asset {
    thumbnailUri?: string;
}

const THUMB_CACHE_DIR = `${FileSystem.cacheDirectory}rogplay_thumbnails/`;

export function useHomeLogic() {
    const { theme } = useSettingsStore();
    const ts = useThemeStore();
    const currentColors = computeThemeColors(ts.themePalette, ts.accentColorId, ts.customHexAccent, ts.borderRadius, ts.cardElevation, ts.animationIntensity);
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
    const [viewMode, setViewMode] = useState<'video' | 'folder'>('folder');
    const [folders, setFolders] = useState<{ name: string, count: number, uri: string }[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
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

            // Set videos instantly without thumbnails
            const instantVideos = media.assets.map(asset => ({ ...asset, thumbnailUri: undefined as string | undefined }));
            setVideos(instantVideos);
            setFilteredVideos(instantVideos);
            setLoading(false);

            // Load thumbnails asynchronously (deferred to avoid blocking UI)
            thumbTimeoutRef.current = setTimeout(async () => {
                if (!mountedRef.current) return;
                try {
                    await ensureCacheDir();

                    // Phase 1: Load all cached thumbnails rapidly
                    const withCache = await Promise.all(instantVideos.map(async (video) => {
                        const cached = await getCachedThumbnail(video.id);
                        return cached ? { ...video, thumbnailUri: cached } : video;
                    }));

                    if (!mountedRef.current) return;

                    setVideos(prev => {
                        return prev.map(v => {
                            const cachedItem = withCache.find(c => c.id === v.id);
                            return cachedItem && cachedItem.thumbnailUri ? { ...v, thumbnailUri: cachedItem.thumbnailUri } : v;
                        });
                    });

                    // Phase 2: Generate missing thumbnails in small batches
                    const batchSize = 4;
                    for (let i = 0; i < withCache.length; i += batchSize) {
                        if (!mountedRef.current) return;
                        const batch = withCache.slice(i, i + batchSize);
                        const missingInBatch = batch.filter(v => !v.thumbnailUri);

                        if (missingInBatch.length === 0) continue;

                        const generated = await Promise.all(
                            missingInBatch.map(async (video) => {
                                const thumbnailUri = await generateThumbnail(video.uri, video.id);
                                return { id: video.id, thumbnailUri };
                            })
                        );

                        const validGenerated = generated.filter(g => g.thumbnailUri);

                        if (validGenerated.length > 0) {
                            setVideos(prev => {
                                const newVideos = [...prev];
                                validGenerated.forEach(g => {
                                    const index = newVideos.findIndex(v => v.id === g.id);
                                    if (index !== -1) {
                                        newVideos[index] = { ...newVideos[index], thumbnailUri: g.thumbnailUri };
                                    }
                                });
                                return newVideos;
                            });
                        }
                    }
                } catch (err) {
                    console.error('Error in background thumbnail generation:', err);
                }
            }, 50);
        } catch (error) {
            console.error('Error loading videos:', error);
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
