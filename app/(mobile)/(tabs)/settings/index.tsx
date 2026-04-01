import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Share, Linking, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import { useAddonsStore } from '@/store/addonsStore';
import { useAuthStore } from '@/store/authStore';
import appConfigJson from '@/app.json';

import { TVFocusable } from '@/components/TVFocusable';
import { TVLayout } from '@/components/TVLayout';

export default function SettingsScreen() {
    const router = useRouter();
    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;
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

    const menuItems = [
        {
            title: "Account",
            icon: 'account-circle',
            description: 'Manage profile and subscription',
            action: () => router.push('/settings/account')
        },
        {
            title: "General",
            icon: 'settings',
            description: 'Theme, region and UI preferences',
            action: () => router.push('/settings/general')
        },
        {
            title: "Playback",
            icon: 'play-circle-outline',
            description: 'Video player and streaming options',
            action: () => router.push('/settings/playback')
        },
        {
            title: "Maintenance",
            icon: 'build',
            description: 'Updates, backup and cache',
            action: () => router.push('/settings/maintenance')
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
        },
        {
            title: isGuest ? "Login" : "Logout",
            icon: isGuest ? 'login' : 'logout',
            description: isGuest ? 'Sign in to access all features' : 'Sign out of your account',
            action: isGuest ? handleLogin : handleLogout,
            color: isGuest ? currentColors.primary : currentColors.error
        }
    ];

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
                {menuItems.map((item, index) => (
                    <TVFocusable
                        key={index}
                        style={styles.itemWrapper}
                        onPress={item.action}
                        activeOpacity={0.7}
                    >
                        <View style={styles.item}>
                            <View style={styles.itemLeft}>
                                <View style={[styles.iconCircle, { backgroundColor: `${item.color || currentColors.primary}10` }]}>
                                    <MaterialIcons name={item.icon as any} size={22} color={item.color || currentColors.primary} />
                                </View>
                                <View style={{ marginLeft: 16 }}>
                                    <Text style={[styles.itemLabel, { color: item.color || currentColors.text }]}>{item.title}</Text>
                                    <Text style={{ color: currentColors.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                                        {item.description}
                                    </Text>
                                </View>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={currentColors.textSecondary} />
                        </View>
                        {index < menuItems.length - 1 && (
                            <View style={[
                                item.title === 'Maintenance' ? styles.sectionDivider : styles.divider,
                                { backgroundColor: currentColors.border, opacity: item.title === 'Maintenance' ? 0.6 : 0.3 }
                            ]} />
                        )}
                    </TVFocusable>
                ))}
            </ScrollView>
        </View>
    );

    if (Platform.isTV) {
        return (
            <TVLayout>
                <View style={{ flex: 1, padding: 20 }}>
                    {renderContent()}
                </View>
            </TVLayout>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            {renderContent()}
        </SafeAreaView>
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
    sectionHeader: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        marginTop: 32,
        marginBottom: 12,
        marginLeft: 4,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    itemWrapper: {
        borderRadius: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        paddingHorizontal: 12,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemLabel: {
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
    },
    divider: {
        height: 1,
        marginLeft: 72,
    },
    sectionDivider: {
        height: 8,
        marginVertical: 12,
        borderRadius: 4,
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemValue: {
        color: '#64748b',
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
        marginRight: 4,
        letterSpacing: 0.5,
    }
});

