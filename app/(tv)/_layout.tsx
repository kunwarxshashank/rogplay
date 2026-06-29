import { Tabs, useSegments, usePathname, useRouter } from 'expo-router';
import { View, StyleSheet, Animated, BackHandler, Alert, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { useSettingsStore } from '@/store/settingsStore';
import { useThemeStore, THEME_PALETTES } from '@/store/themeStore';
import { TVSidebarNav } from '@/components/TVSidebarNav';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';

const SIDEBAR_COLLAPSED_WIDTH = 86;

export default function TVLayout() {
    const pathname = usePathname();
    const router = useRouter();
    const navigation = useNavigation();
    const { confirmExit } = useSettingsStore();
    const themeStore = useThemeStore();
    const { colors: currentColors } = useTheme();
    const segments = useSegments();
    const isPlayerRoute = segments.includes('player');

    const themePalette = THEME_PALETTES[themeStore.themePalette] || THEME_PALETTES.amoled;
    const blurIntensity = themeStore.backgroundBlurStrength > 0
        ? Math.max(1, Math.round(themeStore.backgroundBlurStrength / 10))
        : 10;

    useEffect(() => {
        const backAction = () => {
            const isHome = pathname === '/' || pathname === '/(tv)' || pathname === '/(tv)/';

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

            if (isHome) return false;

            if (navigation.canGoBack()) {
                navigation.goBack();
                return true;
            }

            return false;
        };

        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, [pathname, confirmExit, navigation]);

    return (
        <View style={[styles.root, { backgroundColor: currentColors.tvBackground || currentColors.background }]}>
            {/* Base Atmospheric Gradient */}
            {currentColors.isAmoled ? (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} />
            ) : (
                <LinearGradient
                    colors={[currentColors.tvBackground || '#020408', currentColors.background]}
                    style={StyleSheet.absoluteFill}
                />
            )}

            {/* Dynamic Accent Glows for Premium Feel - hidden on AMOLED */}
            {!currentColors.isAmoled && (
                <>
                    <View style={[styles.accentGlow, {
                        top: -200, left: -200,
                        backgroundColor: currentColors.primary + '15',
                        opacity: themeStore.animationIntensity === 'enhanced' ? 0.8 : themeStore.animationIntensity === 'none' ? 0.2 : 0.6
                    }]} />
                    <View style={[styles.accentGlow, {
                        bottom: -250, right: -250,
                        backgroundColor: currentColors.accent + '10',
                        opacity: themeStore.animationIntensity === 'enhanced' ? 0.7 : 0.4
                    }]} />
                    <View style={[styles.accentGlow, {
                        top: '30%', right: -300,
                        backgroundColor: themePalette === THEME_PALETTES.glassmorphism ? currentColors.primary + '15' : currentColors.primary + '08',
                    }]} />
                </>
            )}

            {/* Global Blur Layer for Premium Depth */}
            {themeStore.backgroundBlurStrength > 0 && (
                currentColors.isAmoled
                    ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} />
                    : <BlurView intensity={blurIntensity} style={StyleSheet.absoluteFill} tint="dark" />
            )}

            <Tabs
                backBehavior="history"
                tabBar={(props) => <TVSidebarNav {...props} />}
                screenOptions={{
                    headerShown: false,
                    sceneStyle: {
                        backgroundColor: 'transparent',
                        paddingLeft: isPlayerRoute ? 0 : SIDEBAR_COLLAPSED_WIDTH,
                        paddingRight: 0,
                        paddingTop: 0,
                        paddingBottom: 0,
                    },
                }}
            >
                <Tabs.Screen name="index" options={{ title: 'Home' }} />
                <Tabs.Screen name="search" options={{ title: 'Search' }} />
                <Tabs.Screen name="addons" options={{ title: 'Addons' }} />
                <Tabs.Screen name="tools" options={{ title: 'Tools' }} />
                <Tabs.Screen name="settings" options={{ title: 'Settings' }} />

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
                <Tabs.Screen name="music-player" options={{ href: null }} />
                <Tabs.Screen name="account" options={{ title: 'Profile' }} />
            </Tabs>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    accentGlow: {
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: 300,
        opacity: 0.6,
    }
});
