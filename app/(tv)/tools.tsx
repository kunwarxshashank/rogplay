import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { TVFocusable } from '@/components/TVFocusable';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

const hexAlpha = (hex: string, alpha: number) => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return hex + a;
};

const TOOLS = [
    {
        id: 'favourites',
        name: 'Favourites',
        icon: 'heart-multiple-outline',
        route: '/(tv)/favourites',
        description: 'Browse and revisit your saved movies, shows and channels',
    },
    {
        id: 'iptv',
        name: 'IPTV Player',
        icon: 'television-play',
        route: '/(tv)/iptv',
        description: 'Watch live TV channels from M3U or Xtreme Codes playlists',
    },
    {
        id: 'network',
        name: 'Network Stream',
        icon: 'cast-connected',
        route: '/(tv)/network-stream',
        description: 'Stream video from any URL or network source directly',
    },
    {
        id: 'downloader',
        name: 'Video Downloader',
        icon: 'tray-arrow-down',
        route: '/(tv)/video-downloader',
        description: 'Download videos for offline viewing at any time',
    },
    {
        id: 'local',
        name: 'Local Videos',
        icon: 'folder-play-outline',
        route: '/(tv)/local-videos',
        description: 'Browse and play videos stored on your device',
    },
    {
        id: 'watchparty',
        name: 'Watch Party',
        icon: 'account-group-outline',
        route: '/(tv)/join-watchparty',
        description: 'Watch together with friends in real-time, in sync',
    },
] as const;

const COLS = 2;

export default function TVToolsScreen() {
    const { colors: c } = useTheme();
    const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
    const router = useRouter();

    const SIDEBAR_W = 86;
    const H_PAD = 44;
    const GAP = 14;
    const usableW = SCREEN_W - SIDEBAR_W - H_PAD * 2;
    const cardW = (usableW - GAP * (COLS - 1)) / COLS;

    const rows: (typeof TOOLS[number][])[] = [];
    for (let i = 0; i < TOOLS.length; i += COLS) {
        rows.push(TOOLS.slice(i, i + COLS) as any);
    }

    return (
        <View style={styles.container}>
            {/* ── Header ─────────────────────────── */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.headerIconWrap, { backgroundColor: hexAlpha(c.primary, 0.12) }]}>
                        <MaterialCommunityIcons name="hammer-wrench" size={22} color={c.primary} />
                    </View>
                    <View>
                        <Text style={[styles.headerTitle, { color: c.text }]}>Tools</Text>
                        <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
                            {TOOLS.length} utilities available
                        </Text>
                    </View>
                </View>
                <View style={[styles.dividerLine, { backgroundColor: hexAlpha(c.text, 0.06) }]} />
            </View>

            {/* ── Grid ───────────────────────────── */}
            <View style={[styles.grid, { paddingHorizontal: H_PAD, gap: GAP }]}>
                {rows.map((row, rowIdx) => (
                    <View key={rowIdx} style={[styles.row, { gap: GAP }]}>
                        {row.map((tool, colIdx) => {
                            const index = rowIdx * COLS + colIdx;
                            return (
                                <TVFocusable
                                    key={tool.id}
                                    style={[styles.card, { width: cardW }]}
                                    onPress={() => router.push(tool.route as any)}
                                    hasTVPreferredFocus={index === 0}
                                    nativeID={`tv-tool-${tool.id}`}
                                    focusedScale={1.03}
                                    focusedBorderColor={c.primary}
                                    autoFlex={false}
                                    disableFocusEffect={true}
                                >
                                    {({ focused }: any) => (
                                        <View style={[
                                            styles.cardInner,
                                            {
                                                backgroundColor: focused
                                                    ? hexAlpha(c.primary, 0.1)
                                                    : hexAlpha(c.card, 0.5),
                                                borderColor: focused
                                                    ? hexAlpha(c.primary, 0.6)
                                                    : hexAlpha(c.text, 0.07),
                                                transform: [{ scale: focused ? 1.03 : 1 }],
                                            }
                                        ]}>
                                            {/* Left accent bar */}
                                            {focused && (
                                                <View style={[styles.accentBar, { backgroundColor: c.primary }]} />
                                            )}

                                            {/* Icon */}
                                            <View style={[
                                                styles.iconWrap,
                                                {
                                                    backgroundColor: focused
                                                        ? hexAlpha(c.primary, 0.15)
                                                        : hexAlpha(c.text, 0.05),
                                                }
                                            ]}>
                                                <MaterialCommunityIcons
                                                    name={tool.icon as any}
                                                    size={26}
                                                    color={focused ? c.primary : c.textSecondary}
                                                />
                                            </View>

                                            {/* Text */}
                                            <View style={styles.cardText}>
                                                <Text
                                                    style={[
                                                        styles.cardTitle,
                                                        { color: focused ? c.text : c.text }
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {tool.name}
                                                </Text>
                                                <Text
                                                    style={[styles.cardDesc, { color: c.textSecondary }]}
                                                    numberOfLines={2}
                                                >
                                                    {tool.description}
                                                </Text>
                                            </View>

                                            {/* Arrow */}
                                            <MaterialCommunityIcons
                                                name="chevron-right"
                                                size={20}
                                                color={focused ? c.primary : hexAlpha(c.text, 0.2)}
                                                style={styles.arrow}
                                            />
                                        </View>
                                    )}
                                </TVFocusable>
                            );
                        })}
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },

    /* ── Header ────────────────────────── */
    header: {
        paddingTop: 56,
        paddingHorizontal: 44,
        paddingBottom: 20,
        gap: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    headerIconWrap: {
        width: 46,
        height: 46,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: 'Inter_700Bold',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        marginTop: 2,
        opacity: 0.6,
    },
    dividerLine: {
        height: 1,
        borderRadius: 1,
    },

    /* ── Grid ──────────────────────────── */
    grid: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
    },

    /* ── Card ──────────────────────────── */
    card: {
        borderRadius: 16,
        overflow: 'visible',
    },
    cardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1.5,
        paddingVertical: 18,
        paddingHorizontal: 20,
        gap: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    accentBar: {
        position: 'absolute',
        left: 0,
        top: '15%',
        bottom: '15%',
        width: 3,
        borderRadius: 2,
    },
    iconWrap: {
        width: 50,
        height: 50,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    cardText: {
        flex: 1,
        gap: 4,
    },
    cardTitle: {
        fontSize: 17,
        fontFamily: 'Inter_600SemiBold',
        letterSpacing: -0.1,
    },
    cardDesc: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        lineHeight: 18,
        opacity: 0.65,
    },
    arrow: {
        flexShrink: 0,
        opacity: 0.8,
    },
});
