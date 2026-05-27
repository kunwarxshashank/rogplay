import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Dimensions,
    Animated,
    FlatList,
    ScrollView,
    Platform,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { BlurView } from 'expo-blur';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
    EpgData,
    EpgProgram,
    formatEpgTime,
    checkEpgIndexed,
    indexEpgBackground,
    getBucketId,
    loadEpgBuckets,
    loadEpgForChannels,
} from '@/services/epgParser';
import { PlaylistItem, parseM3u, parseJsonPlaylist } from '@/services/playlistParser';
import { useIptvStore } from '@/store/iptvStore';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Time constants
const HOUR_WIDTH = Platform.isTV ? 300 : 200;
const CHANNEL_COL_WIDTH = Platform.isTV ? 220 : 160;
const ROW_HEIGHT = Platform.isTV ? 70 : 56;
const TIME_HEADER_HEIGHT = Platform.isTV ? 50 : 40;

/** TV-focusable Pressable */
function TVPressable({ style, focusedStyle, children, ...props }: any) {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <Pressable
            {...props}
            onFocus={(e: any) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e: any) => { setIsFocused(false); props.onBlur?.(e); }}
            style={[style, isFocused && focusedStyle]}
        >
            {children}
        </Pressable>
    );
}

interface EpgSidebarProps {
    visible: boolean;
    onClose: () => void;
    channels?: PlaylistItem[];
    playlistUrl?: string;
    epgUrl?: string;
    currentChannelId?: string;
    onChannelSelect: (channel: PlaylistItem) => void;
}

const EpgSidebar = React.memo(function EpgSidebar({
    visible,
    onClose,
    channels,
    playlistUrl,
    epgUrl,
    currentChannelId,
    onChannelSelect,
}: EpgSidebarProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const [isRendered, setIsRendered] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const gridScrollRef = useRef<ScrollView>(null);
    const channelScrollRef = useRef<FlatList>(null);

    // Stable reference for FlatList viewability config (must not change between renders)
    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10, minimumViewTime: 200 }).current;

    // EPG data managed internally — fetched on-demand when sidebar opens
    const { currentChannels, setCurrentChannels } = useIptvStore();
    const [epgLoading, setEpgLoading] = useState(false);
    const [epgProgressMsg, setEpgProgressMsg] = useState('');
    const [playlistLoading, setPlaylistLoading] = useState(false);
    const epgFetchedRef = useRef(false);
    const playlistFetchedRef = useRef(false);
    const [programCount, setProgramCount] = useState(0);

    // Track which buckets we have already loaded so we don't re-read from disk
    const loadedBucketsRef = useRef<Map<number, EpgProgram[]>>(new Map());
    // Visible programs keyed by channelId — only on-screen channels
    const [visiblePrograms, setVisiblePrograms] = useState<Map<string, EpgProgram[]>>(new Map());
    // Track last visible channel IDs for initial load fallback
    const lastViewableIdsRef = useRef<string[]>([]);

    // Track whether indexing just completed so we can trigger initial load
    const [indexingComplete, setIndexingComplete] = useState(false);
    // Debounce timer for viewability changes
    const loadTimerRef = useRef<any>(null);
    // Track which channel IDs we've already loaded programs for
    const loadedChannelIdsRef = useRef<Set<string>>(new Set());

    // Final channels to display
    const displayChannels = useMemo(() => {
        if (channels && channels.length > 0) return channels;
        return currentChannels;
    }, [channels, currentChannels]);

    // Fetch playlist if needed
    useEffect(() => {
        if (visible && displayChannels.length === 0 && playlistUrl && !playlistFetchedRef.current) {
            playlistFetchedRef.current = true;
            setPlaylistLoading(true);
            (async () => {
                try {
                    let text = '';
                    if (playlistUrl.startsWith('file://')) {
                        text = await FileSystem.readAsStringAsync(playlistUrl);
                    } else {
                        const res = await fetch(playlistUrl);
                        text = await res.text();
                    }

                    let parsed: PlaylistItem[] = [];
                    if (text.includes('#EXTINF')) {
                        parsed = parseM3u(text);
                    } else {
                        try {
                            const json = JSON.parse(text);
                            parsed = parseJsonPlaylist(Array.isArray(json) ? json : [json]);
                        } catch { }
                    }

                    if (parsed.length > 0) {
                        setCurrentChannels(parsed);
                    }
                } catch (e) {
                    console.error('Failed to fetch playlist in EpgSidebar', e);
                } finally {
                    setPlaylistLoading(false);
                }
            })();
        }
    }, [visible, displayChannels.length, playlistUrl]);

    // Initial Indexing Trigger
    useEffect(() => {
        if (visible && epgUrl && !epgFetchedRef.current) {
            epgFetchedRef.current = true;

            // Only index programs for the channels we have
            const relevantIds = displayChannels
                .map(ch => ch.channelId)
                .filter(Boolean) as string[];

            (async () => {
                try {
                    setEpgLoading(true);
                    setEpgProgressMsg('Checking index...');
                    let isIndexed = await checkEpgIndexed(epgUrl);

                    if (!isIndexed) {
                        await indexEpgBackground(epgUrl, (msg) => {
                            setEpgProgressMsg(msg);
                        }, relevantIds);
                    }
                    setEpgLoading(false);
                    setEpgProgressMsg('');
                    setIndexingComplete(true);
                } catch (e) {
                    console.warn('EPG Indexing failed:', e);
                    setEpgLoading(false);
                    setEpgProgressMsg('Error loading EPG');
                }
            })();
        }
    }, [visible, epgUrl, displayChannels]);

    // Helper: given a set of channel IDs, load their buckets and return only programs for those IDs
    const loadProgramsForIds = useCallback(async (channelIds: string[]) => {
        if (!epgUrl || channelIds.length === 0) return new Map<string, EpgProgram[]>();

        // Determine which buckets we need
        const requiredBuckets = new Set<number>();
        for (const id of channelIds) {
            requiredBuckets.add(getBucketId(id));
        }

        // Load buckets we haven't cached yet
        const bucketsToLoad = Array.from(requiredBuckets).filter(bId => !loadedBucketsRef.current.has(bId));
        if (bucketsToLoad.length > 0) {
            try {
                const newPrograms: EpgProgram[] = await loadEpgBuckets(epgUrl, bucketsToLoad);
                for (const bId of bucketsToLoad) {
                    const bucketPrograms = newPrograms.filter((p: EpgProgram) => getBucketId(p.channelId) === bId);
                    loadedBucketsRef.current.set(bId, bucketPrograms);
                }
            } catch (e) {
                console.warn('Failed to load bucket', e);
            }
        }

        // Build map for only the requested channel IDs from all relevant cached buckets
        const idSet = new Set(channelIds);
        const result = new Map<string, EpgProgram[]>();
        for (const bId of requiredBuckets) {
            const cachedBucket = loadedBucketsRef.current.get(bId);
            if (cachedBucket) {
                for (const p of cachedBucket) {
                    if (idSet.has(p.channelId)) {
                        const existing = result.get(p.channelId);
                        if (existing) {
                            existing.push(p);
                        } else {
                            result.set(p.channelId, [p]);
                        }
                    }
                }
            }
        }

        return result;
    }, [epgUrl]);

    // Load initial buckets once indexing is complete (or was already cached)
    useEffect(() => {
        if (!indexingComplete || !epgUrl) return;

        // Load programs for the first few visible channels
        let idsToLoad = lastViewableIdsRef.current;
        if (idsToLoad.length === 0 && displayChannels.length > 0) {
            idsToLoad = displayChannels
                .slice(0, 8)
                .map(ch => ch.channelId)
                .filter(Boolean) as string[];
        }

        if (idsToLoad.length === 0) return;

        loadProgramsForIds(idsToLoad).then(programMap => {
            setVisiblePrograms(programMap);
            setProgramCount(programMap.size);
        });
    }, [indexingComplete, epgUrl, displayChannels, loadProgramsForIds]);

    // Track visible items — only load programs for on-screen channels
    const onViewableItemsChanged = useCallback(async ({ viewableItems }: { viewableItems: any[] }) => {
        if (!epgUrl || viewableItems.length === 0) return;

        const visibleIds = viewableItems
            .map(item => item.item.channelId)
            .filter(Boolean) as string[];

        lastViewableIdsRef.current = visibleIds;

        if (!indexingComplete) return;

        const programMap = await loadProgramsForIds(visibleIds);
        setVisiblePrograms(programMap);
        setProgramCount(programMap.size);
    }, [epgUrl, indexingComplete, loadProgramsForIds]);

    // Animation
    useEffect(() => {
        if (visible) {
            setIsRendered(true);
            Animated.parallel([
                Animated.spring(fadeAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 50,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setIsRendered(false);
                setSearchQuery('');
            });
        }
    }, [visible]);

    // Current time
    const now = useMemo(() => new Date(), [visible]);

    // Time range: 2h before to 4h after
    const timeStart = useMemo(() => {
        const d = new Date(now);
        d.setHours(d.getHours() - 2, 0, 0, 0);
        return d;
    }, [now]);

    const timeEnd = useMemo(() => {
        const d = new Date(now);
        d.setHours(d.getHours() + 4, 0, 0, 0);
        return d;
    }, [now]);

    const totalHours = (timeEnd.getTime() - timeStart.getTime()) / (1000 * 60 * 60);
    const gridTotalWidth = totalHours * HOUR_WIDTH;

    // Time slots (every 30 min)
    const timeSlots = useMemo(() => {
        const slots: Date[] = [];
        const d = new Date(timeStart);
        while (d < timeEnd) {
            slots.push(new Date(d));
            d.setMinutes(d.getMinutes() + 30);
        }
        return slots;
    }, [timeStart, timeEnd]);

    // NOW line offset
    const nowOffset = useMemo(() => {
        const elapsed = now.getTime() - timeStart.getTime();
        const totalMs = timeEnd.getTime() - timeStart.getTime();
        return (elapsed / totalMs) * gridTotalWidth;
    }, [now, timeStart, timeEnd, gridTotalWidth]);

    // Use visible programs directly — already filtered to on-screen channels
    const programsByChannel = useMemo(() => {
        const map = new Map<string, EpgProgram[]>();

        for (const [channelId, progs] of visiblePrograms) {
            const filtered = progs.filter((p: EpgProgram) => p.end > timeStart && p.start < timeEnd);
            if (filtered.length > 0) {
                filtered.sort((a: EpgProgram, b: EpgProgram) => a.start.getTime() - b.start.getTime());
                map.set(channelId, filtered);
            }
        }

        return map;
    }, [visiblePrograms, timeStart, timeEnd]);

    // Filter channels by search
    const filteredChannels = useMemo(() => {
        if (!searchQuery.trim()) return displayChannels;
        const q = searchQuery.toLowerCase();
        return displayChannels.filter(ch =>
            ch.title.toLowerCase().includes(q) ||
            ch.group?.toLowerCase().includes(q)
        );
    }, [displayChannels, searchQuery]);

    // Program layout calculation
    const getProgramLayout = useCallback((program: EpgProgram) => {
        const startMs = Math.max(program.start.getTime(), timeStart.getTime());
        const endMs = Math.min(program.end.getTime(), timeEnd.getTime());
        const totalMs = timeEnd.getTime() - timeStart.getTime();
        const left = ((startMs - timeStart.getTime()) / totalMs) * gridTotalWidth;
        const width = ((endMs - startMs) / totalMs) * gridTotalWidth;
        return { left, width: Math.max(width, 30) };
    }, [timeStart, timeEnd, gridTotalWidth]);

    const isNowPlaying = useCallback((program: EpgProgram) => {
        return program.start <= now && program.end > now;
    }, [now]);

    // Scroll to now on mount
    useEffect(() => {
        if (visible && gridScrollRef.current) {
            const scrollX = Math.max(0, nowOffset - SCREEN_WIDTH * 0.3);
            setTimeout(() => {
                gridScrollRef.current?.scrollTo({ x: scrollX, animated: false });
            }, 300);
        }
    }, [visible, nowOffset]);

    const handleChannelPress = useCallback((channel: PlaylistItem) => {
        onChannelSelect(channel);
        onClose();
    }, [onChannelSelect, onClose]);

    if (!visible && !isRendered) return null;

    // Channel row
    const renderChannelRow = ({ item, index }: { item: PlaylistItem; index: number }) => {
        const isCurrent = item.channelId === currentChannelId;
        const RowComponent = Platform.isTV ? TVPressable : Pressable;
        const progs = programsByChannel.get(item.channelId || '');
        const currentProg = progs?.find(p => p.start <= now && p.end > now);

        return (
            <RowComponent
                onPress={() => handleChannelPress(item)}
                style={[styles.channelRow, isCurrent && styles.channelRowCurrent]}
                {...(Platform.isTV ? {
                    focusedStyle: styles.channelRowFocused,
                    nativeID: `epg-channel-${index}`,
                } : {})}
            >
                {item.imageUrl ? (
                    <OptimizedImage
                        source={{ uri: item.imageUrl }}
                        style={styles.channelLogo}
                        resizeMode="contain"
                    />
                ) : (
                    <View style={styles.channelLogoPlaceholder}>
                        <MaterialIcons name="tv" size={Platform.isTV ? 20 : 16} color="rgba(255,255,255,0.5)" />
                    </View>
                )}
                <View style={styles.channelInfo}>
                    <Text style={[styles.channelName, isCurrent && styles.channelNameCurrent]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    {currentProg ? (
                        <Text style={styles.channelNowPlaying} numberOfLines={1}>{currentProg.title}</Text>
                    ) : item.group ? (
                        <Text style={styles.channelGroup} numberOfLines={1}>{item.group}</Text>
                    ) : null}
                </View>
                {isCurrent && (
                    <View style={styles.playingIndicator}>
                        <View style={styles.playingDot} />
                    </View>
                )}
            </RowComponent>
        );
    };

    // Program grid row
    const renderProgramGridRow = ({ item, index }: { item: PlaylistItem; index: number }) => {
        const programs = programsByChannel.get(item.channelId || '') || [];

        return (
            <View style={styles.programGridRow}>
                {programs.length > 0 ? (
                    programs.map((prog, pi) => {
                        const { left, width } = getProgramLayout(prog);
                        const isNow = isNowPlaying(prog);
                        const isPast = prog.end < now;

                        return (
                            <View
                                key={`${prog.channelId}-${pi}`}
                                style={[
                                    styles.programBlock,
                                    { left, width },
                                    isNow && styles.programBlockNow,
                                    isPast && styles.programBlockPast,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.programTitle,
                                        isNow && styles.programTitleNow,
                                        isPast && styles.programTitlePast,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {prog.title}
                                </Text>
                                <Text style={[styles.programTime, isPast && styles.programTimePast]} numberOfLines={1}>
                                    {formatEpgTime(prog.start)} - {formatEpgTime(prog.end)}
                                </Text>
                            </View>
                        );
                    })
                ) : (
                    <View style={[styles.programBlock, { left: 0, width: gridTotalWidth }]}>
                        <Text style={styles.noDataText}>
                            {epgLoading ? 'Loading...' : 'No program data'}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
            pointerEvents={visible ? 'auto' : 'none'}
        >
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.background} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <MaterialCommunityIcons name="television-guide" size={Platform.isTV ? 28 : 24} color="#388EFF" />
                    <Text style={styles.headerTitle}>Program Guide</Text>
                    <Text style={styles.headerDate}>
                        {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                    {epgLoading && (
                        <View style={styles.loadingBadge}>
                            <ActivityIndicator size="small" color="#388EFF" />
                            <Text style={styles.loadingBadgeText}>{epgProgressMsg || 'Loading EPG...'}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.headerRight}>
                    <View style={styles.searchContainer}>
                        <MaterialIcons name="search" size={18} color="rgba(255,255,255,0.4)" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search channels..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {Platform.isTV ? (
                        <TVPressable
                            onPress={onClose}
                            style={styles.closeButton}
                            focusedStyle={styles.closeButtonFocused}
                            nativeID="epg-close"
                        >
                            <MaterialIcons name="close" size={24} color="#fff" />
                        </TVPressable>
                    ) : (
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color="#fff" />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* EPG Grid */}
            <View style={styles.gridContainer}>
                {/* Time header */}
                <View style={styles.gridTop}>
                    <View style={styles.cornerCell}>
                        <Text style={styles.cornerTime}>{formatEpgTime(now)}</Text>
                    </View>
                    <ScrollView
                        ref={gridScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.timeHeaderScroll}
                        scrollEventThrottle={16}
                    >
                        <View style={[styles.timeHeaderRow, { width: gridTotalWidth }]}>
                            {timeSlots.map((slot, i) => {
                                const offset = ((slot.getTime() - timeStart.getTime()) / (timeEnd.getTime() - timeStart.getTime())) * gridTotalWidth;
                                return (
                                    <View key={i} style={[styles.timeSlot, { left: offset }]}>
                                        <Text style={styles.timeSlotText}>{formatEpgTime(slot)}</Text>
                                        <View style={styles.timeSlotLine} />
                                    </View>
                                );
                            })}
                            <View style={[styles.nowLine, { left: nowOffset }]}>
                                <View style={styles.nowDot} />
                                <View style={styles.nowLineBar} />
                            </View>
                        </View>
                    </ScrollView>
                </View>

                {/* Main grid body */}
                <View style={styles.gridBody}>
                    {/* Channel list */}
                    <FlatList
                        ref={channelScrollRef}
                        data={filteredChannels}
                        renderItem={renderChannelRow}
                        keyExtractor={(item, index) => `${item.id}-${index}`}
                        style={styles.channelList}
                        contentContainerStyle={styles.channelListContent}
                        showsVerticalScrollIndicator={false}
                        getItemLayout={(_, i) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * i, index: i })}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                        scrollEventThrottle={16}
                        initialNumToRender={10}
                        maxToRenderPerBatch={8}
                        windowSize={3}
                        extraData={visiblePrograms}
                    />
                    <ScrollView
                        horizontal
                        style={styles.programGridHorizontal}
                        showsHorizontalScrollIndicator={false}
                        onScroll={(e) => {
                            gridScrollRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
                        }}
                        scrollEventThrottle={16}
                    >
                        <FlatList
                            data={filteredChannels}
                            renderItem={renderProgramGridRow}
                            keyExtractor={(item, index) => `prog-${item.id}-${index}`}
                            style={{ width: gridTotalWidth }}
                            contentContainerStyle={styles.programGridContent}
                            showsVerticalScrollIndicator={false}
                            getItemLayout={(_, i) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * i, index: i })}
                            onScroll={(e) => {
                                channelScrollRef.current?.scrollToOffset({ offset: e.nativeEvent.contentOffset.y, animated: false });
                            }}
                            scrollEventThrottle={16}
                            initialNumToRender={10}
                            maxToRenderPerBatch={8}
                            windowSize={3}
                            extraData={visiblePrograms}
                        />
                        <View style={[styles.nowLineVertical, { left: nowOffset }]} pointerEvents="none" />
                    </ScrollView>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {filteredChannels.length} channels
                    {programCount > 0 ? ` · ${programCount} programs` : ''}
                </Text>
            </View>
        </Animated.View>
    );
});

export default EpgSidebar;

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(8,12,32,0.2)',
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Platform.isTV ? 30 : 16,
        paddingTop: Platform.isTV ? 20 : Platform.OS === 'android' ? 10 : 50,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerTitle: {
        color: '#fff',
        fontSize: Platform.isTV ? 22 : 18,
        fontWeight: '700',
    },
    headerDate: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: Platform.isTV ? 16 : 13,
        marginLeft: 6,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    loadingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(56,142,255,0.15)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginLeft: 10,
        gap: 6,
    },
    loadingBadgeText: {
        color: '#388EFF',
        fontSize: Platform.isTV ? 13 : 11,
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 20,
        paddingHorizontal: 12,
        height: Platform.isTV ? 40 : 34,
        width: Platform.isTV ? 250 : 180,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: Platform.isTV ? 15 : 13,
        marginLeft: 8,
        padding: 0,
    },
    closeButton: {
        width: Platform.isTV ? 44 : 36,
        height: Platform.isTV ? 44 : 36,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    closeButtonFocused: {
        borderColor: '#fff',
        backgroundColor: 'rgba(255,255,255,0.25)',
        transform: [{ scale: 1.1 }],
    },
    // Grid
    gridContainer: {
        flex: 1,
    },
    gridTop: {
        flexDirection: 'row',
        height: TIME_HEADER_HEIGHT,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    cornerCell: {
        width: CHANNEL_COL_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.06)',
    },
    cornerTime: {
        color: '#388EFF',
        fontSize: Platform.isTV ? 16 : 13,
        fontWeight: '700',
    },
    timeHeaderScroll: {
        flex: 1,
    },
    timeHeaderRow: {
        height: TIME_HEADER_HEIGHT,
        position: 'relative',
    },
    timeSlot: {
        position: 'absolute',
        top: 0,
        height: TIME_HEADER_HEIGHT,
        justifyContent: 'center',
    },
    timeSlotText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: Platform.isTV ? 13 : 11,
        fontWeight: '600',
        paddingLeft: 8,
    },
    timeSlotLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 1,
        height: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    nowLine: {
        position: 'absolute',
        top: 0,
        height: TIME_HEADER_HEIGHT,
        alignItems: 'center',
        zIndex: 10,
    },
    nowDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#E53935',
        marginTop: 4,
        shadowColor: '#E53935',
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 3,
    },
    nowLineBar: {
        width: 2,
        flex: 1,
        backgroundColor: '#E53935',
    },
    // Grid body
    gridBody: {
        flex: 1,
        flexDirection: 'row',
    },
    // Channel column
    channelList: {
        width: CHANNEL_COL_WIDTH,
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.06)',
    },
    channelListContent: {
        paddingBottom: 40,
    },
    channelRow: {
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Platform.isTV ? 14 : 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        borderWidth: 2,
        borderColor: 'transparent',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    channelRowCurrent: {
        backgroundColor: 'rgba(56,142,255,0.18)',
        borderLeftWidth: 3,
        borderLeftColor: '#388EFF',
    },
    channelRowFocused: {
        borderColor: '#388EFF',
        backgroundColor: 'rgba(56,142,255,0.2)',
    },
    channelLogo: {
        width: Platform.isTV ? 40 : 32,
        height: Platform.isTV ? 40 : 32,
        borderRadius: Platform.isTV ? 8 : 6,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    channelLogoPlaceholder: {
        width: Platform.isTV ? 40 : 32,
        height: Platform.isTV ? 40 : 32,
        borderRadius: Platform.isTV ? 8 : 6,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    channelInfo: {
        flex: 1,
        marginLeft: 10,
    },
    channelName: {
        color: '#fff',
        fontSize: Platform.isTV ? 14 : 12,
        fontWeight: '600',
    },
    channelNameCurrent: {
        color: '#388EFF',
    },
    channelNowPlaying: {
        color: 'rgba(56,142,255,0.8)',
        fontSize: Platform.isTV ? 11 : 10,
        marginTop: 1,
    },
    channelGroup: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: Platform.isTV ? 11 : 10,
        marginTop: 1,
    },
    playingIndicator: {
        marginLeft: 6,
    },
    playingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E53935',
        shadowColor: '#E53935',
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 2,
    },
    // Program grid
    programGridHorizontal: {
        flex: 1,
    },
    programGridContent: {
        paddingBottom: 40,
    },
    programGridRow: {
        height: ROW_HEIGHT,
        position: 'relative',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.04)',
    },
    programBlock: {
        position: 'absolute',
        top: 4,
        height: ROW_HEIGHT - 8,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 6,
        paddingHorizontal: 8,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
    },
    programBlockNow: {
        backgroundColor: 'rgba(56,142,255,0.22)',
        borderColor: 'rgba(56,142,255,0.4)',
    },
    programBlockPast: {
        opacity: 0.4,
    },
    programTitle: {
        color: '#fff',
        fontSize: Platform.isTV ? 13 : 11,
        fontWeight: '600',
    },
    programTitleNow: {
        color: '#fff',
        fontWeight: '700',
    },
    programTitlePast: {
        color: 'rgba(255,255,255,0.5)',
    },
    programTime: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: Platform.isTV ? 11 : 9,
        marginTop: 1,
    },
    programTimePast: {
        color: 'rgba(255,255,255,0.25)',
    },
    noDataText: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: Platform.isTV ? 12 : 10,
        fontStyle: 'italic',
    },
    nowLineVertical: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: '#E53935',
        zIndex: 10,
        shadowColor: '#E53935',
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 3,
    },
    footer: {
        paddingHorizontal: Platform.isTV ? 30 : 16,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    footerText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: Platform.isTV ? 13 : 11,
    },
});
