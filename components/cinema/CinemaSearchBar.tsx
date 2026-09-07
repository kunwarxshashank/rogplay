import React, { useState, useCallback } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

interface CinemaSearchBarProps {
    showFilter?: boolean;
    onToggleFilter?: () => void;
}

/**
 * Self-contained search bar. Keeps the query in local state so keystrokes do
 * NOT re-render the parent Cinema screen (and its heavy sections/sliders).
 */
function CinemaSearchBar({ showFilter, onToggleFilter }: CinemaSearchBarProps) {
    const { colors: currentColors } = useTheme();
    const router = useRouter();
    const [query, setQuery] = useState('');

    const handleSearch = useCallback(() => {
        const q = query.trim();
        if (q) {
            router.push({ pathname: '/search', params: { query: q } });
        }
    }, [query, router]);

    return (
        <View style={styles.header}>
            <View style={[styles.searchBar, { borderColor: 'transparent' }]}>
                <Ionicons name="search-outline" size={20} color={currentColors.textSecondary} style={{ zIndex: 1 }} />
                <TextInput
                    style={[styles.searchInput, { color: currentColors.text, zIndex: 1 }]}
                    placeholder="Search movies, tv shows..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
            </View>
            {showFilter && (
                <TouchableOpacity
                    style={[styles.filterBtn, { borderColor: 'transparent' }]}
                    onPress={onToggleFilter}
                    activeOpacity={0.7}
                >
                    <Ionicons name="options-outline" size={20} color={currentColors.text} style={{ zIndex: 1 }} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 46,
        borderRadius: 14,
        borderWidth: 1,
        gap: 10,
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    searchInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', height: '100%' },
    filterBtn: {
        width: 46,
        height: 46,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
});

export default React.memo(CinemaSearchBar);
