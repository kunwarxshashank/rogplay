import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Dimensions,
    Animated,
    FlatList,
    Platform,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/hooks/useTheme';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
    EpgProgram,
    formatEpgTime,
    checkEpgIndexed,
    indexEpgBackground,
    getBucketId,
    loadEpgBuckets,
} from '@/services/epgParser';
import { PlaylistItem, parseM3u, parseJsonPlaylist } from '@/services/playlistParser';
import { useIptvStore } from '@/store/iptvStore';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SIDEBAR_WIDTH = Platform.isTV ? 450 : Math.min(400, SCREEN_WIDTH * 0.45);
const ROW_HEIGHT = Platform.isTV ? 90 : 80;

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
    const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
    const [isRendered, setIsRendered] = useState(false);
    const { colors: epgColors } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10, minimumViewTime: 200 }).current;

    const { currentChannels, setCurrentChannels } = useIptvStore();
    const [epgLoading, setEpgLoading] = useState(false);
    const [epgProgressMsg, setEpgProgressMsg] = useState('');
    const [playlistLoading, setPlaylistLoading] = useState(false);
    const epgFetchedRef = useRef(false);
    const playlistFetchedRef = useRef(false);
    const [programCount, setProgramCount] = useState(0);

    const loadedBucketsRef = useRef<Map<number, EpgProgram[]>>(new Map());
    const [visiblePrograms, setVisiblePrograms] = useState<Map<string, EpgProgram[]>>(new Map());
    const lastViewableIdsRef = useRef<string[]>([]);
    const [indexingComplete, setIndexingComplete] = useState(false);

    const displayChannels = useMemo(() => {
        if (channels && channels.length > 0) return channels;
        return currentChannels;
    }, [channels, currentChannels]);

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

    useEffect(() => {
        if (visible && epgUrl && !epgFetchedRef.current) {
            epgFetchedRef.current = true;

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

    const loadProgramsForIds = useCallback(async (channelIds: string[]) => {
        if (!epgUrl || channelIds.length === 0) return new Map<string, EpgProgram[]>();

        const requiredBuckets = new Set<number>();
        for (const id of channelIds) {
            requiredBuckets.add(getBucketId(id));
        }

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

    useEffect(() => {
        if (!indexingComplete || !epgUrl) return;

        let idsToLoad = lastViewableIdsRef.current;
        if (idsToLoad.length === 0 && displayChannels.length > 0) {
            idsToLoad = displayChannels
                .slice(0, 15)
                .map(ch => ch.channelId)
                .filter(Boolean) as string[];
        }

        if (idsToLoad.length === 0) return;

        loadProgramsForIds(idsToLoad).then(programMap => {
            setVisiblePrograms(programMap);
            setProgramCount(programMap.size);
        });
    }, [indexingComplete, epgUrl, displayChannels, loadProgramsForIds]);

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
                    toValue: SIDEBAR_WIDTH,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setIsRendered(false);
                setSearchQuery('');
            });
        }
    }, [visible]);

    const [now, setNow] = useState(new Date());

    useEffect(() => {
        if (!visible) return;
        const interval = setInterval(() => {
            setNow(new Date());
        }, 60000);
        return () => clearInterval(interval);
    }, [visible]);

    const programsByChannel = useMemo(() => {
        const map = new Map<string, { current?: EpgProgram, next?: EpgProgram }>();

        for (const [channelId, progs] of visiblePrograms) {
            progs.sort((a, b) => a.start.getTime() - b.start.getTime());
            const current = progs.find(p => p.start <= now && p.end > now);
            const nextIndex = current ? progs.indexOf(current) + 1 : progs.findIndex(p => p.start > now);
            const next = nextIndex >= 0 && nextIndex < progs.length ? progs[nextIndex] : undefined;
            map.set(channelId, { current, next });
        }

        return map;
    }, [visiblePrograms, now]);

    const filteredChannels = useMemo(() => {
        if (!searchQuery.trim()) return displayChannels;
        const q = searchQuery.toLowerCase();
        return displayChannels.filter(ch =>
            ch.title.toLowerCase().includes(q) ||
            ch.group?.toLowerCase().includes(q)
        );
    }, [displayChannels, searchQuery]);

    const handleChannelPress = useCallback((channel: PlaylistItem) => {
        onChannelSelect(channel);
        onClose();
    }, [onChannelSelect, onClose]);

    if (!visible && !isRendered) return null;

    const renderChannelRow = ({ item, index }: { item: PlaylistItem; index: number }) => {
        const isCurrent = item.channelId === currentChannelId;
        const RowComponent = Platform.isTV ? TVPressable : Pressable;
        const progData = programsByChannel.get(item.channelId || '');
        const currentProg = progData?.current;
        const nextProg = progData?.next;

        let progress = 0;
        if (currentProg) {
            const total = currentProg.end.getTime() - currentProg.start.getTime();
            const elapsed = now.getTime() - currentProg.start.getTime();
            progress = Math.max(0, Math.min(100, (elapsed / total) * 100));
        }

        return (
            <RowComponent
                onPress={() => handleChannelPress(item)}
                style={[styles.channelRow, isCurrent && styles.channelRowCurrent]}
                {...(Platform.isTV ? {
                    focusedStyle: styles.channelRowFocused,
                    nativeID: `epg-channel-${index}`,
                } : {})}
            >
                <View style={styles.channelRowLeft}>
                    {item.imageUrl ? (
                        <OptimizedImage
                            source={{ uri: item.imageUrl }}
                            style={styles.channelLogo}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={styles.channelLogoPlaceholder}>
                            <Text style={styles.channelLogoText}>{item.title.substring(0, 2).toUpperCase()}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.channelInfo}>
                    <View style={styles.channelTitleRow}>
                        <Text style={[styles.channelName, isCurrent && styles.channelNameCurrent]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        {isCurrent && <View style={styles.playingDot} />}
                    </View>

                    {currentProg ? (
                        <View style={styles.programDetails}>
                            <Text style={styles.nowPlayingTitle} numberOfLines={1}>{currentProg.title}</Text>
                            <View style={styles.progressContainer}>
                                <Text style={styles.progressTime}>{formatEpgTime(currentProg.start)}</Text>
                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                                </View>
                                <Text style={styles.progressTime}>{formatEpgTime(currentProg.end)}</Text>
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.noDataText}>No program data</Text>
                    )}
                    
                    {nextProg && (
                        <Text style={styles.nextPlayingText} numberOfLines={1}>
                            Up Next: {nextProg.title} ({formatEpgTime(nextProg.start)})
                        </Text>
                    )}
                </View>
            </RowComponent>
        );
    };

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
            {/* Overlay to close when tapped outside */}
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.4)' }]} />
            </Pressable>

            {/* Right Sidebar */}
            <Animated.View
                style={[
                    styles.sidebar,
                    {
                        transform: [{ translateX: slideAnim }],
                    },
                ]}
            >
                {epgColors.isAmoled ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} /> : <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />}
                <View style={styles.background} />

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTitleRow}>
                        <MaterialCommunityIcons name="television-guide" size={24} color="#388EFF" />
                        <Text style={styles.headerTitle}>Live Guide</Text>
                        {epgLoading && (
                            <ActivityIndicator size="small" color="#388EFF" style={{ marginLeft: 8 }} />
                        )}
                    </View>
                    
                    <View style={styles.searchContainer}>
                        <MaterialIcons name="search" size={18} color="rgba(255,255,255,0.4)" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search channels..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <MaterialIcons name="close" size={16} color="rgba(255,255,255,0.4)" />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Channel List */}
                <FlatList
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
                    initialNumToRender={12}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    extraData={visiblePrograms}
                />
            </Animated.View>
        </View>
    );
});

export default EpgSidebar;

const styles = StyleSheet.create({
    sidebar: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        backgroundColor: 'rgba(15,20,35,0.7)',
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: -5, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 15,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10,14,28,0.4)',
    },
    // Header
    header: {
        paddingHorizontal: 16,
        paddingTop: Platform.isTV ? 20 : Platform.OS === 'android' ? 12 : 45,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerTitle: {
        color: '#fff',
        fontSize: Platform.isTV ? 22 : 18,
        fontWeight: '700',
        marginLeft: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: Platform.isTV ? 40 : 36,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: Platform.isTV ? 15 : 13,
        marginLeft: 8,
        padding: 0,
    },
    // List
    channelList: {
        flex: 1,
    },
    channelListContent: {
        paddingBottom: 40,
    },
    channelRow: {
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.04)',
        backgroundColor: 'transparent',
    },
    channelRowCurrent: {
        backgroundColor: 'rgba(56,142,255,0.15)',
        borderLeftWidth: 3,
        borderLeftColor: '#388EFF',
    },
    channelRowFocused: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    channelRowLeft: {
        width: Platform.isTV ? 50 : 44,
        alignItems: 'center',
        marginRight: 12,
    },
    channelLogo: {
        width: Platform.isTV ? 46 : 40,
        height: Platform.isTV ? 46 : 40,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    channelLogoPlaceholder: {
        width: Platform.isTV ? 46 : 40,
        height: Platform.isTV ? 46 : 40,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    channelLogoText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: 'bold',
    },
    channelInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    channelTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    channelName: {
        color: '#fff',
        fontSize: Platform.isTV ? 15 : 14,
        fontWeight: '600',
        flexShrink: 1,
    },
    channelNameCurrent: {
        color: '#388EFF',
    },
    playingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#E53935',
        marginLeft: 8,
        shadowColor: '#E53935',
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 2,
    },
    programDetails: {
        marginTop: 2,
    },
    nowPlayingTitle: {
        color: '#fff',
        fontSize: Platform.isTV ? 13 : 12,
        fontWeight: '500',
        marginBottom: 4,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressTime: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        width: 35,
    },
    progressBarBg: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        marginHorizontal: 6,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#388EFF',
        borderRadius: 2,
    },
    noDataText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 2,
    },
    nextPlayingText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: Platform.isTV ? 12 : 11,
        marginTop: 4,
    },
});
