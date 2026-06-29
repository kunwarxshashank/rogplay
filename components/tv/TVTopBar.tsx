import React, { useRef, useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, Platform, Text, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export function TVTopBar({ state, descriptors, navigation }: any) {
    const router = useRouter();
    const { colors: currentColors } = useTheme();
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [searchFocused, setSearchFocused] = useState(false);
    const [profileFocused, setProfileFocused] = useState(false);

    // Only show the top bar for main visible routes
    const visibleRoutes = ['index', 'addons', 'tools', 'settings'];

    if (!Platform.isTV) return null;

    return (
        <View style={styles.container}>
            {currentColors.isAmoled
                ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} />
                : <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            }

            <View style={styles.contentContainer}>
                {/* Brand / Logo */}
                <View style={styles.brandContainer}>
                    <MaterialCommunityIcons name="play-circle" size={36} color={currentColors.primary} />
                    <Text style={[styles.brandText, { color: currentColors.text }]}>ROGPLAY</Text>
                </View>

                {/* Navigation Items */}
                <View style={styles.navItems}>
                    {state.routes.map((route: any, index: number) => {
                        // Only show the main tabs
                        if (!visibleRoutes.includes(route.name)) return null;

                        const { options } = descriptors[route.key];
                        const label = options.tabBarLabel !== undefined
                            ? options.tabBarLabel
                            : options.title !== undefined
                                ? options.title
                                : route.name;

                        const isFocused = state.index === index;
                        const isHovered = focusedIndex === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        return (
                            <Pressable
                                key={route.key}
                                onPress={onPress}
                                onFocus={() => setFocusedIndex(index)}
                                onBlur={() => setFocusedIndex(null)}
                                hasTVPreferredFocus={isFocused && index === state.routes.findIndex((r: any) => visibleRoutes.includes(r.name))}
                                nativeID={`tv-topbar-${route.name}`}
                                style={[
                                    styles.navButton,
                                    (isFocused || isHovered) && {
                                        backgroundColor: isFocused ? currentColors.primary + '20' : 'rgba(255,255,255,0.1)',
                                        borderColor: isFocused ? currentColors.primary : 'rgba(255,255,255,0.2)'
                                    },
                                    isHovered && styles.navButtonFocused,
                                    isHovered && {
                                        borderColor: currentColors.primary,
                                        backgroundColor: currentColors.primary + '25',
                                    },
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name={options.tabBarIconName || 'circle'}
                                    size={isHovered ? 22 : 20}
                                    color={isFocused || isHovered ? currentColors.primary : currentColors.textSecondary}
                                />
                                <Text style={[
                                    styles.navLabel,
                                    {
                                        color: isFocused || isHovered ? currentColors.text : currentColors.textSecondary,
                                        fontWeight: isFocused ? 'bold' : 'normal'
                                    }
                                ]}>
                                    {label}
                                </Text>
                                {/* Active indicator dot */}
                                {isFocused && (
                                    <View style={[styles.activeIndicator, { backgroundColor: currentColors.primary }]} />
                                )}
                            </Pressable>
                        );
                    })}
                </View>

                {/* Right side icons */}
                <View style={styles.rightContainer}>
                    <Pressable
                        style={[
                            styles.iconButton,
                            searchFocused && {
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                borderColor: currentColors.primary,
                                borderWidth: 2,
                                transform: [{ scale: 1.1 }],
                            }
                        ]}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        nativeID="tv-topbar-search"
                    >
                        <MaterialCommunityIcons name="magnify" size={24} color={currentColors.text} />
                    </Pressable>
                    <Pressable
                        style={[
                            styles.iconButton,
                            profileFocused && {
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                borderColor: currentColors.primary,
                                borderWidth: 2,
                                transform: [{ scale: 1.1 }],
                            }
                        ]}
                        onFocus={() => setProfileFocused(true)}
                        onBlur={() => setProfileFocused(false)}
                        nativeID="tv-topbar-profile"
                    >
                        <MaterialCommunityIcons name="account-circle" size={24} color={currentColors.text} />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 80,
        zIndex: 1000,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 40,
        justifyContent: 'space-between',
    },
    brandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minWidth: 150,
    },
    brandText: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 2,
    },
    navItems: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
    },
    navButtonFocused: {
        transform: [{ scale: 1.08 }],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    navLabel: {
        fontSize: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -2,
        left: '30%',
        right: '30%',
        height: 3,
        borderRadius: 2,
    },
    rightContainer: {
        flexDirection: 'row',
        gap: 15,
        minWidth: 100,
        justifyContent: 'flex-end',
    },
    iconButton: {
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'transparent',
    }
});
