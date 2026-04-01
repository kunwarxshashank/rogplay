import { Tabs, useSegments, usePathname, useRouter } from 'expo-router';
import { View, StyleSheet, Animated, BackHandler, Alert, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { useSettingsStore } from '@/store/settingsStore';
import { TVSidebarNav } from '@/components/TVSidebarNav';
import { useNavigation } from '@react-navigation/native';

const SIDEBAR_COLLAPSED_WIDTH = 86;

export default function TVLayout() {
    const pathname = usePathname();
    const router = useRouter();
    const navigation = useNavigation();
    const { theme, confirmExit } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;
    const segments = useSegments();
    const isPlayerRoute = segments.includes('player');

    useEffect(() => {
        const backAction = () => {
            const isHome = pathname === '/' || pathname === '/(tv)' || pathname === '/(tv)/';

            // If on home and confirm exit is enabled, show exit dialog
            if (isHome && confirmExit) {
                Alert.alert(
                    "Exit App",
                    "Are you sure you want to exit?",
                    [
                        { text: "Cancel", onPress: () => null, style: "cancel" },
                        { text: "YES", onPress: () => BackHandler.exitApp() }
                    ]
                );
                return true;
            }

            // If on home without confirm exit, let system handle (exit app)
            if (isHome) {
                return false;
            }

            // For all other screens, go back to previous screen in stack
            if (navigation.canGoBack()) {
                navigation.goBack();
                return true;
            }

            return false;
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );

        return () => backHandler.remove();
    }, [pathname, confirmExit, navigation]);

    return (
        <View style={[styles.root, { backgroundColor: currentColors.tvBackground || currentColors.background }]}>
            {/* Base Atmospheric Gradient */}
            <LinearGradient
                colors={[currentColors.tvBackground || '#020408', '#0f172a']}
                style={StyleSheet.absoluteFill}
            />

            {/* Accent Glows for Premium Feel */}
            <View style={[styles.accentGlow, { top: -200, left: -200, backgroundColor: currentColors.primary + '15' }]} />
            <View style={[styles.accentGlow, { bottom: -250, right: -250, backgroundColor: currentColors.accent + '10' }]} />
            <View style={[styles.accentGlow, { top: '30%', right: -300, backgroundColor: currentColors.primary + '08' }]} />

            {/* Global Blur Layer for Premium Glassmorphism Depth */}
            <BlurView intensity={10} style={StyleSheet.absoluteFill} tint="dark" />

            <Tabs
                backBehavior="history"
                tabBar={(props) => (
                    <TVSidebarNav
                        {...props}
                    />
                )}
                screenOptions={{
                    headerShown: false,
                    sceneStyle: {
                        backgroundColor: 'transparent',
                        paddingLeft: isPlayerRoute ? 0 : SIDEBAR_COLLAPSED_WIDTH,
                        paddingTop: 0, // ensure content goes all the way up
                    },
                }}
            >
                {/* ── Main sidebar tabs ────────────── */}
                <Tabs.Screen name="index" options={{ title: 'Home' }} />

                <Tabs.Screen name="search" options={{ title: 'Search' }} />
                <Tabs.Screen name="addons" options={{ title: 'Addons' }} />
                <Tabs.Screen name="tools" options={{ title: 'Tools' }} />
                <Tabs.Screen name="settings" options={{ title: 'Settings' }} />

                {/* ── Hidden routes ─────────────────── */}
                <Tabs.Screen name="local-videos" options={{ href: null }} />
                <Tabs.Screen name="iptv" options={{ href: null }} />
                <Tabs.Screen name="player" options={{ href: null }} />
                <Tabs.Screen name="server-selection" options={{ href: null }} />
                <Tabs.Screen name="network-stream" options={{ href: null }} />
                <Tabs.Screen name="video-downloader" options={{ href: null }} />
                <Tabs.Screen name="favourites" options={{ href: null }} />
                <Tabs.Screen name="stremio-browser" options={{ href: null }} />
                <Tabs.Screen name="addon-browser" options={{ href: null }} />
                <Tabs.Screen name="details/index" options={{ href: null }} />
                <Tabs.Screen name="details/[type]/[id]" options={{ href: null }} />
                <Tabs.Screen name="season/[tvId]/[seasonNumber]" options={{ href: null }} />
                <Tabs.Screen name="account" options={{ title: 'Profile' }} />
            </Tabs>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    accentGlow: {
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: 300,
        opacity: 0.6,
    }
});
