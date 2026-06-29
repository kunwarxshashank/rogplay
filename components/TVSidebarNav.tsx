import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Pressable,
    StyleSheet,
    Platform,
    Text,
    Image,
    Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/themeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/hooks/useTheme';

interface TVSidebarNavProps {
    state: any;
    descriptors: any;
    navigation: any;
    onSidebarFocusChange?: (expanded: boolean) => void;
}

const NAV_ITEMS: { route: string; label: string; icon: string; focusIcon: string }[] = [
    { route: 'index', label: 'Home', icon: 'home-variant-outline', focusIcon: 'home-variant' },
    { route: 'search', label: 'Search', icon: 'magnify', focusIcon: 'magnify' },
    { route: 'addons', label: 'Addons', icon: 'view-grid-plus-outline', focusIcon: 'view-grid-plus' },
    { route: 'tools', label: 'Tools', icon: 'hammer-wrench', focusIcon: 'hammer-wrench' },
    { route: 'settings', label: 'Settings', icon: 'cog-outline', focusIcon: 'cog' },
    { route: 'account', label: 'Profile', icon: 'account-outline', focusIcon: 'account' },
];

export function TVSidebarNav({ state, descriptors, navigation, onSidebarFocusChange }: TVSidebarNavProps) {
    const { colors: c } = useTheme();
    const themeStore = useThemeStore();
    const hiddenTabs = useSettingsStore(s => s.hiddenTabs);
    const gradients = c.gradients || { primary: [c.primary, c.primary] };

    const [focusedKey, setFocusedKey] = useState<string | null>(null);
    const [isSidebarFocused, setIsSidebarFocused] = useState(false);

    const glowOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(1)).current;
    const sidebarWidth = useRef(new Animated.Value(86)).current;

    const hexAlpha = useCallback((hex: string, alpha: number) => {
        const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
        return hex + a;
    }, []);

    const isGlassTheme = themeStore.themePalette === 'glassmorphism';

    if (!Platform.isTV) return null;

    const onItemFocus = useCallback((key: string) => {
        setFocusedKey(key);
        setIsSidebarFocused(true);
        onSidebarFocusChange?.(true);
        Animated.parallel([
            Animated.timing(glowOpacity, { toValue: 1, duration: 180, useNativeDriver: false }),
            Animated.spring(logoScale, { toValue: 1.08, useNativeDriver: false, friction: 7 }),
            Animated.spring(sidebarWidth, { toValue: 240, useNativeDriver: false, friction: 8 }),
        ]).start();
    }, []);

    const onItemBlur = useCallback(() => {
        setFocusedKey(null);
        setIsSidebarFocused(false);
        onSidebarFocusChange?.(false);
        Animated.parallel([
            Animated.timing(glowOpacity, { toValue: 0, duration: 180, useNativeDriver: false }),
            Animated.spring(logoScale, { toValue: 1, useNativeDriver: false, friction: 7 }),
            Animated.timing(sidebarWidth, { toValue: 86, duration: 250, useNativeDriver: false }),
        ]).start();
    }, []);

    const currentRouteName = state.routes[state.index]?.name;
    const isPlayerRoute = currentRouteName === 'player';
    if (isPlayerRoute) return null;

    const visibleRouteEntries = state.routes
        .map((r: any, i: number) => ({ route: r, index: i }))
        .filter((e: any) => {
            const navItem = NAV_ITEMS.find(n => n.route === e.route.name);
            if (!navItem) return false;
            const tabId = navItem.route === 'index' ? 'home' : navItem.route;
            return !hiddenTabs.includes(tabId);
        });

    const sidebarBg = isGlassTheme
        ? 'rgba(10, 10, 20, 0.6)'
        : `rgba(0, 0, 0, 0.7)`;

    return (
        <Animated.View style={[styles.sidebar, { width: sidebarWidth, backgroundColor: sidebarBg }]}>
            {/* Glass blur overlay for glassmorphism theme */}
            {isGlassTheme && (
                c.isAmoled
                    ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} />
                    : <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            )}

            <LinearGradient
                colors={[hexAlpha(c.primary, 0.06), 'transparent']}
                style={styles.topWash}
            />

            <View style={styles.content}>
                <View style={styles.logoSection}>
                    <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                        <Image
                            source={require('@/assets/icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </Animated.View>
                </View>

                <View style={styles.navList}>
                    {visibleRouteEntries.map(({ route, index: routeIndex }: any) => {
                        const navConf = NAV_ITEMS.find(n => n.route === route.name)!;
                        const isActive = state.index === routeIndex;
                        const isFocused = focusedKey === route.name;
                        const isHighlight = isActive || isFocused;
                        const isProfile = route.name === 'account';

                        return (
                            <Pressable
                                key={route.key}
                                nativeID={`tv-sidebar-${route.name}`}
                                hasTVPreferredFocus={isActive && routeIndex === visibleRouteEntries[0]?.index}
                                onPress={() => {
                                    const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                                    if (!isActive && !ev.defaultPrevented) navigation.navigate(route.name);
                                    onItemBlur();
                                }}
                                onFocus={() => onItemFocus(route.name)}
                                onBlur={() => onItemBlur()}
                                style={[
                                    styles.navItem,
                                    isProfile && styles.profileItem,
                                ]}
                            >
                                {isActive && (
                                    <View style={[styles.activeBar, { opacity: isFocused ? 1 : 0.5 }]}>
                                        <LinearGradient
                                            colors={gradients.primary as any}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0, y: 1 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    </View>
                                )}

                                {isProfile ? (
                                    <View style={[styles.avatarCircle, {
                                        borderColor: isHighlight ? c.primary : 'rgba(255,255,255,0.1)',
                                        backgroundColor: isFocused ? hexAlpha(c.primary, 0.12) : 'rgba(255,255,255,0.03)',
                                    }]}>
                                        <MaterialCommunityIcons
                                            name={(isHighlight ? navConf.focusIcon : navConf.icon) as any}
                                            size={isFocused ? 22 : 18}
                                            color={isHighlight ? c.primary : c.textSecondary}
                                        />
                                    </View>
                                ) : (
                                    <View style={styles.iconOuter}>
                                        {isFocused && (
                                            <View style={[styles.iconGlow, { backgroundColor: hexAlpha(c.glow, 0.45) }]} />
                                        )}
                                        <MaterialCommunityIcons
                                            name={(isHighlight ? navConf.focusIcon : navConf.icon) as any}
                                            size={isFocused ? 26 : 22}
                                            color={isHighlight ? c.primary : c.textSecondary}
                                        />
                                    </View>
                                )}

                                {isSidebarFocused && (
                                    <Animated.Text style={[
                                        styles.navLabel,
                                        {
                                            color: isFocused ? c.primary : c.textSecondary,
                                            fontFamily: 'Inter_600SemiBold',
                                            fontSize: 15,
                                            marginLeft: 14,
                                            flex: 1,
                                            textAlign: 'left',
                                        }
                                    ]} numberOfLines={1}>
                                        {navConf.label}
                                    </Animated.Text>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 86,
        backgroundColor: 'transparent',
        zIndex: 100,
        overflow: 'hidden',
    },
    topWash: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '30%',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingTop: '20%',
        paddingBottom: '20%',
        paddingHorizontal: 6,
        zIndex: 1,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: 45,
        height: 45
    },
    navList: {
        width: '100%',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 0,
    },
    navItem: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'transparent',
        position: 'relative',
        gap: 4,
    },
    activeBar: {
        position: 'absolute',
        left: 0,
        top: '15%',
        bottom: '15%',
        width: 3,
        borderRadius: 3,
        overflow: 'hidden',
    },
    iconOuter: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    iconGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 12,
    },
    navLabel: {
        fontSize: 9,
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    profileItem: {
        marginTop: 2,
    },
    avatarCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
