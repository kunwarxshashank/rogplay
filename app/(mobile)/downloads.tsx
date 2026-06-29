import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image, TextInput, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as MediaLibrary from 'expo-media-library';
import { Downloader, ActiveDownloadState } from '@/services/downloader';
import { DownloadItemSkeleton } from '@/components/Skeleton';
import { TVFocusable } from '@/components/TVFocusable';
import { useTheme } from '@/hooks/useTheme';

// Accessing properties via cast to bypass temporary lint issues with Expo 52 types
const filesystem = FileSystem as any;
const documentDir = filesystem.documentDirectory;

interface DownloadedFile {
    name: string;
    uri: string;
    size: number;
    modificationTime: number;
    thumbnail?: string;
}

function useDownloadsLogic() {
    const { colors: activeColors } = useTheme();
    const [files, setFiles] = useState<DownloadedFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDir, setCurrentDir] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDownload, setActiveDownload] = useState<ActiveDownloadState | null>(null);
    const router = useRouter();

    useEffect(() => {
        loadDownloads();

        const unsubscribe = Downloader.subscribe((state) => {
            setActiveDownload(state);
            // If download finishes and state becomes null, reload the downloads list
            if (!state) {
                loadDownloads();
            }
        });

        return () => unsubscribe();
    }, []);

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Storage access is needed to show your downloads.');
                return false;
            }
        }
        return true;
    };

    const loadDownloads = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const dir = await Downloader.getDir();
            setCurrentDir(dir);
            const fileList = await FileSystem.readDirectoryAsync(dir);

            const fileData: DownloadedFile[] = await Promise.all(
                fileList.map(async (fileName) => {
                    const fileUri = dir + fileName;
                    const fileInfo = await FileSystem.getInfoAsync(fileUri);

                    let thumbnail: string | undefined;
                    if (fileName.match(/\.(mp4|mkv|mov|avi|ts|webm)$/i)) {
                        try {
                            const { uri } = await VideoThumbnails.getThumbnailAsync(fileUri, {
                                time: 2000,
                            });
                            thumbnail = uri;
                        } catch (e) {
                            // Suppress thumbnail errors
                        }
                    }

                    return {
                        name: fileName,
                        uri: fileUri,
                        size: fileInfo.exists ? (fileInfo as any).size : 0,
                        modificationTime: fileInfo.exists ? (fileInfo as any).modificationTime : (Date.now() / 1000),
                        thumbnail
                    };
                })
            );

            setFiles(fileData.sort((a, b) => b.modificationTime - a.modificationTime));
        } catch (error) {
            console.error('Error loading downloads:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredFiles = useMemo(() => {
        if (!searchQuery.trim()) return files;
        return files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [files, searchQuery]);

    const formatSize = (bytes: number) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleDelete = (file: DownloadedFile) => {
        Alert.alert(
            'Delete Video',
            `Permanently remove "${file.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await FileSystem.deleteAsync(file.uri);
                            setFiles(files.filter(f => f.uri !== file.uri));
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete file');
                        }
                    }
                }
            ]
        );
    };

    const handlePlay = (file: DownloadedFile) => {
        router.push({
            pathname: '/player',
            params: {
                url: file.uri,
                title: file.name
            }
        });
    };

    return {
        files, loading, searchQuery, setSearchQuery, filteredFiles, loadDownloads, handleDelete, handlePlay,
        formatSize, activeColors, router, activeDownload
    };
}

export function DownloadsMobile() {
    const {
        loading, searchQuery, setSearchQuery, filteredFiles, loadDownloads, handleDelete, handlePlay,
        formatSize, activeColors, router, activeDownload
    } = useDownloadsLogic();

    const renderItem = ({ item }: { item: DownloadedFile }) => (
        <TouchableOpacity
            style={[styles.fileCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}
            onPress={() => handlePlay(item)}
            activeOpacity={0.7}
        >
            <View style={styles.thumbnailContainer}>
                {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                ) : (
                    <View style={[styles.placeholderThumbnail, { backgroundColor: activeColors.background }]}>
                        <MaterialIcons name="play-circle-outline" size={32} color={activeColors.primary} />
                    </View>
                )}
                <View style={styles.playOverlay}>
                    <Ionicons name="play-circle" size={24} color="#fff" />
                </View>
            </View>

            <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: activeColors.text }]} numberOfLines={1}>
                    {item.name}
                </Text>
                <View style={styles.fileMeta}>
                    <Text style={[styles.fileSize, { color: activeColors.textSecondary }]}>
                        {formatSize(item.size)}
                    </Text>
                    <View style={[styles.dot, { backgroundColor: activeColors.border }]} />
                    <Text style={[styles.fileDate, { color: activeColors.textSecondary }]}>
                        {new Date(item.modificationTime * (item.modificationTime > 1e11 ? 1 : 1000)).toLocaleDateString()}
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item)}
            >
                <MaterialIcons name="delete-outline" size={22} color="#f87171" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color={activeColors.text} />
                </TouchableOpacity>
                <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: activeColors.text }]}>Downloads</Text>
                    <View style={[styles.titleDot, { backgroundColor: activeColors.primary }]} />
                </View>
                <TouchableOpacity onPress={loadDownloads} style={styles.refreshBtn}>
                    <MaterialIcons name="refresh" size={24} color={activeColors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
                    <MaterialIcons name="search" size={20} color={activeColors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: activeColors.text }]}
                        placeholder="Search your videos..."
                        placeholderTextColor={activeColors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <MaterialIcons name="close" size={20} color={activeColors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.list}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <DownloadItemSkeleton key={index} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredFiles}
                    renderItem={renderItem}
                    keyExtractor={item => item.uri}
                    contentContainerStyle={[styles.list, { flexGrow: 1 }]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={(
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: activeColors.card }]}>
                                <MaterialIcons name={searchQuery ? "search-off" : "cloud-download"} size={48} color={activeColors.primary} />
                            </View>
                            <Text style={[styles.emptyText, { color: activeColors.text }]}>
                                {searchQuery ? "No matches found" : "No downloads yet"}
                            </Text>
                            <Text style={[styles.emptySubtext, { color: activeColors.textSecondary }]}>
                                {searchQuery ? "Try a different search term" : "Your offline videos will appear here"}
                            </Text>
                        </View>
                    )}
                    ListHeaderComponent={(
                        activeDownload ? (
                            <View style={[styles.activeDownloadCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <ActivityIndicator size="small" color={activeColors.primary} style={{ marginRight: 10 }} />
                                    <Text style={[styles.fileName, { color: activeColors.text, flex: 1, marginBottom: 0 }]} numberOfLines={1}>
                                        {activeDownload.fileName}
                                    </Text>
                                </View>
                                {activeDownload.progress && (
                                    <>
                                        <View style={styles.progressBarBg}>
                                            <View style={[styles.progressBarFill, { backgroundColor: activeColors.primary, width: `${activeDownload.progress.progress * 100}%` }]} />
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                                            <Text style={[styles.statsText, { color: activeColors.textSecondary }]}>{activeDownload.progress.downloadedSize}</Text>
                                            <Text style={[styles.statsText, { color: activeColors.textSecondary }]}>{Math.round(activeDownload.progress.progress * 100)}%</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 10 }}>
                                            {activeDownload.isPaused ? (
                                                <TouchableOpacity onPress={() => Downloader.resume()} style={[styles.controlBtn, { backgroundColor: activeColors.primary }]}>
                                                    <MaterialIcons name="play-arrow" size={20} color="#fff" />
                                                    <Text style={styles.controlBtnText}>Resume</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <TouchableOpacity onPress={() => Downloader.pause()} style={[styles.controlBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                                    <MaterialIcons name="pause" size={20} color={activeColors.text} />
                                                    <Text style={[styles.controlBtnText, { color: activeColors.text }]}>Pause</Text>
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity onPress={() => Downloader.cancel()} style={[styles.controlBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                                <MaterialIcons name="close" size={20} color="#ef4444" />
                                                <Text style={[styles.controlBtnText, { color: '#ef4444' }]}>Cancel</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </View>
                        ) : null
                    )}
                />
            )}
        </SafeAreaView>
    );
}

export function DownloadsTV() {
    const {
        loading, searchQuery, setSearchQuery, filteredFiles, loadDownloads, handleDelete, handlePlay,
        formatSize, activeColors, router, activeDownload
    } = useDownloadsLogic();

    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const renderItem = ({ item }: { item: DownloadedFile }) => (
        <TVFocusable
            style={[styles.fileCard, { backgroundColor: activeColors.card, borderColor: activeColors.border, flexDirection: 'column', padding: 0, overflow: 'hidden', height: 250, width: 200, margin: 15 }]}
            onPress={() => handlePlay(item)}
            onLongPress={() => handleDelete(item)}
        >
            <View style={[styles.thumbnailContainer, { width: '100%', height: 160, borderRadius: 0, marginRight: 0 }]}>
                {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                ) : (
                    <View style={[styles.placeholderThumbnail, { backgroundColor: activeColors.background }]}>
                        <MaterialIcons name="play-circle-outline" size={48} color={activeColors.primary} />
                    </View>
                )}
                <View style={styles.playOverlay}>
                    <Ionicons name="play-circle" size={40} color="#fff" />
                </View>
            </View>

            <View style={[styles.fileInfo, { padding: 12 }]}>
                <Text style={[styles.fileName, { color: activeColors.text, fontSize: 16 }]} numberOfLines={2}>
                    {item.name}
                </Text>
                <Text style={[styles.fileSize, { color: activeColors.textSecondary, marginTop: 4 }]}>
                    {formatSize(item.size)}
                </Text>
            </View>
        </TVFocusable>
    );

    return (
        <View style={[styles.container, { backgroundColor: activeColors.background, flexDirection: 'row' }]}>
            <View style={{ flex: 1, padding: 30 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: activeColors.text, fontSize: 36 }]}>Downloads</Text>
                        <Text style={{ color: activeColors.textSecondary, marginLeft: 20, fontSize: 18 }}>{filteredFiles.length} videos</Text>
                    </View>
                    <TVFocusable onPress={loadDownloads} style={[styles.refreshBtn, { width: 60, height: 60, borderRadius: 30 }]}>
                        <MaterialIcons name="refresh" size={32} color={activeColors.textSecondary} />
                    </TVFocusable>
                </View>

                <View style={styles.searchContainer}>
                    <TVFocusable
                        style={[
                            styles.searchBar,
                            {
                                backgroundColor: activeColors.card,
                                borderColor: isSearchFocused ? activeColors.primary : activeColors.border,
                                borderWidth: isSearchFocused ? 2 : 1,
                                height: 60
                            }
                        ]}
                        onPress={() => { }}
                    >
                        <MaterialIcons name="search" size={24} color={activeColors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: activeColors.text, fontSize: 18 }]}
                            placeholder="Search your videos..."
                            placeholderTextColor={activeColors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                        />
                    </TVFocusable>
                </View>

                {loading ? (
                    <View style={styles.list}>
                        <ActivityIndicator size="large" color={activeColors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredFiles}
                        renderItem={renderItem}
                        keyExtractor={item => item.uri}
                        numColumns={4}
                        key={'tv-downloads'}
                        contentContainerStyle={[{ paddingBottom: 50 }, filteredFiles.length === 0 && { flexGrow: 1 }]}
                        ListEmptyComponent={(
                            <View style={[styles.emptyState, { marginTop: 40 }]}>
                                <MaterialIcons name="cloud-download" size={80} color={activeColors.textSecondary} />
                                <Text style={[styles.emptyText, { color: activeColors.text, fontSize: 24, marginTop: 20 }]}>No downloads yet</Text>
                            </View>
                        )}
                        ListHeaderComponent={(
                            activeDownload ? (
                                <View style={[styles.activeDownloadCard, { backgroundColor: activeColors.card, borderColor: activeColors.border, margin: 15 }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                        <ActivityIndicator size="small" color={activeColors.primary} style={{ marginRight: 10 }} />
                                        <Text style={[styles.fileName, { color: activeColors.text, flex: 1, marginBottom: 0 }]} numberOfLines={1}>
                                            {activeDownload.fileName}
                                        </Text>
                                    </View>
                                    {activeDownload.progress && (
                                        <>
                                            <View style={styles.progressBarBg}>
                                                <View style={[styles.progressBarFill, { backgroundColor: activeColors.primary, width: `${activeDownload.progress.progress * 100}%` }]} />
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                                                <Text style={[styles.statsText, { color: activeColors.textSecondary }]}>{activeDownload.progress.downloadedSize}</Text>
                                                <Text style={[styles.statsText, { color: activeColors.textSecondary }]}>{Math.round(activeDownload.progress.progress * 100)}%</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 10 }}>
                                                {activeDownload.isPaused ? (
                                                    <TVFocusable onPress={() => Downloader.resume()} style={[styles.controlBtn, { backgroundColor: activeColors.primary }]}>
                                                        <MaterialIcons name="play-arrow" size={20} color="#fff" />
                                                        <Text style={styles.controlBtnText}>Resume</Text>
                                                    </TVFocusable>
                                                ) : (
                                                    <TVFocusable onPress={() => Downloader.pause()} style={[styles.controlBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                                        <MaterialIcons name="pause" size={20} color={activeColors.text} />
                                                        <Text style={[styles.controlBtnText, { color: activeColors.text }]}>Pause</Text>
                                                    </TVFocusable>
                                                )}
                                                <TVFocusable onPress={() => Downloader.cancel()} style={[styles.controlBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                                    <MaterialIcons name="close" size={20} color="#ef4444" />
                                                    <Text style={[styles.controlBtnText, { color: '#ef4444' }]}>Cancel</Text>
                                                </TVFocusable>
                                            </View>
                                        </>
                                    )}
                                </View>
                            ) : null
                        )}
                    />
                )}
            </View>
        </View>
    );
}

export default function DownloadsScreen() {
    return Platform.isTV ? <DownloadsTV /> : <DownloadsMobile />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#060912',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        flex: 1,
    },
    titleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginLeft: 4,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Outfit_700Bold',
    },
    refreshBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#0f1424',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    searchContainer: {
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
    list: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        backgroundColor: '#0f1424',
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    thumbnailContainer: {
        width: 90,
        height: 64,
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 14,
        position: 'relative',
        backgroundColor: '#000',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    placeholderThumbnail: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fileInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    fileName: {
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: 4,
    },
    fileMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fileSize: {
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
        opacity: 0.6,
    },
    fileDate: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        opacity: 0.5,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        marginHorizontal: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    deleteBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: 60
    },
    emptyIconContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#0f1424',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    emptyText: {
        fontSize: 20,
        fontFamily: 'Outfit_700Bold',
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
        marginTop: 8,
        opacity: 0.6,
    },
    activeDownloadCard: {
        padding: 16,
        borderRadius: 24,
        marginBottom: 20,
        borderWidth: 1,
        backgroundColor: '#0f1424',
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    progressBarBg: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    statsText: {
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
    },
    controlBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 4,
    },
    controlBtnText: {
        fontSize: 12,
        fontFamily: 'Outfit_600SemiBold',
        color: '#fff',
    }
});
