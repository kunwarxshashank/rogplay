import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TVFocusable } from '@/components/TVFocusable';
import { useTheme } from '@/hooks/useTheme';

function useToolsLogic() {
    const { colors: activeColors } = useTheme();
    const router = useRouter();

    const toolItems = [
        {
            id: 'favourites',
            title: 'Favourites',
            description: 'Open your saved movies, shows and channels',
            icon: 'heart-outline',
            iconType: 'ionicons',
            route: '/(tv)/favourites',
            color: '#ec4899'
        },
        {
            id: 'iptv',
            title: 'IPTV Player',
            description: 'Watch live TV channels from M3U playlists',
            icon: 'tv-outline',
            iconType: 'ionicons',
            route: '/(tv)/iptv',
            color: '#3b82f6'
        },
        {
            id: 'video-downloader',
            title: 'Video Downloader',
            description: 'Download HLS (M3U8) and MP4 videos for offline viewing',
            icon: 'cloud-download-outline',
            iconType: 'ionicons',
            route: '/(tv)/video-downloader',
            color: '#8b5cf6'
        },
        {
            id: 'network-stream',
            title: 'Network Stream',
            description: 'Play direct video links (MP4, M3U8, DASH)',
            icon: 'link-outline',
            iconType: 'ionicons',
            route: '/(tv)/network-stream',
            color: '#10b981'
        },
        {
            id: 'local-videos',
            title: 'Local Videos',
            description: 'Browse and play videos stored on your device',
            icon: 'folder-open-outline',
            iconType: 'ionicons',
            route: '/(tv)/local-videos',
            color: '#f59e0b'
        },
        {
            id: 'join-watchparty',
            title: 'Join WatchParty',
            description: 'Watch videos together with friends in real-time',
            icon: 'people-outline',
            iconType: 'ionicons',
            route: '/(tv)/join-watchparty',
            color: '#a78bfa'
        },
    ];

    return { router, activeColors, toolItems };
}

const HeroCard = ({ item, flex, activeColors, router, hasTVPreferredFocus }: any) => (
    <TVFocusable
        style={{ flex }}
        onPress={() => router.push(item.route)}
        focusedScale={1.05}
        hasTVPreferredFocus={hasTVPreferredFocus}
    >
        {({ focused }: any) => (
            <View style={[styles.heroCard, { backgroundColor: item.color + '15', borderColor: item.color + '30' }]}>
                <LinearGradient
                    colors={[item.color + (focused ? '40' : '25'), 'transparent']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.heroContent}>
                    <View style={[styles.heroIconContainer, { backgroundColor: item.color }]}>
                        {item.iconType === 'material' ? (
                            <MaterialIcons name={item.icon} size={32} color="#fff" />
                        ) : (
                            <Ionicons name={item.icon} size={32} color="#fff" />
                        )}
                    </View>
                    <View style={styles.heroTextContainer}>
                        <Text style={[styles.heroTitle, { color: activeColors.text }]}>{item.title}</Text>
                        <Text style={[styles.heroDescription, { color: activeColors.textSecondary }]}>{item.description}</Text>
                    </View>
                </View>
                <MaterialIcons name="arrow-outward" size={24} color={item.color} style={[styles.heroArrow, focused && { opacity: 1, transform: [{ scale: 1.1 }] }]} />
            </View>
        )}
    </TVFocusable>
);

const SquareCard = ({ item, flex, activeColors, router }: any) => (
    <TVFocusable
        style={{ flex }}
        onPress={() => router.push(item.route)}
        focusedScale={1.05}
    >
        {({ focused }: any) => (
            <View style={[styles.squareCard, { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: activeColors.border }]}>
                <LinearGradient
                    colors={[focused ? 'rgba(255,255,255,0.08)' : 'transparent', 'transparent']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.squareIconContainer, { backgroundColor: item.color + '15' }]}>
                    {item.iconType === 'material' ? (
                        <MaterialIcons name={item.icon} size={32} color={item.color} />
                    ) : (
                        <Ionicons name={item.icon} size={32} color={item.color} />
                    )}
                </View>
                <View style={styles.squareTextContainer}>
                    <Text style={[styles.squareTitle, { color: activeColors.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.squareDescription, { color: activeColors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
                </View>
            </View>
        )}
    </TVFocusable>
);

const WideCard = ({ item, flex, activeColors, router }: any) => (
    <TVFocusable
        style={{ flex }}
        onPress={() => router.push(item.route)}
        focusedScale={1.05}
    >
        {({ focused }: any) => (
            <View style={[styles.wideCard, { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: activeColors.border }]}>
                <LinearGradient
                    colors={[focused ? 'rgba(255,255,255,0.08)' : 'transparent', 'transparent']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.wideIconContainer, { backgroundColor: item.color + '15' }]}>
                    {item.iconType === 'material' ? (
                        <MaterialIcons name={item.icon} size={32} color={item.color} />
                    ) : (
                        <Ionicons name={item.icon} size={32} color={item.color} />
                    )}
                </View>
                <View style={styles.wideTextContainer}>
                    <Text style={[styles.wideTitle, { color: activeColors.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.wideDescription, { color: activeColors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
                </View>
            </View>
        )}
    </TVFocusable>
);

export default function TVToolsScreen() {
    const { router, activeColors, toolItems } = useToolsLogic();

    return (
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={[styles.headerTitle, { color: activeColors.text }]}>Tools</Text>
                    <View style={[styles.titleDot, { backgroundColor: activeColors.primary }]} />
                </View>
                <Text style={[styles.headerSubtitle, { color: activeColors.textSecondary }]}>Power up your experience</Text>
            </View>

            <View style={styles.scrollContent}>
                {/* Row 1: Flex 4 total -> Favourites (2), Local Videos (1), IPTV (1) */}
                <View style={styles.gridRow}>
                    <HeroCard item={toolItems[0]} flex={2} activeColors={activeColors} router={router} hasTVPreferredFocus />
                    <SquareCard item={toolItems[4]} flex={1} activeColors={activeColors} router={router} />
                    <SquareCard item={toolItems[1]} flex={1} activeColors={activeColors} router={router} />
                </View>

                {/* Row 2: Flex 4 total -> Video Downloader (1), Network Stream (1), WatchParty (2) */}
                <View style={styles.gridRow}>
                    <SquareCard item={toolItems[2]} flex={1} activeColors={activeColors} router={router} />
                    <SquareCard item={toolItems[3]} flex={1} activeColors={activeColors} router={router} />
                    <WideCard item={toolItems[5]} flex={2} activeColors={activeColors} router={router} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 40,
        paddingTop: 30,
        paddingBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    titleDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 6,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Outfit_700Bold',
    },
    headerSubtitle: {
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
        marginTop: 4,
    },
    scrollContent: {
        paddingHorizontal: 40,
        paddingBottom: 20,
        flex: 1,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
        flex: 1,
    },
    heroCard: {
        flex: 1,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'center',
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    heroIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    heroTextContainer: {
        flex: 1,
    },
    heroTitle: {
        fontSize: 28,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 6,
    },
    heroDescription: {
        fontSize: 16,
        lineHeight: 22,
        fontFamily: 'Inter_400Regular',
    },
    heroArrow: {
        position: 'absolute',
        top: 20,
        right: 20,
        opacity: 0.5,
    },
    squareCard: {
        flex: 1,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        justifyContent: 'space-between',
        overflow: 'hidden',
        position: 'relative',
    },
    squareIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    squareTextContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    squareTitle: {
        fontSize: 22,
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: 6,
    },
    squareDescription: {
        fontSize: 15,
        lineHeight: 20,
        fontFamily: 'Inter_400Regular',
    },
    wideCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    wideIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    wideTextContainer: {
        flex: 1,
    },
    wideTitle: {
        fontSize: 26,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 6,
    },
    wideDescription: {
        fontSize: 16,
        lineHeight: 22,
        fontFamily: 'Inter_400Regular',
    },
});
