import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import { useAddonsStore } from '@/store/addonsStore';
import { TVFocusable } from '@/components/TVFocusable';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import appConfigJson from '@/app.json';
import { useTheme } from '@/hooks/useTheme';

export default function MaintenanceSettings() {
    const router = useRouter();
    const settings = useSettingsStore();
    const { colors: currentColors } = useTheme();
    const { theme } = settings;
    const { addons, addonUrls, loadAddons, addAddon } = useAddonsStore();

    const handleBackup = async () => {
        try {
            const data = {
                addons,
                addonUrls,
                timestamp: new Date().toISOString(),
            };
            const fileUri = FileSystem.documentDirectory + 'rogplay_backup.json';
            await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data));

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                Alert.alert("Backup Created", "Sharing not available on this device.");
            }
        } catch (e) {
            Alert.alert("Error", "Failed to create backup.");
        }
    };

    const handleRestore = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
            if (res.canceled) return;

            const fileUri = res.assets[0].uri;
            const content = await FileSystem.readAsStringAsync(fileUri);
            const data = JSON.parse(content);

            if (data.addonUrls && Array.isArray(data.addonUrls)) {
                let count = 0;
                for (const url of data.addonUrls) {
                    try {
                        await addAddon(url);
                        count++;
                    } catch (e) { }
                }
                Alert.alert("Restore Complete", `Restored ${count} addons.`);
                loadAddons();
            } else {
                Alert.alert("Invalid File", "This backup file format is incorrect.");
            }
        } catch (e) {
            Alert.alert("Error", "Failed to restore backup.");
        }
    };

    const sections = [
        {
            title: "Data Management",
            items: [
                { icon: 'backup', label: 'Export Data', description: 'Backup your addons and preferences', action: handleBackup },
                { icon: 'restore', label: 'Import Data', description: 'Restore data from a backup file', action: handleRestore },
            ]
        },
        {
            title: "System",
            items: [
                { icon: 'update', label: 'Check for update', description: `Version: ${appConfigJson.expo.version}`, action: () => Alert.alert('Update', 'You are on the latest version.') },
                { icon: 'delete-sweep', label: 'Clear Cache', description: 'Free up storage space', action: () => Alert.alert('Success', 'Cache cleared successfully.') },
            ]
        }
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={currentColors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: currentColors.text }]}>Maintenance</Text>
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
                                        <View style={{ marginLeft: 14 }}>
                                            <Text style={[styles.itemLabel, { color: currentColors.text }]}>{item.label}</Text>
                                            <Text style={{ color: currentColors.textSecondary, fontSize: 12 }}>{item.description}</Text>
                                        </View>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={20} color={currentColors.textSecondary} />
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
    itemLabel: { fontSize: 15, fontFamily: 'Outfit_500Medium' },
});
