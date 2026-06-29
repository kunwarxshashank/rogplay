import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Pressable, StyleProp, ViewStyle, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { BlurView } from 'expo-blur';

interface TVSearchBarProps {
    onSearch?: (text: string) => void;
    /** nativeID for focus targeting from other components */
    nativeID?: string;
    /** Element to focus when pressing DOWN from the search bar */
    nextFocusDown?: number;
    /** Whether this search bar should receive focus on load */
    hasTVPreferredFocus?: boolean;
    /** Auto-focus the input when the component mounts */
    autoFocus?: boolean;
    /** Custom placeholder text */
    placeholder?: string;
    /** Controlled value */
    value?: string;
    /** External styling for container */
    containerStyle?: StyleProp<ViewStyle>;
}

export function TVSearchBar({ onSearch, nativeID, nextFocusDown, hasTVPreferredFocus, autoFocus, placeholder, value, containerStyle }: TVSearchBarProps) {
    const { colors: currentColors } = useTheme();
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (autoFocus) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [autoFocus]);

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: focused ? 1.05 : 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 8
        }).start();
    }, [focused]);

    const tvProps: any = {};
    if (nextFocusDown !== undefined) tvProps.nextFocusDown = nextFocusDown;
    if (hasTVPreferredFocus !== undefined) tvProps.hasTVPreferredFocus = hasTVPreferredFocus;

    return (
        <View style={[styles.container, containerStyle]}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Pressable
                    style={[
                        styles.searchBar,
                        {
                            backgroundColor: focused ? 'rgba(255, 255, 255, 0.15)' : 'rgba(20, 20, 20, 0.7)',
                            borderColor: focused ? currentColors.glow : 'rgba(255, 255, 255, 0.1)',
                            borderWidth: focused ? 2 : 1,
                            shadowColor: focused ? currentColors.primary : '#000',
                            shadowOpacity: focused ? 0.6 : 0.3,
                            shadowRadius: focused ? 12 : 6,
                            elevation: focused ? 10 : 4,
                        }
                    ]}
                    onPress={() => inputRef.current?.focus()}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    nativeID={nativeID || 'tv-searchbar'}
                    {...tvProps}
                >
                    {!currentColors.isAmoled && !focused && (
                        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                    )}
                    <MaterialIcons 
                        name="search" 
                        size={32} 
                        color={focused ? currentColors.primary : currentColors.textSecondary} 
                        style={{ marginLeft: 10 }}
                    />
                    <TextInput
                        ref={inputRef}
                        style={[
                            styles.input, 
                            { color: currentColors.text }
                        ]}
                        placeholder={placeholder || "Search movies, series, anime..."}
                        placeholderTextColor={focused ? 'rgba(255,255,255,0.7)' : currentColors.textSecondary}
                        onChangeText={onSearch}
                        value={value}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        selectionColor={currentColors.primary}
                    />
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: 20,
        marginVertical: 30,
        zIndex: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 40,
        gap: 16,
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        fontSize: 22,
        fontFamily: 'Outfit_400Regular',
        letterSpacing: 0.5,
        height: 40,
        padding: 0,
        margin: 0,
    },
});
