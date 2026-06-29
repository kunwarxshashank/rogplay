import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/hooks/useTheme';

const CARD_SIZES = [
    { id: 'small', label: 'Small', icon: 'view-grid' },
    { id: 'medium', label: 'Medium', icon: 'view-module' },
    { id: 'large', label: 'Large', icon: 'view-agenda' },
] as const;

export default function CinemaSettings() {
    const router = useRouter();
    const settings = useSettingsStore();
    const { colors: c } = useTheme();
    const { theme } = settings;

    const toggleItems = [
        {
            key: 'cinemaContinueWatching' as const,
            icon: 'history',
            label: 'Continue Watching',
            desc: 'Show resumable content row in Cinema',
        },
        {
            key: 'cinemaPlatforms' as const,
            icon: 'devices',
            label: 'Show Platforms',
            desc: 'Show OTT platforms row (TMDB addon only)',
        },
        {
            key: 'cinemaHomeSlider' as const,
            icon: 'view-carousel',
            label: 'Show Home Slider',
            desc: 'Show trending hero slider at top',
        },
        {
            key: 'cinemaFilters' as const,
            icon: 'filter-list',
            label: 'Show Filters',
            desc: 'Display genre/year filters in Cinema',
        },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={c.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: c.text }]}>Cinema Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Toggle Settings */}
                <Text style={[styles.sectionTitle, { color: c.primary }]}>DISPLAY</Text>
                {toggleItems.map(item => (
                    <View key={item.key} style={[styles.row, { backgroundColor: c.surface }]}>
                        <View style={styles.rowLeft}>
                            <MaterialIcons name={item.icon as any} size={22} color={c.primary} />
                            <View style={{ marginLeft: 14 }}>
                                <Text style={[styles.rowLabel, { color: c.text }]}>{item.label}</Text>
                                <Text style={[styles.rowDesc, { color: c.textSecondary }]}>{item.desc}</Text>
                            </View>
                        </View>
                        <Switch
                            value={!!settings[item.key]}
                            onValueChange={() => settings.toggleSetting(item.key)}
                            trackColor={{ false: '#2d3748', true: c.primary }}
                            thumbColor="#f4f3f4"
                        />
                    </View>
                ))}

                {/* Card Size */}
                <Text style={[styles.sectionTitle, { color: c.primary, marginTop: 24 }]}>CARD SIZE</Text>
                <View style={styles.cardSizeRow}>
                    {CARD_SIZES.map(size => {
                        const isActive = settings.cinemaCardSize === size.id;
                        return (
                            <TouchableOpacity
                                key={size.id}
                                style={[
                                    styles.sizeCard,
                                    {
                                        backgroundColor: isActive ? c.primary + '20' : c.surface,
                                        borderColor: isActive ? c.primary : c.border,
                                    }
                                ]}
                                onPress={() => settings.setSetting('cinemaCardSize', size.id)}
                            >
                                <MaterialCommunityIcons
                                    name={size.icon as any}
                                    size={26}
                                    color={isActive ? c.primary : c.textSecondary}
                                />
                                <Text style={[styles.sizeLabel, { color: isActive ? c.primary : c.textSecondary }]}>
                                    {size.label}
                                </Text>
                                {isActive && (
                                    <MaterialIcons name="check-circle" size={16} color={c.primary} style={{ marginTop: 4 }} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold' },
    content: { paddingHorizontal: 20, paddingBottom: 60 },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 12,
        marginTop: 4,
        marginLeft: 4,
        letterSpacing: 1.2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 10,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    rowLabel: { fontSize: 15, fontFamily: 'Outfit_500Medium' },
    rowDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2, opacity: 0.7 },
    cardSizeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    sizeCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        borderWidth: 1,
        gap: 6,
    },
    sizeLabel: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
});
