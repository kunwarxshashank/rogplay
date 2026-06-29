import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore, computeThemeColors } from '@/store/themeStore';
import { useToastStore } from '@/store/toastStore';

export function AppToast() {
    const ts = useThemeStore();
    const colors = computeThemeColors(ts.themePalette, ts.accentColorId, ts.customHexAccent, ts.borderRadius, ts.cardElevation, ts.animationIntensity);
    const { visible, message, tone, duration, hideToast } = useToastStore();
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;

        if (visible) {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start();

            timer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 180,
                        useNativeDriver: true,
                    }),
                    Animated.timing(translateY, {
                        toValue: 20,
                        duration: 180,
                        useNativeDriver: true,
                    }),
                ]).start(() => hideToast());
            }, duration);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [visible, duration, hideToast, opacity, translateY]);

    if (!visible) return null;

    const accent = tone === 'success' ? '#22c55e' : colors.primary;
    const iconName = tone === 'success' ? 'check-circle' : 'info';

    return (
        <View pointerEvents="none" style={styles.portal}>
            <Animated.View
                style={[
                    styles.toast,
                    {
                        backgroundColor: colors.card,
                        borderColor: accent,
                        opacity,
                        transform: [{ translateY }],
                    },
                ]}
            >
                <MaterialIcons name={iconName} size={20} color={accent} />
                <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
                    {message}
                </Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    portal: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: Platform.isTV ? 48 : 104,
        alignItems: 'center',
        zIndex: 9999,
    },
    toast: {
        minWidth: 220,
        maxWidth: '88%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.24,
        shadowRadius: 16,
        elevation: 8,
    },
    message: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
    },
});
