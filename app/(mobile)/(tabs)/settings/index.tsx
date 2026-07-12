import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Share, Linking, Platform, Image } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import appConfigJson from '@/app.json';

import { TVFocusable } from '@/components/TVFocusable';
import { TVLayout } from '@/components/TVLayout';
import { useTheme } from '@/hooks/useTheme';

export default function SettingsScreen() {
    const { colors: currentColors } = useTheme();
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const isGuest = !user || user.id === 'guest';

    const handleLogout = () => {
        logout();
        router.replace(Platform.isTV ? '/tvlogin' : '/login');
    };

    const handleLogin = () => {
        if (user?.id === 'guest') {
            logout();
        }
        router.replace(Platform.isTV ? '/tvlogin' : '/login');
    };

    const handleLink = (url: string) => {
        Linking.openURL(url).catch(() => { });
    };

    const sections = [
        {
            title: "Preferences",
            items: [
                {
                    title: "Theme",
                    icon: 'palette',
                    description: 'Themes, accent color, poster style',
                    action: () => router.push('/settings/theme')
                },
                {
                    title: "General",
                    icon: 'settings',
                    description: 'Region and UI preferences',
                    action: () => router.push('/settings/general')
                },
                {
                    title: "Playback",
                    icon: 'play-circle-outline',
                    description: 'Video player options',
                    action: () => router.push('/settings/playback')
                },
                {
                    title: "Cinema",
                    icon: 'movie',
                    description: 'Cinema Page Settings',
                    action: () => router.push('/settings/cinema')
                }
            ]
        },
        {
            title: "Features & Tools",
            items: [
                {
                    title: "Insights",
                    icon: 'auto-graph',
                    description: 'Viewing stats, achievements',
                    action: () => router.push('/settings/insights')
                },
                {
                    title: "Debrid Integrations",
                    icon: 'cloud-sync',
                    description: 'Real-Debrid, Premiumize',
                    action: () => router.push('/settings/debrid')
                },
                {
                    title: "Maintenance",
                    icon: 'build',
                    description: 'Updates, backup and cache',
                    action: () => router.push('/settings/maintenance')
                }
            ]
        },
        {
            title: "Community & Support",
            items: [
                {
                    title: "Contributors",
                    icon: 'stars',
                    description: 'Members supporting Rogplay',
                    action: () => router.push('/settings/contributors')
                },
                {
                    title: "Join Telegram",
                    icon: 'message',
                    description: 'Join our official Telegram Handle',
                    action: () => handleLink('https://telegram.me/rogplay')
                },
                {
                    title: "Share App",
                    icon: 'share',
                    description: 'Share Rogplay with your friends',
                    action: () => handleLink('https://rogplay.github.io/share.html')
                },
                {
                    title: "Privacy Policy",
                    icon: 'policy',
                    description: 'App data and privacy rules',
                    action: () => handleLink('https://rogplay.github.io/privacypolicy.html')
                },
                {
                    title: "About Us",
                    icon: 'info',
                    description: 'Learn more about Rogplay',
                    action: () => handleLink('https://rogplay.github.io/about.html')
                },
                {
                    title: "Contact Us",
                    icon: 'mail',
                    description: 'Get in touch with support',
                    action: () => handleLink('https://rogplay.github.io/contact.html')
                }
            ]
        }
    ];

    const renderHero = () => (
        <View style={[styles.heroCard, { backgroundColor: currentColors.surface }]}>
            {isGuest ? (
                <View style={styles.heroContent}>
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3541/3541871.png' }} style={styles.avatar} />
                    <View style={styles.heroTextContainer}>
                        <Text style={[styles.heroTitle, { color: currentColors.text }]}>Welcome, Guest!</Text>
                        <Text style={[styles.heroSubtitle, { color: currentColors.textSecondary }]}>Sign in to access premium features</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogin} style={[styles.heroBtn, { backgroundColor: currentColors.primary }]}>
                        <Text style={styles.heroBtnText}>Login</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity style={styles.heroContent} onPress={() => router.push('/settings/account')} activeOpacity={0.7}>
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: user?.profilepic || 'https://cdn-icons-png.flaticon.com/512/3541/3541871.png' }} style={styles.avatar} />
                        {user?.isPremium && (
                            <View style={styles.premiumCrownBadge}>
                                <MaterialCommunityIcons name="crown" size={12} color="#000" />
                            </View>
                        )}
                    </View>
                    <View style={styles.heroTextContainer}>
                        <Text style={[styles.heroTitle, { color: currentColors.text }]} numberOfLines={1}>{user?.name}</Text>
                        <Text style={[styles.heroSubtitle, { color: currentColors.textSecondary }]} numberOfLines={1}>{user?.email}</Text>
                        {user?.isPremium && (
                            <View style={[styles.premiumTag, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
                                <Text style={styles.premiumTagText}>Premium Member</Text>
                            </View>
                        )}
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={currentColors.textSecondary} />
                </TouchableOpacity>
            )}
        </View>
    );

    const renderContent = () => (
        <View style={{ flex: 1 }}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <View style={[styles.titleDot, { backgroundColor: currentColors.primary }]} />
                </View>
                <Text style={styles.headerSubtitle}>v{appConfigJson.expo.version} • Premium Build</Text>
            </View>

            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                {renderHero()}

                {sections.map((section, sIdx) => (
                    <View key={sIdx} style={styles.sectionContainer}>
                        <Text style={[styles.sectionHeader, { color: currentColors.primary }]}>{section.title}</Text>
                        <View style={[styles.cardGroup, { backgroundColor: currentColors.surface }]}>
                            {section.items.map((item, iIdx) => (
                                <TVFocusable
                                    key={iIdx}
                                    style={styles.itemWrapper}
                                    onPress={item.action}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.item}>
                                        <View style={styles.itemLeft}>
                                            <View style={[styles.iconCircle, { backgroundColor: `${currentColors.primary}15` }]}>
                                                <MaterialIcons name={item.icon as any} size={22} color={currentColors.primary} />
                                            </View>
                                            <View style={{ marginLeft: 16 }}>
                                                <Text style={[styles.itemLabel, { color: currentColors.text }]}>{item.title}</Text>
                                                <Text style={[styles.itemDescription, { color: currentColors.textSecondary }]}>
                                                    {item.description}
                                                </Text>
                                            </View>
                                        </View>
                                        <MaterialIcons name="chevron-right" size={24} color={currentColors.textSecondary} style={{ opacity: 0.5 }} />
                                    </View>
                                    {iIdx < section.items.length - 1 && (
                                        <View style={[styles.divider, { backgroundColor: currentColors.border, opacity: 0.2 }]} />
                                    )}
                                </TVFocusable>
                            ))}
                        </View>
                    </View>
                ))}

                <View style={[styles.sectionContainer, { marginTop: 30 }]}>
                    <View style={[styles.cardGroup, { backgroundColor: 'transparent' }]}>
                        <TVFocusable
                            style={[styles.itemWrapper, { backgroundColor: `${currentColors.error}10`, borderRadius: 16, borderWidth: 1, borderColor: `${currentColors.error}30` }]}
                            onPress={isGuest ? handleLogin : handleLogout}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.item, { paddingVertical: 16, justifyContent: 'center' }]}>
                                <MaterialIcons name={isGuest ? 'login' : 'logout'} size={22} color={isGuest ? currentColors.primary : currentColors.error} />
                                <Text style={[styles.itemLabel, { color: isGuest ? currentColors.primary : currentColors.error, marginLeft: 12 }]}>
                                    {isGuest ? 'Log In / Sign Up' : 'Log Out Securely'}
                                </Text>
                            </View>
                        </TVFocusable>
                    </View>
                </View>

            </ScrollView>
        </View>
    );

    if (Platform.isTV) {
        return (
            <TVLayout>
                <View style={{ flex: 1, backgroundColor: currentColors.background }}>
                    {currentColors.isAmoled ? (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
                    ) : (
                        <LinearGradient
                            colors={[currentColors.primary + '30', currentColors.background + 'FA', currentColors.background]}
                            locations={[0, 0.25, 1]}
                            style={StyleSheet.absoluteFill}
                        />
                    )}
                    {!currentColors.isAmoled && (
                        <View style={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: currentColors.primary + '15', transform: [{ scale: 2 }] }} />
                    )}
                    <View style={{ flex: 1, padding: 20 }}>
                        {renderContent()}
                    </View>
                </View>
            </TVLayout>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background }]}>
            {/* Dark Luxury Gradient */}
            {currentColors.isAmoled ? (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
            ) : (
                <LinearGradient
                    colors={[currentColors.primary + '30', currentColors.background + 'FA', currentColors.background]}
                    locations={[0, 0.25, 1]}
                    style={StyleSheet.absoluteFill}
                />
            )}
            {!currentColors.isAmoled && (
                <View style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: currentColors.primary + '15', transform: [{ scale: 2 }] }} />
            )}
            <SafeAreaView style={{ flex: 1 }}>
                {renderContent()}
            </SafeAreaView>
        </View>
    );
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
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: '#64748b',
        marginTop: 4,
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    heroCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    premiumCrownBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: '#FFD700',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000',
    },
    heroTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    heroTitle: {
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
    },
    heroSubtitle: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        marginTop: 2,
    },
    premiumTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    premiumTagText: {
        color: '#FFD700',
        fontSize: 10,
        fontFamily: 'Outfit_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    heroBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        marginLeft: 10,
    },
    heroBtnText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
        fontSize: 14,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 13,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 12,
        marginLeft: 16,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    cardGroup: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    itemWrapper: {
        width: '100%',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemLabel: {
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
    },
    itemDescription: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        marginTop: 2,
    },
    divider: {
        height: 1,
        marginLeft: 74,
    },
});
