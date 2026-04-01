import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Pressable, Animated, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useSettingsStore } from '@/store/settingsStore';

interface TVFocusableProps {
    children: React.ReactNode | ((props: { focused: boolean }) => React.ReactNode);
    onPress: () => void;
    onLongPress?: () => void;
    style?: StyleProp<ViewStyle>;
    activeOpacity?: number;

    // --- TV Focus Props ---
    /** If true, this element receives focus when the screen loads */
    hasTVPreferredFocus?: boolean;
    /** nativeID for this view — other components can target this via nextFocus* */
    nativeID?: string;
    /** nativeID (number via findNodeHandle) of the view to focus when pressing UP */
    nextFocusUp?: number;
    /** nativeID (number via findNodeHandle) of the view to focus when pressing DOWN */
    nextFocusDown?: number;
    /** nativeID (number via findNodeHandle) of the view to focus when pressing LEFT */
    nextFocusLeft?: number;
    /** nativeID (number via findNodeHandle) of the view to focus when pressing RIGHT */
    nextFocusRight?: number;
    /** Whether this element can receive TV focus. Default: true */
    focusable?: boolean;
    /** Custom border color when focused. Falls back to theme primary */
    focusedBorderColor?: string;
    /** Scale factor when focused. Default: 1.05 */
    focusedScale?: number;
    /** Disable the focus glow/border effect */
    disableFocusEffect?: boolean;
    /** Custom background color when focused */
    focusedBackgroundColor?: string;
    /** Callback when this element receives TV focus */
    onFocus?: () => void;
    /** Callback when this element loses TV focus */
    onBlur?: () => void;
    /** If true, interactions and focus are disabled */
    disabled?: boolean;
    /** If true, the internal container uses flex: 1. Default: true */
    autoFlex?: boolean;
}

export function TVFocusable({
    children,
    onPress,
    onLongPress,
    style,
    activeOpacity = 0.9,
    hasTVPreferredFocus,
    nativeID,
    nextFocusUp,
    nextFocusDown,
    nextFocusLeft,
    nextFocusRight,
    focusable = true,
    focusedBorderColor,
    focusedBackgroundColor,
    focusedScale = 1.05,
    disableFocusEffect = false,
    onFocus,
    onBlur,
    disabled = false,
    autoFlex = true,
}: TVFocusableProps) {
    const [focused, setFocused] = useState(false);
    const scale = useRef(new Animated.Value(1)).current;
    const theme = useSettingsStore((state) => state.theme);
    const currentColors = useMemo(() => Colors[theme] || Colors.dark, [theme]);
    const borderColor = focusedBorderColor || currentColors.primary;

    const handleFocus = useCallback(() => {
        setFocused(true);
        if (!disableFocusEffect) {
            Animated.spring(scale, {
                toValue: focusedScale,
                useNativeDriver: true,
                friction: 5,
            }).start();
        }
        onFocus?.();
    }, [disableFocusEffect, focusedScale, onFocus]);

    const handleBlur = useCallback(() => {
        setFocused(false);
        if (!disableFocusEffect) {
            Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: true,
                friction: 5,
            }).start();
        }
        onBlur?.();
    }, [disableFocusEffect, onBlur]);

    // Build TV-specific props
    const tvProps: any = {};
    if (Platform.isTV) {
        if (hasTVPreferredFocus !== undefined) tvProps.hasTVPreferredFocus = hasTVPreferredFocus;
        if (nextFocusUp !== undefined) tvProps.nextFocusUp = nextFocusUp;
        if (nextFocusDown !== undefined) tvProps.nextFocusDown = nextFocusDown;
        if (nextFocusLeft !== undefined) tvProps.nextFocusLeft = nextFocusLeft;
        if (nextFocusRight !== undefined) tvProps.nextFocusRight = nextFocusRight;
    }

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            focusable={disabled ? false : focusable}
            nativeID={nativeID}
            style={({ pressed }) => [
                style,
                pressed && { opacity: activeOpacity },
            ]}
            {...tvProps}
        >
            <Animated.View style={[
                styles.container,
                { transform: [{ scale }] },
                !autoFlex && { flex: 0 },
                !disableFocusEffect && focused && [
                    styles.focusedContainer,
                    // { borderColor },
                    focusedBackgroundColor ? { backgroundColor: focusedBackgroundColor } : null
                ]
            ]}>
                {typeof children === 'function' ? children({ focused }) : children}
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    focusedContainer: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    }
});
