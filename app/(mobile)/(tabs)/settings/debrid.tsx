import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/hooks/useTheme';

export default function DebridSettingsScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { debridProvider, debridApiKey, setSetting } = useSettingsStore();

    const [apiKeyInput, setApiKeyInput] = useState(debridApiKey);

    const handleSave = () => {
        setSetting('debridApiKey', apiKeyInput.trim());
        Alert.alert('Saved', 'Debrid settings have been saved successfully.');
    };

    const providers = [
        { id: 'none', title: 'None (Disabled)' },
        { id: 'realdebrid', title: 'Real-Debrid' },
        { id: 'alldebrid', title: 'AllDebrid' },
        { id: 'premiumize', title: 'Premiumize' },
        { id: 'torbox', title: 'TorBox' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Debrid Integration</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Provider</Text>
                    
                    {providers.map((provider) => (
                        <TouchableOpacity
                            key={provider.id}
                            style={[styles.providerOption, debridProvider === provider.id && { backgroundColor: colors.primary + '20' }]}
                            onPress={() => setSetting('debridProvider', provider.id)}
                        >
                            <MaterialIcons 
                                name={debridProvider === provider.id ? "radio-button-checked" : "radio-button-unchecked"} 
                                size={24} 
                                color={debridProvider === provider.id ? colors.primary : colors.textSecondary} 
                            />
                            <Text style={[
                                styles.providerText, 
                                { color: colors.text },
                                debridProvider === provider.id && { color: colors.primary, fontFamily: 'Outfit_600SemiBold' }
                            ]}>
                                {provider.title}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {debridProvider !== 'none' && (
                    <View style={[styles.section, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>API Key</Text>
                        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                            Enter your {providers.find(p => p.id === debridProvider)?.title} API key to enable high-speed streaming of torrent/magnet links.
                        </Text>
                        
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                            value={apiKeyInput}
                            onChangeText={setApiKeyInput}
                            placeholder="Enter API Key"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="none"
                            secureTextEntry
                        />
                        
                        <TouchableOpacity 
                            style={[styles.saveButton, { backgroundColor: colors.primary }]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveButtonText}>Save API Key</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: 8,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 20,
    },
    content: {
        padding: 16,
    },
    section: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    sectionTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        marginBottom: 12,
    },
    providerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    providerText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 16,
        marginLeft: 12,
    },
    helperText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        marginBottom: 16,
        lineHeight: 20,
    },
    input: {
        fontFamily: 'Inter_400Regular',
        fontSize: 16,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    saveButton: {
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#FFFFFF',
    }
});
