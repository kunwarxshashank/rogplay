import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch, Platform, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { TVFocusable } from '@/components/TVFocusable';
import { useTheme } from '@/hooks/useTheme';

function useNetworkStreamLogic() {
    const { colors: activeColors } = useTheme();
    const [url, setUrl] = useState('');

    // DRM States
    const [isDrmEnabled, setIsDrmEnabled] = useState(false);
    const [drmType, setDrmType] = useState('clearkey');
    const [drmKey, setDrmKey] = useState('');

    // Header States
    const [headerKey, setHeaderKey] = useState('');
    const [headerValue, setHeaderValue] = useState('');
    const [headersList, setHeadersList] = useState<{ key: string, value: string }[]>([]);
    const [isJsonHeadersEnabled, setIsJsonHeadersEnabled] = useState(false);
    const [jsonHeaders, setJsonHeaders] = useState('');

    const router = useRouter();

    const addHeader = () => {
        if (!headerKey.trim() || !headerValue.trim()) return;
        setHeadersList([...headersList, { key: headerKey.trim(), value: headerValue.trim() }]);
        setHeaderKey('');
        setHeaderValue('');
    };

    const removeHeader = (index: number) => {
        setHeadersList(headersList.filter((_, i) => i !== index));
    };

    const handlePlay = () => {
        if (!url) return;

        let headersObj: any = {};

        // Add manual headers
        headersList.forEach(h => {
            headersObj[h.key] = h.value;
        });

        // Add JSON headers if enabled
        if (isJsonHeadersEnabled && jsonHeaders.trim()) {
            try {
                // Sanitize common mobile keyboard issues and standard JSON pitfalls
                const sanitized = jsonHeaders
                    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // Smart double quotes
                    .replace(/[\u2018\u2019\u201A\u201B']/g, '"') // Smart/Standard single quotes -> double quotes
                    .replace(/[\x00-\x1F\x7F-\x9F]/g, '');       // Strip unescaped control characters

                const parsed = JSON.parse(sanitized);
                headersObj = { ...headersObj, ...parsed };
            } catch (e: any) {
                Alert.alert('Invalid Headers', `JSON Error: ${e.message}. \n\nPlease use double quotes (") for both keys and values (e.g. {"Key": "Value"}).`);
                return;
            }
        }

        const params: any = {
            url: encodeURIComponent(url),
            title: encodeURIComponent('Network Stream')
        };

        if (Object.keys(headersObj).length > 0) params.headers = JSON.stringify(headersObj);

        if (isDrmEnabled && drmKey) {
            params.drmtype = drmType;
            params.drmkeys = drmKey;
        }

        router.push({ pathname: '/player', params });
    };

    return {
        url, setUrl, isDrmEnabled, setIsDrmEnabled, drmType, setDrmType, drmKey, setDrmKey,
        headerKey, setHeaderKey, headerValue, setHeaderValue, headersList, addHeader, removeHeader,
        isJsonHeadersEnabled, setIsJsonHeadersEnabled, jsonHeaders, setJsonHeaders,
        router, activeColors, handlePlay
    };
}

export function NetworkStreamMobile() {
    const {
        url, setUrl, isDrmEnabled, setIsDrmEnabled, drmType, setDrmType, drmKey, setDrmKey,
        headerKey, setHeaderKey, headerValue, setHeaderValue, headersList, addHeader, removeHeader,
        isJsonHeadersEnabled, setIsJsonHeadersEnabled, jsonHeaders, setJsonHeaders,
        router, activeColors, handlePlay
    } = useNetworkStreamLogic();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color={activeColors.text} />
                </TouchableOpacity>
                <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: activeColors.text }]}>Network Stream</Text>
                    <View style={[styles.titleDot, { backgroundColor: activeColors.primary }]} />
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: activeColors.textSecondary }]}>Stream URL</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: activeColors.card, color: activeColors.text, borderColor: activeColors.border }]}
                        placeholder="http://example.com/video.mp4"
                        placeholderTextColor={activeColors.textSecondary}
                        value={url}
                        onChangeText={setUrl}
                        autoCapitalize="none"
                    />
                </View>

                {/* Headers Section */}
                <View style={[styles.section, { borderColor: activeColors.border }]}>
                    <Text style={[styles.sectionTitle, { color: activeColors.text, marginBottom: 12 }]}>Custom Headers</Text>

                    <View style={styles.headerInputRow}>
                        <TextInput
                            style={[styles.smallInput, { flex: 1, backgroundColor: activeColors.card, color: activeColors.text, borderColor: activeColors.border }]}
                            placeholder="Key"
                            placeholderTextColor={activeColors.textSecondary}
                            value={headerKey}
                            onChangeText={setHeaderKey}
                        />
                        <TextInput
                            style={[styles.smallInput, { flex: 1.5, backgroundColor: activeColors.card, color: activeColors.text, borderColor: activeColors.border }]}
                            placeholder="Value"
                            placeholderTextColor={activeColors.textSecondary}
                            value={headerValue}
                            onChangeText={setHeaderValue}
                        />
                        <TouchableOpacity style={[styles.addBtn, { backgroundColor: activeColors.primary }]} onPress={addHeader}>
                            <MaterialIcons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {headersList.map((header, index) => (
                        <View key={index} style={[styles.headerTag, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
                            <View style={styles.tagInfo}>
                                <Text style={[styles.tagKey, { color: activeColors.primary }]}>{header.key}:</Text>
                                <Text style={[styles.tagValue, { color: activeColors.text }]} numberOfLines={1}>{header.value}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeHeader(index)}>
                                <MaterialIcons name="close" size={18} color={activeColors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    ))}

                    <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                        <Text style={[styles.sectionTitle, { color: activeColors.text, fontSize: 16 }]}>Use JSON Headers</Text>
                        <Switch
                            value={isJsonHeadersEnabled}
                            onValueChange={setIsJsonHeadersEnabled}
                            trackColor={{ false: '#767577', true: activeColors.primary }}
                        />
                    </View>

                    {isJsonHeadersEnabled && (
                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top', backgroundColor: activeColors.card, color: activeColors.text, borderColor: activeColors.border, marginTop: 8 }]}
                            placeholder='{"Referer": "...",  "Origin": "..."}'
                            placeholderTextColor={activeColors.textSecondary}
                            multiline
                            value={jsonHeaders}
                            onChangeText={setJsonHeaders}
                        />
                    )}
                </View>

                {/* DRM Section */}
                <View style={[styles.section, { borderColor: activeColors.border }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: activeColors.text }]}>DRM Settings</Text>
                        <Switch
                            value={isDrmEnabled}
                            onValueChange={setIsDrmEnabled}
                            trackColor={{ false: '#767577', true: activeColors.primary }}
                        />
                    </View>

                    {isDrmEnabled && (
                        <View style={styles.drmOptions}>
                            <View style={styles.typeRow}>
                                {['clearkey', 'widevine', 'playready'].map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.typeChip,
                                            { backgroundColor: drmType === type ? activeColors.primary : activeColors.card },
                                            { borderColor: activeColors.border }
                                        ]}
                                        onPress={() => setDrmType(type)}
                                    >
                                        <Text style={[styles.typeText, { color: drmType === type ? '#fff' : activeColors.textSecondary }]}>
                                            {type.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                style={[styles.input, { backgroundColor: activeColors.card, color: activeColors.text, borderColor: activeColors.border, marginTop: 12 }]}
                                placeholder="DRM Key or License Server URL"
                                placeholderTextColor={activeColors.textSecondary}
                                value={drmKey}
                                onChangeText={setDrmKey}
                            />
                        </View>
                    )}
                </View>

                <TouchableOpacity onPress={handlePlay} style={styles.playBtn}>
                    <LinearGradient
                        colors={[activeColors.primary, activeColors.accent || '#818cf8']}
                        style={styles.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <MaterialIcons name="play-arrow" size={28} color="#fff" />
                        <Text style={styles.btnText}>Start Playback</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

export function NetworkStreamTV() {
    const {
        url, setUrl, isDrmEnabled, setIsDrmEnabled, drmType, setDrmType, drmKey, setDrmKey,
        headerKey, setHeaderKey, headerValue, setHeaderValue, headersList, addHeader, removeHeader,
        isJsonHeadersEnabled, setIsJsonHeadersEnabled,
        router, activeColors, handlePlay
    } = useNetworkStreamLogic();

    const [isUrlFocused, setIsUrlFocused] = useState(false);

    return (
        <View style={[styles.container, { backgroundColor: activeColors.background, flexDirection: 'row' }]}>
            <View style={{ flex: 1, padding: 40 }}>
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: activeColors.text, fontSize: 36 }]}>Network Stream</Text>
                        <View style={[styles.titleDot, { backgroundColor: activeColors.primary, width: 10, height: 10, borderRadius: 5 }]} />
                    </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 40 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: activeColors.textSecondary, fontSize: 16 }]}>Stream URL</Text>
                        <TVFocusable
                            style={[
                                styles.input,
                                {
                                    backgroundColor: activeColors.card,
                                    borderColor: isUrlFocused ? activeColors.primary : activeColors.border,
                                    borderWidth: isUrlFocused ? 2 : 1,
                                    height: 60
                                }
                            ]}
                            onPress={() => { }}
                        >
                            <TextInput
                                style={{ color: activeColors.text, fontSize: 18, width: '100%', height: '100%' }}
                                placeholder="http://example.com/video.mp4"
                                placeholderTextColor={activeColors.textSecondary}
                                value={url}
                                onChangeText={setUrl}
                                onFocus={() => setIsUrlFocused(true)}
                                onBlur={() => setIsUrlFocused(false)}
                                autoCapitalize="none"
                            />
                        </TVFocusable>

                        <View style={[styles.section, { borderColor: activeColors.border, marginTop: 20 }]}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: activeColors.text, fontSize: 20 }]}>DRM Settings</Text>
                                <TVFocusable onPress={() => setIsDrmEnabled(!isDrmEnabled)}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDrmEnabled ? activeColors.primary : activeColors.card, padding: 10, borderRadius: 8 }}>
                                        <Text style={{ color: '#fff' }}>{isDrmEnabled ? 'ON' : 'OFF'}</Text>
                                    </View>
                                </TVFocusable>
                            </View>

                            {isDrmEnabled && (
                                <View style={styles.drmOptions}>
                                    <View style={styles.typeRow}>
                                        {['clearkey', 'widevine', 'playready'].map((type) => (
                                            <TVFocusable
                                                key={type}
                                                style={[
                                                    styles.typeChip,
                                                    { backgroundColor: drmType === type ? activeColors.primary : activeColors.card },
                                                    { borderColor: activeColors.border, height: 50, justifyContent: 'center' }
                                                ]}
                                                onPress={() => setDrmType(type)}
                                            >
                                                <Text style={[styles.typeText, { color: drmType === type ? '#fff' : activeColors.textSecondary, fontSize: 14 }]}>
                                                    {type.toUpperCase()}
                                                </Text>
                                            </TVFocusable>
                                        ))}
                                    </View>
                                    <TVFocusable style={[styles.input, { backgroundColor: activeColors.card, borderColor: activeColors.border, marginTop: 12, height: 60 }]}>
                                        <TextInput
                                            style={{ color: activeColors.text, fontSize: 16, width: '100%', height: '100%' }}
                                            placeholder="DRM Key"
                                            placeholderTextColor={activeColors.textSecondary}
                                            value={drmKey}
                                            onChangeText={setDrmKey}
                                        />
                                    </TVFocusable>
                                </View>
                            )}
                        </View>
                        <TVFocusable onPress={handlePlay} style={[styles.playBtn, { marginTop: 20 }]}>
                            <LinearGradient
                                colors={[activeColors.primary, activeColors.accent || '#818cf8']}
                                style={[styles.gradient, { padding: 24 }]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <MaterialIcons name="play-arrow" size={32} color="#fff" />
                                <Text style={[styles.btnText, { fontSize: 20 }]}>Start Playback</Text>
                            </LinearGradient>
                        </TVFocusable>
                    </View>

                    <View style={{ flex: 1 }}>
                        {/* TV Side Panel usually simpler, maybe hide complex headers or simplified */}
                        <View style={[styles.section, { borderColor: activeColors.border, flex: 1 }]}>
                            <Text style={[styles.sectionTitle, { color: activeColors.text, marginBottom: 12, fontSize: 20 }]}>Headers (Simplified)</Text>
                            <Text style={{ color: activeColors.textSecondary }}>Complex header editing is better on mobile app.</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

export default function NetworkStreamScreen() {
    return Platform.isTV ? <NetworkStreamTV /> : <NetworkStreamMobile />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#060912',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    titleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginLeft: 4,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Outfit_700Bold',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 8,
        opacity: 0.6,
    },
    input: {
        width: '100%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        fontSize: 15,
        fontFamily: 'Outfit_500Medium',
        backgroundColor: '#0f1424',
    },
    section: {
        marginTop: 10,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 24,
        backgroundColor: '#0f1424',
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
    },
    drmOptions: {
        marginTop: 8,
    },
    typeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    typeChip: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    typeText: {
        fontSize: 11,
        fontFamily: 'Outfit_700Bold',
    },
    headerInputRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    smallInput: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        fontSize: 14,
        fontFamily: 'Outfit_500Medium',
        backgroundColor: '#1a1f35',
    },
    addBtn: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTag: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
        backgroundColor: '#1a1f35',
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    tagInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tagKey: {
        fontSize: 13,
        fontFamily: 'Outfit_700Bold',
    },
    tagValue: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        flex: 1,
    },
    playBtn: {
        marginTop: 10,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    gradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
    },
    btnText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
        marginLeft: 10,
    }
});

