import React, { useState, useRef, useCallback } from 'react';
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
import { Colors } from '@/constants/Colors';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '@/store/settingsStore';

interface TVSidebarNavProps {
    state: any;
    descriptors: any;
    navigation: any;
    onSidebarFocusChange?: (expanded: boolean) => void;
}

// ── Route config ──────────────────────────────────────────────
const NAV_ITEMS: { route: string; label: string; icon: string; focusIcon: string }[] = [
    { route: 'index', label: 'Home', icon: 'home-variant-outline', focusIcon: 'home-variant' },
    { route: 'search', label: 'Search', icon: 'magnify', focusIcon: 'magnify' },
    { route: 'addons', label: 'Addons', icon: 'view-grid-plus-outline', focusIcon: 'view-grid-plus' },
    { route: 'tools', label: 'Tools', icon: 'hammer-wrench', focusIcon: 'hammer-wrench' },
    { route: 'settings', label: 'Settings', icon: 'cog-outline', focusIcon: 'cog' },
    { route: 'account', label: 'Profile', icon: 'account-outline', focusIcon: 'account' },
];

const hexAlpha = (hex: string, alpha: number) => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return hex + a;
};

/**
 * TVSidebarNav — Premium glassmorphic sidebar for TV.
 * Fixed 86px icon rail with label tooltips.
 * Features: active indicators, focus glow, gradient accents, smooth animations.
 */
export function TVSidebarNav({ state, descriptors, navigation, onSidebarFocusChange }: TVSidebarNavProps) {
    const { theme } = useSettingsStore();
    const c = Colors[theme] || Colors.dark;
    const gradients = c.gradients || { primary: [c.primary, c.primary] };
    const [focusedKey, setFocusedKey] = useState<string | null>(null);
    const [isSidebarFocused, setIsSidebarFocused] = useState(false);

    // Animation refs
    const glowOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(1)).current;

    if (!Platform.isTV) return null;

    const onItemFocus = useCallback((key: string) => {
        setFocusedKey(key);
        setIsSidebarFocused(true);
        onSidebarFocusChange?.(true);
        Animated.parallel([
            Animated.timing(glowOpacity, { toValue: 1, duration: 180, useNativeDriver: false }),
            Animated.spring(logoScale, { toValue: 1.08, useNativeDriver: true, friction: 7 }),
        ]).start();
    }, []);

    const onItemBlur = useCallback(() => {
        setFocusedKey(null);
        setIsSidebarFocused(false);
        onSidebarFocusChange?.(false);
        Animated.parallel([
            Animated.timing(glowOpacity, { toValue: 0, duration: 180, useNativeDriver: false }),
            Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, friction: 7 }),
        ]).start();
    }, []);

    // ── Route helpers
    const currentRouteName = state.routes[state.index]?.name;
    const isPlayerRoute = currentRouteName === 'player';
    if (isPlayerRoute) return null;

    const visibleRouteEntries = state.routes
        .map((r: any, i: number) => ({ route: r, index: i }))
        .filter((e: any) => NAV_ITEMS.some(n => n.route === e.route.name));

    return (
        <View style={styles.sidebar}>
            {/* ── Top gradient wash ─────────────────── */}
            <LinearGradient
                colors={[hexAlpha(c.primary, 0.06), 'transparent']}
                style={styles.topWash}
            />

            {/* ── Content ──────────────────────────── */}
            <View style={styles.content}>

                {/* ── Logo ─────────────────────────── */}
                <View style={styles.logoSection}>
                    <Animated.View style={[
                        {
                            shadowColor: c.primary,
                            transform: [{ scale: logoScale }],
                        }
                    ]}>
                        <Image
                            source={require('@/assets/icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />

                    </Animated.View>
                </View>

                {/* ── Navigation Items ─────────────── */}
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
                                }}
                                onFocus={() => onItemFocus(route.name)}
                                onBlur={() => onItemBlur()}
                                style={[
                                    styles.navItem,
                                    isProfile && styles.profileItem,
                                ]}
                            >
                                {/* Active accent bar */}
                                {isActive && (
                                    <View style={[styles.activeBar, {
                                        opacity: isFocused ? 1 : 0.5,
                                    }]}>
                                        <LinearGradient
                                            colors={gradients.primary as any}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0, y: 1 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    </View>
                                )}

                                {/* Icon or Avatar */}
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
                                            <View style={[styles.iconGlow, { backgroundColor: hexAlpha(c.primary, 0.15) }]} />
                                        )}
                                        <MaterialCommunityIcons
                                            name={(isHighlight ? navConf.focusIcon : navConf.icon) as any}
                                            size={isFocused ? 26 : 22}
                                            color={isHighlight ? c.primary : c.textSecondary}
                                        />
                                    </View>
                                )}

                                {/* Label — always visible but subtle */}
                                <Text style={[
                                    styles.navLabel,
                                    {
                                        color: isHighlight ? c.primary : c.textSecondary,
                                        opacity: isFocused ? 1 : isActive ? 0.9 : 0.5,
                                        fontFamily: isHighlight ? 'Outfit_700Bold' : 'Outfit_500Medium',
                                    }
                                ]} numberOfLines={1}>
                                    {navConf.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>



            </View>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────
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
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    edgeLine: {
        position: 'absolute',
        right: 0,
        top: '10%',
        bottom: '10%',
        width: 1,
        borderRadius: 1,
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
    },

    /* ── Logo ─────────────────────────── */
    logoSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: 45,
        height: 45
    },

    /* ── Divider ──────────────────────── */
    divider: {
        width: 32,
        height: 1,
        borderRadius: 0.5,
        marginVertical: 20,
    },

    /* ── Nav List ─────────────────────── */
    navList: {
        width: '100%',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 0,
    },
    navItem: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
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

    /* ── Profile ──────────────────────── */
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
