import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import { TVFocusable } from '@/components/TVFocusable';

export default function PlaybackSettings() {
    const router = useRouter();
    const settings = useSettingsStore();
    const { theme } = settings;
    const currentColors = Colors[theme] || Colors.dark;

    const sections = [
        {
            title: "Player Features",
            items: [
                { icon: 'picture-in-picture-alt', label: 'PiP Mode', type: 'toggle', value: !!settings.pipEnabled, action: () => settings.toggleSetting('pipEnabled') },
                { icon: 'screen-lock-rotation', label: 'Orientation Lock', type: 'toggle', value: !!settings.autoRotate, action: () => settings.toggleSetting('autoRotate') },
                { icon: 'speed', label: 'Playback Speed Control', type: 'toggle', value: !!settings.longPressSpeedEnabled, action: () => settings.toggleSetting('longPressSpeedEnabled') },
                { icon: 'fast-forward', label: 'Double Tap to Seek', type: 'toggle', value: !!settings.doubleTapSeekEnabled, action: () => settings.toggleSetting('doubleTapSeekEnabled') },
                { icon: 'swipe', label: 'Swipe Gestures', type: 'toggle', value: !!settings.playbackGesturesEnabled, action: () => settings.toggleSetting('playbackGesturesEnabled') },
                { icon: 'screen-rotation', label: 'Default Landscape', type: 'toggle', value: !!settings.forceLandscape, action: () => settings.toggleSetting('forceLandscape') },
            ]
        },
        {
            title: "Streaming",
            items: [
                {
                    icon: 'hd',
                    label: 'Default Quality',
                    type: 'select',
                    value: settings.defaultQuality,
                    action: () => {
                        const qualities: ('AUTO' | '720p' | '1080p' | '4K')[] = ['AUTO', '720p', '1080p', '4K'];
                        const nextIdx = (qualities.indexOf(settings.defaultQuality) + 1) % qualities.length;
                        settings.setSetting('defaultQuality', qualities[nextIdx]);
                    }
                },
                {
                    icon: 'subtitles',
                    label: 'Auto-enable Subtitles',
                    type: 'toggle',
                    value: settings.autoSubtitles,
                    action: () => settings.toggleSetting('autoSubtitles')
                },
            ]
        }
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={currentColors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: currentColors.text }]}>Playback Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {sections.map((section, idx) => (
                    <View key={idx} style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: currentColors.primary }]}>{section.title}</Text>
                        {section.items.map((item, itemIdx) => (
                            <TVFocusable
                                key={itemIdx}
                                style={styles.itemWrapper}
                                onPress={item.action}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.item, { backgroundColor: currentColors.surface }]}>
                                    <View style={styles.itemLeft}>
                                        <MaterialIcons name={item.icon as any} size={22} color={currentColors.primary} />
                                        <Text style={[styles.itemLabel, { color: currentColors.text }]}>{item.label}</Text>
                                    </View>

                                    {item.type === 'toggle' && (
                                        <Switch
                                            value={typeof item.value === 'boolean' ? item.value : false}
                                            onValueChange={item.action}
                                            trackColor={{ false: '#2d3748', true: currentColors.primary }}
                                            thumbColor="#f4f3f4"
                                        />
                                    )}

                                    {item.type === 'select' && (
                                        <View style={styles.itemRight}>
                                            <Text style={[styles.itemValue, { color: currentColors.textSecondary }]}>{item.value}</Text>
                                            <MaterialIcons name="chevron-right" size={20} color={currentColors.textSecondary} />
                                        </View>
                                    )}
                                </View>
                            </TVFocusable>
                        ))}
                    </View>
                ))}
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
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    section: { marginTop: 25 },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 12,
        marginLeft: 4,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    itemWrapper: { marginBottom: 10, borderRadius: 16 },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    itemLeft: { flexDirection: 'row', alignItems: 'center' },
    itemLabel: { fontSize: 15, fontFamily: 'Outfit_500Medium', marginLeft: 14 },
    itemRight: { flexDirection: 'row', alignItems: 'center' },
    itemValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginRight: 4 },
});
