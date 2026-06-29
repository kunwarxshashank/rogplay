import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Text, Dimensions } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TV_NAV_WIDTH = SCREEN_WIDTH * 0.15; // 15% of screen width

export function TVTabBar({ state, descriptors, navigation }: any) {
    const { colors: currentColors } = useTheme();

    if (!Platform.isTV) return null;

    return (
        <View style={styles.tvSidebar}>
            {currentColors.isAmoled
                ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} />
                : <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            }
            <View style={styles.contentContainer}>
                <View style={styles.brandContainer}>
                    <View style={[styles.logoCircle, { borderColor: `${currentColors.primary}60` }]}>
                        <MaterialIcons name="play-arrow" size={32} color={currentColors.primary} />
                    </View>
                    <Text style={[styles.brandText, { color: currentColors.text }]}>ROG</Text>
                </View>

                <View style={styles.navItems}>
                    {state.routes.map((route: any, index: number) => {
                        const { options } = descriptors[route.key];
                        const isFocused = state.index === index;

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
                            <TouchableOpacity
                                key={route.key}
                                onPress={onPress}
                                activeOpacity={0.7}
                                style={[
                                    styles.navButton,
                                    isFocused && { backgroundColor: currentColors.primary + '25' }
                                ]}
                                hasTVPreferredFocus={isFocused && index === 0}
                            >
                                <View style={styles.iconWrapper}>
                                    {options.tabBarIcon ? (
                                        options.tabBarIcon({
                                            color: isFocused ? currentColors.primary : currentColors.textSecondary,
                                            size: 32
                                        })
                                    ) : (
                                        <MaterialIcons
                                            name="help"
                                            size={32}
                                            color={isFocused ? currentColors.primary : currentColors.textSecondary}
                                        />
                                    )}
                                </View>
                                <Text style={[
                                    styles.navLabel,
                                    { color: isFocused ? currentColors.primary : currentColors.textSecondary }
                                ]} numberOfLines={1}>
                                    {options.title || route.name}
                                </Text>
                                {isFocused && (
                                    <View style={[styles.activeIndicator, { backgroundColor: currentColors.primary }]} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.footerButton}>
                        <MaterialIcons name="search" size={28} color={currentColors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.footerButton}>
                        <MaterialIcons name="account-circle" size={28} color={currentColors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    tvSidebar: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: TV_NAV_WIDTH,
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.3)',
        overflow: 'hidden',
    },
    contentContainer: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 40,
        justifyContent: 'space-between',
    },
    brandContainer: {
        alignItems: 'center',
        gap: 10,
    },
    logoCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
    },
    brandText: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
    },
    navItems: {
        width: '100%',
        alignItems: 'center',
        gap: 15,
    },
    navButton: {
        width: '85%',
        paddingVertical: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        position: 'relative',
        gap: 4,
    },
    iconWrapper: {
        marginBottom: 2,
    },
    navLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 15,
        bottom: 15,
        width: 4,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    footer: {
        alignItems: 'center',
        gap: 20,
    },
    footerButton: {
        padding: 10,
        opacity: 0.7,
    }
});
