import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, FlatList } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TVFocusable } from '@/components/TVFocusable';
import { TVLayout } from '@/components/TVLayout';
import { useTheme } from '@/hooks/useTheme';

function useToolsLogic() {
    const { colors: activeColors } = useTheme();
    const router = useRouter();

    const toolItems = [
        {
            title: 'Favourites',
            description: 'Open your saved movies, shows and channels',
            icon: 'heart-outline',
            iconType: 'ionicons',
            route: '/favourites',
            color: '#ec4899'
        },
        {
            title: 'IPTV Player',
            description: 'Watch live TV channels from M3U playlists',
            icon: 'tv-outline',
            iconType: 'ionicons',
            route: '/iptv',
            color: '#3b82f6'
        },
        {
            title: 'Video Downloader',
            description: 'Download HLS (M3U8) and MP4 videos for offline viewing',
            icon: 'cloud-download-outline',
            iconType: 'ionicons',
            route: '/video-downloader',
            color: '#8b5cf6'
        },
        {
            title: 'Network Stream',
            description: 'Play direct video links (MP4, M3U8, DASH)',
            icon: 'link-outline',
            iconType: 'ionicons',
            route: '/network-stream',
            color: '#10b981'
        },
        {
            title: 'Downloads',
            description: 'Offline videos and saved content',
            icon: 'folder-open-outline',
            iconType: 'ionicons',
            route: '/downloads',
            color: '#f59e0b'
        },
        {
            title: 'Join WatchParty',
            description: 'Watch videos together with friends in real-time',
            icon: 'people-outline',
            iconType: 'ionicons',
            route: '/join-watchparty',
            color: '#a78bfa'
        },
    ];

    return { router, activeColors, toolItems };
}

const HeroCard = ({ item, flex, activeColors, router }: any) => (
    <TouchableOpacity
        style={[styles.heroCard, { flex, backgroundColor: item.color + '15', borderColor: item.color + '30' }]}
        onPress={() => router.push(item.route)}
        activeOpacity={0.8}
    >
        <LinearGradient
            colors={[item.color + '25', 'transparent']}
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
        <MaterialIcons name="arrow-outward" size={24} color={item.color} style={styles.heroArrow} />
    </TouchableOpacity>
);

const SquareCard = ({ item, flex, activeColors, router }: any) => (
    <TouchableOpacity
        style={[styles.squareCard, { flex, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: activeColors.border }]}
        onPress={() => router.push(item.route)}
        activeOpacity={0.8}
    >
        <View style={[styles.squareIconContainer, { backgroundColor: item.color + '15' }]}>
            {item.iconType === 'material' ? (
                <MaterialIcons name={item.icon} size={28} color={item.color} />
            ) : (
                <Ionicons name={item.icon} size={28} color={item.color} />
            )}
        </View>
        <Text style={[styles.squareTitle, { color: activeColors.text }]}>{item.title}</Text>
        <Text style={[styles.squareDescription, { color: activeColors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
    </TouchableOpacity>
);

const WideCard = ({ item, flex, activeColors, router }: any) => (
    <TouchableOpacity
        style={[styles.wideCard, { flex, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: activeColors.border }]}
        onPress={() => router.push(item.route)}
        activeOpacity={0.8}
    >
        <View style={[styles.squareIconContainer, { backgroundColor: item.color + '15', marginBottom: 0 }]}>
            {item.iconType === 'material' ? (
                <MaterialIcons name={item.icon} size={28} color={item.color} />
            ) : (
                <Ionicons name={item.icon} size={28} color={item.color} />
            )}
        </View>
        <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={[styles.squareTitle, { color: activeColors.text }]}>{item.title}</Text>
            <Text style={[styles.squareDescription, { color: activeColors.textSecondary }]}>{item.description}</Text>
        </View>
    </TouchableOpacity>
);

export function ToolsMobile() {
    const { router, activeColors, toolItems } = useToolsLogic();

    return (
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.headerTitle, { color: activeColors.text }]}>Tools</Text>
                        <View style={[styles.titleDot, { backgroundColor: activeColors.primary }]} />
                    </View>
                    <Text style={[styles.headerSubtitle, { color: activeColors.textSecondary }]}>Power up your experience</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Row 1: Hero */}
                    <View style={styles.gridRow}>
                        <HeroCard item={toolItems[0]} flex={1} activeColors={activeColors} router={router} />
                    </View>

                    {/* Row 2: Squares */}
                    <View style={styles.gridRow}>
                        <SquareCard item={toolItems[4]} flex={1} activeColors={activeColors} router={router} />
                        <SquareCard item={toolItems[1]} flex={1} activeColors={activeColors} router={router} />
                    </View>

                    {/* Row 3: Squares */}
                    <View style={styles.gridRow}>
                        <SquareCard item={toolItems[2]} flex={1} activeColors={activeColors} router={router} />
                        <SquareCard item={toolItems[3]} flex={1} activeColors={activeColors} router={router} />
                    </View>

                    {/* Row 4: Wide */}
                    <View style={styles.gridRow}>
                        <WideCard item={toolItems[5]} flex={1} activeColors={activeColors} router={router} />
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

export function ToolsTV() {
    const { router, activeColors, toolItems } = useToolsLogic();

    const renderItem = ({ item }: { item: any }) => (
        <TVFocusable
            style={[styles.toolCard, { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: activeColors.border, flex: 1, margin: 10, minWidth: 300, minHeight: 180 }]}
            onPress={() => router.push(item.route as any)}
        >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={[styles.iconContainer, { backgroundColor: item.color + '15', width: 80, height: 80, borderRadius: 40, marginBottom: 20 }]}>
                    {item.iconType === 'material' ? (
                        <MaterialIcons name={item.icon as any} size={40} color={item.color} />
                    ) : (
                        <Ionicons name={item.icon as any} size={40} color={item.color} />
                    )}
                </View>
                <Text style={[styles.toolTitle, { color: activeColors.text, fontSize: 24, textAlign: 'center' }]}>{item.title}</Text>
                <Text style={[styles.toolDescription, { color: activeColors.textSecondary, textAlign: 'center', marginTop: 10, fontSize: 16 }]}>{item.description}</Text>
            </View>
        </TVFocusable>
    );

    return (
        <TVLayout>
            <View style={{ flex: 1, backgroundColor: activeColors.background }}>
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
                  <View style={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: activeColors.primary + '15', transform: [{ scale: 2 }] }} />
                )}
                <View style={{ flex: 1, padding: 40 }}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.headerTitle, { color: activeColors.text, fontSize: 40 }]}>Tools</Text>
                        <View style={[styles.titleDot, { backgroundColor: activeColors.primary, width: 10, height: 10, borderRadius: 5 }]} />
                    </View>
                    <Text style={[styles.headerSubtitle, { color: activeColors.textSecondary, fontSize: 20, marginBottom: 40 }]}>Power up your experience</Text>

                    <FlatList
                        data={toolItems}
                        renderItem={renderItem}
                        keyExtractor={item => item.title}
                        numColumns={2}
                        key={'tv-tools'}
                        contentContainerStyle={{ paddingBottom: 50 }}
                    />
                </View>
            </View>
        </TVLayout>
    );
}

export default function ToolsScreen() {
    return Platform.isTV ? <ToolsTV /> : <ToolsMobile />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    titleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginLeft: 4,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Outfit_700Bold',
    },
    headerSubtitle: {
        fontSize: 15,
        fontFamily: 'Outfit_500Medium',
        marginTop: 4,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    toolCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 1,
        backgroundColor: '#0f172a',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    toolTitle: {
        fontSize: 18,
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: 2,
    },
    toolDescription: {
        fontSize: 13,
        lineHeight: 18,
        fontFamily: 'Inter_400Regular',
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    heroIconContainer: {
        width: 64,
        height: 64,
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
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 4,
    },
    heroDescription: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: 'Inter_400Regular',
    },
    heroArrow: {
        position: 'absolute',
        top: 20,
        right: 20,
        opacity: 0.6,
    },
    squareCard: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        justifyContent: 'space-between',
    },
    squareIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    squareTitle: {
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: 4,
    },
    squareDescription: {
        fontSize: 13,
        lineHeight: 18,
        fontFamily: 'Inter_400Regular',
    },
    wideCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
    }
});

