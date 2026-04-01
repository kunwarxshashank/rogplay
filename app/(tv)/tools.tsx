import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import { Colors } from '@/constants/Colors';
import { TVFocusable } from '@/components/TVFocusable';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const hexAlpha = (hex: string, alpha: number) => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return hex + a;
};

const TOOLS = [
    {
        id: 'favourites',
        name: 'Favourites',
        icon: 'heart-multiple',
        route: '/(tv)/favourites',
        description: 'Open saved movies, shows and channels',
        gradient: ['#ec4899', '#f43f5e'] as const,
    },
    {
        id: 'iptv',
        name: 'IPTV Player',
        icon: 'television-classic',
        route: '/(tv)/iptv',
        description: 'Watch live TV channels from M3U playlists',
        gradient: ['#667eea', '#764ba2'] as const,
    },
    {
        id: 'network',
        name: 'Network Stream',
        icon: 'cast-connected',
        route: '/(tv)/network-stream',
        description: 'Stream video from any URL or network source',
        gradient: ['#f093fb', '#f5576c'] as const,
    },
    {
        id: 'downloader',
        name: 'Video Downloader',
        icon: 'download-circle',
        route: '/(tv)/video-downloader',
        description: 'Download videos for offline viewing',
        gradient: ['#4facfe', '#00f2fe'] as const,
    },
    {
        id: 'local',
        name: 'Local Videos',
        icon: 'folder-play',
        route: '/(tv)/local-videos',
        description: 'Browse and play videos from your storage',
        gradient: ['#f6d365', '#fda085'] as const,
    },
    {
        id: 'watchparty',
        name: 'Join WatchParty',
        icon: 'party-popper',
        route: '/(tv)/join-watchparty',
        description: 'Watch together with friends in real-time',
        gradient: ['#a78bfa', '#7c3aed'] as const,
    },
];

export default function TVToolsScreen() {
    const { theme } = useSettingsStore();
    const c = Colors[theme] || Colors.dark;
    const gradients = c.gradients || { primary: [c.primary, c.primary] };
    const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
    const router = useRouter();

    const SIDEBAR_WIDTH = 86;
    const H_PAD = 44;
    const GAP = 20;
    const COLS = 3;
    const usableW = SCREEN_W - SIDEBAR_WIDTH - H_PAD * 2;
    const cardW = (usableW - GAP * (COLS - 1)) / COLS;
    const cardH = Math.min((SCREEN_H - 200) / 2 - GAP, 240);

    // Split tools into rows of 3
    const rows: (typeof TOOLS)[] = [];
    for (let i = 0; i < TOOLS.length; i += COLS) {
        rows.push(TOOLS.slice(i, i + COLS));
    }

    return (
        <View style={styles.container}>
            {/* ── Header ──────────────────────────────── */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={[styles.headerTitle, { color: c.text }]}>Tools</Text>
                    <View style={[styles.headerDot, { backgroundColor: c.primary }]} />
                </View>
                <View style={[styles.headerBadge, { backgroundColor: hexAlpha(c.primary, 0.1) }]}>
                    <Text style={[styles.headerBadgeText, { color: c.primary }]}>
                        {TOOLS.length} AVAILABLE
                    </Text>
                </View>
            </View>

            {/* ── Grid ────────────────────────────────── */}
            <View style={[styles.grid, { paddingHorizontal: H_PAD }]}>
                {rows.map((row, rowIdx) => (
                    <View
                        key={rowIdx}
                        style={[
                            styles.row,
                            { gap: GAP },
                            // Center the last row if it has fewer items
                            row.length < COLS && { justifyContent: 'flex-start' },
                        ]}
                    >
                        {row.map((tool, colIdx) => {
                            const index = rowIdx * COLS + colIdx;
                            return (
                                <TVFocusable
                                    key={tool.id}
                                    style={[styles.card, { width: cardW, height: cardH }]}
                                    onPress={() => router.push(tool.route as any)}
                                    hasTVPreferredFocus={index === 0}
                                    nativeID={`tv-tool-${tool.id}`}
                                    focusedScale={1.05}
                                    disableFocusEffect={true} // Handling custom focus effect below
                                >
                                    {({ focused }: any) => (
                                        <View style={[
                                            StyleSheet.absoluteFill,
                                            styles.cardInner,
                                            {
                                                backgroundColor: focused ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                                                borderColor: focused ? '#fff' : 'rgba(255,255,255,0.08)',
                                                borderWidth: focused ? 2 : 1.5,
                                                transform: [{ scale: focused ? 1.05 : 1 }]
                                            },
                                            focused && {
                                                shadowColor: tool.gradient[0],
                                                shadowOffset: { width: 0, height: 10 },
                                                shadowOpacity: 0.3,
                                                shadowRadius: 20,
                                                elevation: 15,
                                            }
                                        ]}>
                                            {/* Accent Gradient */}
                                            <LinearGradient
                                                colors={[tool.gradient[0] + '15', 'transparent']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={StyleSheet.absoluteFill}
                                            />

                                            <View style={styles.cardBody}>
                                                <View style={styles.cardTop}>
                                                    <View style={[styles.iconCircle, { backgroundColor: tool.gradient[0] + '15' }]}>
                                                        <MaterialCommunityIcons
                                                            name={tool.icon as any}
                                                            size={34}
                                                            color={tool.gradient[0]}
                                                        />
                                                    </View>
                                                    {focused && (
                                                        <View style={[styles.activeIndicator, { backgroundColor: tool.gradient[0] }]} />
                                                    )}
                                                </View>

                                                <View style={styles.cardBottom}>
                                                    <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
                                                        {tool.name}
                                                    </Text>
                                                    <Text style={[styles.cardDesc, { color: c.textSecondary }]} numberOfLines={2}>
                                                        {tool.description}
                                                    </Text>
                                                </View>
                                            </View>
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

    /* ── Header ────────────────────────────── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 44,
        paddingBottom: 24,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Outfit_800ExtraBold',
        letterSpacing: -0.5,
    },
    headerDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 6,
    },
    headerBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    headerBadgeText: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 1,
    },

    /* ── Grid ──────────────────────────────── */
    grid: {
        flex: 1,
        justifyContent: 'flex-start',
        gap: 20,
    },
    row: {
        flexDirection: 'row',
    },

    /* ── Card ──────────────────────────────── */
    card: {
        borderRadius: 24,
        overflow: 'visible', // Allow shadow to show
    },
    cardInner: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1.5,
    },
    activeIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    cardBody: {
        flex: 1,
        paddingHorizontal: 22,
        paddingTop: 16,
        paddingBottom: 18,
        justifyContent: 'space-between',
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardBottom: {
        gap: 4,
    },
    cardTitle: {
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: -0.2,
    },
    cardDesc: {
        fontSize: 13,
        fontFamily: 'Outfit_500Medium',
        lineHeight: 18,
        opacity: 0.5,
    },
});
