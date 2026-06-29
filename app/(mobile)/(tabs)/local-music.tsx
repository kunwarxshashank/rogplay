import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
    Modal, Alert, Dimensions, Platform, RefreshControl, Animated,
    ActivityIndicator, StatusBar, Pressable
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMusicPlayerStore } from '@/store/musicPlayerStore';
import { useLocalPlaylistStore, LocalPlaylist } from '@/store/localPlaylistStore';
import { useLocalMusic } from '@/hooks/useLocalMusic';
import { useFavoritesStore } from '@/store/favoritesStore';
import type { MusicTrack } from '@/components/player/MusicPlayer';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = 48;

const GRADIENT_PAIRS: [string, string][] = [
    ['#6366f1', '#8b5cf6'],
    ['#ec4899', '#f43f5e'],
    ['#f59e0b', '#f97316'],
    ['#10b981', '#06b6d4'],
    ['#3b82f6', '#6366f1'],
    ['#8b5cf6', '#d946ef'],
    ['#14b8a6', '#10b981'],
    ['#f97316', '#ef4444'],
];

function getGradient(id: string): [string, string] {
    const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return GRADIENT_PAIRS[hash % GRADIENT_PAIRS.length];
}

function getInitials(title: string) {
    const words = title.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return (words[0]?.slice(0, 2) || 'MU').toUpperCase();
}

function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const SORT_OPTIONS: { key: 'title' | 'artist' | 'duration' | 'modificationTime'; label: string; icon: string }[] = [
    { key: 'title', label: 'Name', icon: 'sort-by-alpha' },
    { key: 'duration', label: 'Duration', icon: 'timer' },
    { key: 'modificationTime', label: 'Recent', icon: 'access-time' },
];

export default function LocalMusicScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: activeColors } = useTheme();

    const {
        tracks, filteredTracks, loading, refreshing, searchQuery, setSearchQuery,
        sortBy, setSortBy, sortOrder, setSortOrder, onRefresh, formatDuration,
    } = useLocalMusic();

    const setTracks = useMusicPlayerStore(s => s.setTracks);
    const storeTracks = useMusicPlayerStore(s => s.tracks);
    const storeCurrentIndex = useMusicPlayerStore(s => s.currentIndex);
    const playNext = useMusicPlayerStore(s => s.nextTrack);

    const { playlists, createPlaylist, deletePlaylist, addTrackToPlaylist } = useLocalPlaylistStore();

    const [showSearch, setShowSearch] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
    const [showOptions, setShowOptions] = useState(false);
    const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [showSortPicker, setShowSortPicker] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [showPlaylists, setShowPlaylists] = useState(false);
    const [showFilter, setShowFilter] = useState(false);

    const favoriteItems = useFavoritesStore(s => s.items);
    const musicFavorites = useMemo(() => favoriteItems.filter(f => f.kind === 'music'), [favoriteItems]);

    const searchAnim = useRef(new Animated.Value(0)).current;
    const searchInputRef = useRef<TextInput>(null);

    const toggleSearch = useCallback(() => {
        setShowSearch(s => {
            const next = !s;
            Animated.timing(searchAnim, {
                toValue: next ? 1 : 0,
                duration: 250,
                useNativeDriver: false,
            }).start();
            if (!next) {
                setSearchQuery('');
                searchInputRef.current?.blur();
            } else {
                setTimeout(() => searchInputRef.current?.focus(), 100);
            }
            return next;
        });
    }, [searchAnim, setSearchQuery]);

    const handlePlayTrack = useCallback((track: MusicTrack, index: number) => {
        const encoded = encodeURIComponent(JSON.stringify(filteredTracks));
        setTracks(filteredTracks, index);
        router.push(`/(mobile)/music-player?tracks=${encoded}&index=${index}`);
    }, [filteredTracks, setTracks, router]);

    const handleOptions = useCallback((track: MusicTrack) => {
        setSelectedTrack(track);
        setShowOptions(true);
    }, []);

    const handleAddToPlaylist = useCallback((playlistId: string) => {
        if (selectedTrack) {
            addTrackToPlaylist(playlistId, selectedTrack);
            setShowPlaylistPicker(false);
            setShowOptions(false);
            setSelectedTrack(null);
        }
    }, [selectedTrack, addTrackToPlaylist]);

    const handleCreatePlaylist = useCallback(() => {
        if (!newPlaylistName.trim()) return;
        const id = createPlaylist(newPlaylistName.trim());
        setNewPlaylistName('');
        setShowCreatePlaylist(false);
        if (selectedTrack) {
            addTrackToPlaylist(id, selectedTrack);
            setShowPlaylistPicker(false);
            setShowOptions(false);
            setSelectedTrack(null);
        }
    }, [newPlaylistName, createPlaylist, selectedTrack, addTrackToPlaylist]);

    const toggleSort = useCallback((key: typeof sortBy) => {
        if (sortBy === key) {
            setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder('desc');
        }
    }, [sortBy, sortOrder]);

    const searchWidth = searchAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, SCREEN_WIDTH - 32],
    });

    const renderTrack = useCallback(({ item, index }: { item: MusicTrack; index: number }) => {
        const gradient = getGradient(item.id);
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handlePlayTrack(item, index)}
                onLongPress={() => handleOptions(item)}
                style={[styles.trackItem, { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 }]}
            >
                {/* Artwork */}
                <LinearGradient colors={gradient} style={styles.artwork}>
                    <Text style={styles.artworkText}>{getInitials(item.title)}</Text>
                </LinearGradient>

                {/* Info */}
                <View style={styles.trackInfo}>
                    <Text style={[styles.trackTitle, { color: activeColors.text }]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={[styles.trackArtist, { color: activeColors.textSecondary }]} numberOfLines={1}>
                        {item.artist || 'Unknown Artist'}
                    </Text>
                </View>

                {/* Duration */}
                <Text style={[styles.duration, { color: activeColors.textMuted }]}>
                    {formatTime(item.duration || 0)}
                </Text>

                {/* More */}
                <TouchableOpacity
                    onPress={() => handleOptions(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.moreBtn}
                >
                    <MaterialIcons name="more-vert" size={20} color={activeColors.textSecondary} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    }, [activeColors, handlePlayTrack, handleOptions]);

    const renderHeader = () => (
        <View>
            {/* Action Cards */}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    onPress={() => router.push('/(mobile)/favourites')}
                    style={[styles.actionCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#ec4899' + '20' }]}>
                        <MaterialIcons name="favorite" size={22} color="#ec4899" />
                    </View>
                    <Text style={[styles.actionLabel, { color: activeColors.text }]}>Favourites</Text>
                    <Text style={[styles.actionCount, { color: activeColors.textMuted }]}>
                        {musicFavorites.length} items
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setShowPlaylists(true)}
                    style={[styles.actionCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}
                >
                    <View style={[styles.actionIcon, { backgroundColor: activeColors.primary + '20' }]}>
                        <MaterialIcons name="playlist-play" size={22} color={activeColors.primary} />
                    </View>
                    <Text style={[styles.actionLabel, { color: activeColors.text }]}>Playlists</Text>
                    <Text style={[styles.actionCount, { color: activeColors.textMuted }]}>
                        {playlists.length} playlists
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        setSortBy('modificationTime');
                        setSortOrder('desc');
                    }}
                    style={[styles.actionCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#10b981' + '20' }]}>
                        <MaterialIcons name="access-time" size={22} color="#10b981" />
                    </View>
                    <Text style={[styles.actionLabel, { color: activeColors.text }]}>Recent</Text>
                    <Text style={[styles.actionCount, { color: activeColors.textMuted }]}>
                        {filteredTracks.length} tracks
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyState}>
                <LinearGradient
                    colors={[activeColors.primary + '20', activeColors.surface]}
                    style={styles.emptyIcon}
                >
                    <MaterialIcons name="library-music" size={48} color={activeColors.primary + '80'} />
                </LinearGradient>
                <Text style={[styles.emptyTitle, { color: activeColors.text }]}>
                    {searchQuery ? 'No Results' : 'No Music Found'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: activeColors.textSecondary }]}>
                    {searchQuery
                        ? 'Try a different search term'
                        : 'Download music files to your device to see them here'}
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: activeColors.background }]}>
            <StatusBar barStyle="light-content" />

            {/* Dark Luxury Gradient */}
            {activeColors.isAmoled ? (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
            ) : (
                <LinearGradient
                    colors={[activeColors.primary + '30', activeColors.background + 'FA', activeColors.background]}
                    locations={[0, 0.25, 1]}
                    style={StyleSheet.absoluteFill}
                />
            )}
            {!activeColors.isAmoled && (
              <View style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: activeColors.primary + '15', transform: [{ scale: 2 }] }} />
            )}

            {/* Header always visible, outside FlatList to keep search bar stable */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View>
                    <Text style={[styles.title, { color: activeColors.text }]}>My Music</Text>
                    <Text style={[styles.subtitle, { color: activeColors.primary }]}>
                        {filteredTracks.length} tracks available
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={() => setShowFilter(true)}
                        style={[styles.iconBtn, { backgroundColor: activeColors.surface }]}
                    >
                        <MaterialIcons name="filter-list" size={22} color={activeColors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={toggleSearch}
                        style={[styles.iconBtn, { backgroundColor: activeColors.surface }]}
                    >
                        <MaterialIcons name="search" size={22} color={activeColors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar - outside FlatList to prevent remount on re-render */}
            <Animated.View
                style={[styles.searchContainer, { width: searchWidth, opacity: searchAnim }]}
                pointerEvents={showSearch ? 'auto' : 'none'}
            >
                <DebouncedSearchBar
                    onSearch={setSearchQuery}
                    colors={activeColors}
                    inputRef={searchInputRef}
                />
            </Animated.View>

            {loading && tracks.length === 0 ? (
                <View style={[styles.loadingContainer, { paddingTop: insets.top + 100 }]}>
                    <ActivityIndicator size="large" color={activeColors.primary} />
                    <Text style={[styles.loadingText, { color: activeColors.textSecondary }]}>
                        Scanning device...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredTracks}
                    keyExtractor={item => item.id}
                    renderItem={renderTrack}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={activeColors.primary}
                            colors={[activeColors.primary]}
                        />
                    }
                    getItemLayout={(_, index) => ({
                        length: 68,
                        offset: 68 * index,
                        index,
                    })}
                />
            )}

            {/* Options Modal */}
            <Modal visible={showOptions} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowOptions(false)}
                >
                    {activeColors.isAmoled ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} /> : <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
                    <View style={[styles.optionsSheet, { backgroundColor: activeColors.surface }]}>
                        {selectedTrack && (
                            <View style={styles.optionsTrackInfo}>
                                <LinearGradient colors={getGradient(selectedTrack.id)} style={styles.optionsArt}>
                                    <Text style={styles.optionsArtText}>{getInitials(selectedTrack.title)}</Text>
                                </LinearGradient>
                                <View style={styles.optionsTrackText}>
                                    <Text style={[styles.optionsTrackTitle, { color: activeColors.text }]} numberOfLines={1}>
                                        {selectedTrack.title}
                                    </Text>
                                    <Text style={[styles.optionsTrackArtist, { color: activeColors.textSecondary }]} numberOfLines={1}>
                                        {selectedTrack.artist || 'Unknown Artist'}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.optionRow}
                            onPress={() => {
                                setShowOptions(false);
                                setShowPlaylistPicker(true);
                            }}
                        >
                            <MaterialIcons name="playlist-add" size={22} color={activeColors.text} />
                            <Text style={[styles.optionText, { color: activeColors.text }]}>Add to Playlist</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Playlist Picker Modal */}
            <Modal visible={showPlaylistPicker} transparent animationType="slide">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPlaylistPicker(false)}
                >
                    {activeColors.isAmoled ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} /> : <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
                    <View style={[styles.pickerSheet, { backgroundColor: activeColors.surface }]}>
                        <Text style={[styles.pickerTitle, { color: activeColors.text }]}>Add to Playlist</Text>

                        <TouchableOpacity
                            style={[styles.createPlaylistBtn, { borderColor: activeColors.border }]}
                            onPress={() => {
                                setShowPlaylistPicker(false);
                                setShowCreatePlaylist(true);
                            }}
                        >
                            <MaterialIcons name="playlist-add" size={22} color={activeColors.primary} />
                            <Text style={[styles.createPlaylistText, { color: activeColors.primary }]}>New Playlist</Text>
                        </TouchableOpacity>

                        {playlists.length === 0 ? (
                            <Text style={[styles.noPlaylists, { color: activeColors.textSecondary }]}>
                                No playlists yet
                            </Text>
                        ) : (
                            <FlatList
                                data={playlists}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.playlistItem, { borderBottomColor: activeColors.border }]}
                                        onPress={() => handleAddToPlaylist(item.id)}
                                    >
                                        <LinearGradient colors={getGradient(item.id)} style={styles.playlistIcon}>
                                            <MaterialIcons name="playlist-play" size={20} color="#fff" />
                                        </LinearGradient>
                                        <View style={styles.playlistInfo}>
                                            <Text style={[styles.playlistName, { color: activeColors.text }]} numberOfLines={1}>
                                                {item.name}
                                            </Text>
                                            <Text style={[styles.playlistCount, { color: activeColors.textSecondary }]}>
                                                {item.tracks.length} tracks
                                            </Text>
                                        </View>
                                        <MaterialIcons name="chevron-right" size={22} color={activeColors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Create Playlist Modal */}
            <Modal visible={showCreatePlaylist} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCreatePlaylist(false)}
                >
                    {activeColors.isAmoled ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} /> : <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
                    <View style={[styles.createSheet, { backgroundColor: activeColors.card }]}>
                        <Text style={[styles.createTitle, { color: activeColors.text }]}>New Playlist</Text>
                        <TextInput
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                            placeholder="Playlist name"
                            placeholderTextColor={activeColors.textMuted}
                            style={[styles.createInput, { backgroundColor: activeColors.surface, color: activeColors.text, borderColor: activeColors.border }]}
                            autoFocus
                        />
                        <View style={styles.createActions}>
                            <TouchableOpacity
                                onPress={() => { setShowCreatePlaylist(false); setNewPlaylistName(''); }}
                                style={[styles.createCancel, { borderColor: activeColors.border }]}
                            >
                                <Text style={[styles.createCancelText, { color: activeColors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleCreatePlaylist}
                                style={[styles.createConfirm, { backgroundColor: activeColors.primary }]}
                            >
                                <Text style={styles.createConfirmText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Filter Modal */}
            <Modal visible={showFilter} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowFilter(false)}
                >
                    {activeColors.isAmoled ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} /> : <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
                    <View style={[styles.filterSheet, { backgroundColor: activeColors.surface }]}>
                        <Text style={[styles.filterTitle, { color: activeColors.text }]}>Sort & Filter</Text>

                        <View style={styles.filterOptions}>
                            {SORT_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[
                                        styles.filterOption,
                                        { borderColor: sortBy === opt.key ? activeColors.primary + '40' : activeColors.border },
                                        { backgroundColor: sortBy === opt.key ? activeColors.primary + '15' : 'transparent' },
                                    ]}
                                    onPress={() => {
                                        if (sortBy === opt.key) {
                                            setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                                        } else {
                                            setSortBy(opt.key);
                                            setSortOrder('desc');
                                        }
                                    }}
                                >
                                    <MaterialIcons name={opt.icon as any} size={20} color={sortBy === opt.key ? activeColors.primary : activeColors.textSecondary} />
                                    <Text style={[styles.filterOptionText, { color: sortBy === opt.key ? activeColors.primary : activeColors.text }]}>
                                        {opt.label}
                                    </Text>
                                    {sortBy === opt.key && (
                                        <MaterialIcons
                                            name={sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'}
                                            size={16}
                                            color={activeColors.primary}
                                        />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Playlists Overview Modal */}
            <Modal visible={showPlaylists} transparent animationType="slide">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPlaylists(false)}
                >
                    {activeColors.isAmoled ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} /> : <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
                    <View style={[styles.pickerSheet, { backgroundColor: activeColors.surface, maxHeight: '70%' }]}>
                        <View style={styles.pickerHeader}>
                            <Text style={[styles.pickerTitle, { color: activeColors.text }]}>Your Playlists</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowPlaylists(false);
                                    setShowCreatePlaylist(true);
                                }}
                                style={[styles.addPlaylistBtn, { backgroundColor: activeColors.primary + '20' }]}
                            >
                                <MaterialIcons name="add" size={22} color={activeColors.primary} />
                            </TouchableOpacity>
                        </View>

                        {playlists.length === 0 ? (
                            <View style={styles.emptyPlaylists}>
                                <MaterialIcons name="playlist-play" size={48} color={activeColors.textMuted} />
                                <Text style={[styles.emptyPlaylistsText, { color: activeColors.textSecondary }]}>
                                    No playlists yet
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowPlaylists(false);
                                        setShowCreatePlaylist(true);
                                    }}
                                    style={[styles.emptyPlaylistsBtn, { backgroundColor: activeColors.primary }]}
                                >
                                    <Text style={styles.emptyPlaylistsBtnText}>Create Playlist</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <FlatList
                                data={playlists}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <View style={[styles.playlistItemRow, { borderBottomColor: activeColors.border }]}>
                                        <TouchableOpacity
                                            style={styles.playlistItemContent}
                                            onPress={() => {
                                                if (item.tracks.length > 0) {
                                                    const encoded = encodeURIComponent(JSON.stringify(item.tracks));
                                                    setTracks(item.tracks, 0);
                                                    router.push(`/(mobile)/music-player?tracks=${encoded}&index=0`);
                                                    setShowPlaylists(false);
                                                }
                                            }}
                                        >
                                            <LinearGradient colors={getGradient(item.id)} style={styles.playlistIcon}>
                                                <MaterialIcons name="playlist-play" size={20} color="#fff" />
                                            </LinearGradient>
                                            <View style={styles.playlistInfo}>
                                                <Text style={[styles.playlistName, { color: activeColors.text }]} numberOfLines={1}>
                                                    {item.name}
                                                </Text>
                                                <Text style={[styles.playlistCount, { color: activeColors.textSecondary }]}>
                                                    {item.tracks.length} tracks
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                Alert.alert('Delete Playlist', `Delete "${item.name}"?`, [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(item.id) },
                                                ]);
                                            }}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            style={styles.deletePlaylistBtn}
                                        >
                                            <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const DebouncedSearchBar = memo(({ onSearch, colors, inputRef }: { onSearch: (q: string) => void; colors: any; inputRef: React.RefObject<TextInput | null> }) => {
    const [localQuery, setLocalQuery] = useState('');
    const timerRef = useRef<any>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const onChangeText = useCallback((text: string) => {
        setLocalQuery(text);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            onSearch(text);
        }, 300);
    }, [onSearch]);

    const onClear = useCallback(() => {
        setLocalQuery('');
        if (timerRef.current) clearTimeout(timerRef.current);
        onSearch('');
    }, [onSearch]);

    return (
        <View style={[styles.searchBar, { backgroundColor: colors.surface + '80', borderColor: colors.primary + '40' }]}>
            <MaterialIcons name="search" size={20} color={colors.textSecondary} />
            <TextInput
                ref={inputRef}
                value={localQuery}
                onChangeText={onChangeText}
                placeholder="Search tracks..."
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
            />
            {localQuery.length > 0 && (
                <TouchableOpacity onPress={onClear}>
                    <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        alignSelf: 'center',
        overflow: 'hidden',
        marginBottom: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        padding: 0,
    },
    actionRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 10,
    },
    actionCard: {
        flex: 1,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        gap: 6,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    actionCount: {
        fontSize: 11,
        fontWeight: '500',
    },
    filterSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
    },
    filterTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    filterOptions: {
        gap: 8,
    },
    filterOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    filterOptionText: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    playlistItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 0.5,
        paddingVertical: 4,
    },
    playlistItemContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    deletePlaylistBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 76,
        borderBottomWidth: 0,
        marginHorizontal: 12,
        marginBottom: 8,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    artwork: {
        width: ARTWORK_SIZE,
        height: ARTWORK_SIZE,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    artworkText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    trackInfo: {
        flex: 1,
        marginLeft: 14,
        marginRight: 12,
    },
    trackTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    trackArtist: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 3,
    },
    duration: {
        fontSize: 12,
        fontWeight: '500',
        marginRight: 4,
    },
    moreBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    optionsSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
    },
    optionsTrackInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    optionsArt: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionsArtText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
    },
    optionsTrackText: {
        flex: 1,
        marginLeft: 14,
    },
    optionsTrackTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    optionsTrackArtist: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 14,
    },
    optionText: {
        fontSize: 15,
        fontWeight: '600',
    },
    pickerSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
        maxHeight: '60%',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    addPlaylistBtn: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createPlaylistBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        marginBottom: 12,
    },
    createPlaylistText: {
        fontSize: 15,
        fontWeight: '600',
    },
    noPlaylists: {
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 20,
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 0.5,
    },
    playlistIcon: {
        width: 42,
        height: 42,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playlistInfo: {
        flex: 1,
        marginLeft: 14,
    },
    playlistName: {
        fontSize: 15,
        fontWeight: '600',
    },
    playlistCount: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    createSheet: {
        marginHorizontal: 24,
        borderRadius: 20,
        padding: 24,
        marginBottom: 40,
    },
    createTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    createInput: {
        height: 48,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 15,
        fontWeight: '500',
        borderWidth: 1,
        marginBottom: 16,
    },
    createActions: {
        flexDirection: 'row',
        gap: 12,
    },
    createCancel: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createCancelText: {
        fontSize: 15,
        fontWeight: '600',
    },
    createConfirm: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createConfirmText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    emptyPlaylists: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyPlaylistsText: {
        fontSize: 15,
        fontWeight: '500',
        marginTop: 12,
        marginBottom: 20,
    },
    emptyPlaylistsBtn: {
        paddingHorizontal: 24,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyPlaylistsBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
});
