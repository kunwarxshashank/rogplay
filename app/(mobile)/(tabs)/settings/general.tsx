import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Modal } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import { TVFocusable } from '@/components/TVFocusable';

export default function GeneralSettings() {
    const router = useRouter();
    const [showDefaultScreenModal, setShowDefaultScreenModal] = React.useState(false);
    const settings = useSettingsStore();
    const { theme, defaultScreen } = settings;
    const currentColors = Colors[theme] || Colors.dark;

    const sections = [
        {
            title: "Appearance",
            items: [
                { icon: 'palette', label: 'App Theme', type: 'select', value: theme.toUpperCase().replace('_', ' '), action: () => settings.toggleSetting('theme') },
                // { icon: 'language', label: 'App Language', type: 'select', value: 'ENGLISH', action: () => { } },
            ]
        },
        {
            title: "User Experience",
            items: [
                { icon: 'home', label: 'Default Screen', type: 'select', value: String(defaultScreen || 'home').toUpperCase(), action: () => setShowDefaultScreenModal(true) },
                { icon: 'exit-to-app', label: 'Confirm Exit', type: 'toggle', value: !!settings.confirmExit, action: () => settings.toggleSetting('confirmExit') },
            ]
        }
    ];

    return (
        <>
            <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={currentColors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: currentColors.text }]}>General Settings</Text>
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

            {/* Default Screen Selection Modal */}
            {showDefaultScreenModal && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowDefaultScreenModal(false)} />
                    <View style={[styles.modalContent, { backgroundColor: currentColors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }]}>
                        <Text style={[styles.modalTitle, { color: currentColors.text, marginBottom: 20 }]}>Choose Default Screen</Text>
                        {[
                            { label: 'Home (Local)', value: 'home' },
                            { label: 'Cinema (Online)', value: 'cinema' },
                            { label: 'Addons', value: 'addons' },
                            { label: 'Tools', value: 'tools' }
                        ].map((item) => (
                            <TouchableOpacity
                                key={item.value}
                                style={[styles.modalOption, { backgroundColor: defaultScreen === item.value ? 'rgba(99, 102, 241, 0.1)' : 'transparent' }]}
                                onPress={() => {
                                    settings.setSetting('defaultScreen', item.value);
                                    setShowDefaultScreenModal(false);
                                }}
                            >
                                <Text style={[styles.modalOptionText, { color: defaultScreen === item.value ? currentColors.primary : currentColors.text }]}>
                                    {item.label}
                                </Text>
                                {defaultScreen === item.value && (
                                    <MaterialIcons name="check" size={20} color={currentColors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[styles.modalCloseButton, { backgroundColor: currentColors.primary, marginTop: 20 }]}
                            onPress={() => setShowDefaultScreenModal(false)}
                        >
                            <Text style={styles.modalCloseButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </>
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
    modalContent: {
        paddingBottom: 40,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
        textAlign: 'center',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginBottom: 8,
    },
    modalOptionText: {
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
    },
    modalCloseButton: {
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    modalCloseButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
    },
});
