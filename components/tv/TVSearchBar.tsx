import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSettingsStore } from '@/store/settingsStore';

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
    const { theme } = useSettingsStore();
    const currentColors = Colors[theme] || Colors.dark;
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);

    // Auto-focus the input after mount with a short delay for screen transition
    useEffect(() => {
        if (autoFocus) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [autoFocus]);

    const tvProps: any = {};
    if (nextFocusDown !== undefined) tvProps.nextFocusDown = nextFocusDown;
    if (hasTVPreferredFocus !== undefined) tvProps.hasTVPreferredFocus = hasTVPreferredFocus;

    return (
        <View style={[styles.container, containerStyle]}>
            <Pressable
                style={[
                    styles.searchBar,
                    {
                        backgroundColor: focused ? currentColors.card : currentColors.background,
                        borderColor: focused ? currentColors.primary : 'rgba(255,255,255,0.1)',
                        transform: [{ scale: focused ? 1.02 : 1 }]
                    }
                ]}
                onPress={() => inputRef.current?.focus()}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                nativeID={nativeID || 'tv-searchbar'}
                {...tvProps}
            >
                <MaterialIcons name="search" size={24} color={focused ? currentColors.primary : currentColors.textSecondary} />
                <TextInput
                    ref={inputRef}
                    style={[styles.input, { color: currentColors.text }]}
                    placeholder={placeholder || "Search movies, series, anime..."}
                    placeholderTextColor={currentColors.textSecondary}
                    onChangeText={onSearch}
                    value={value}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: 40,
        marginVertical: 20,
        zIndex: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
    },
});
